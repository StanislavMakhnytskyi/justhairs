-- justhairs — payment and hold integrity. Re-runnable.
--
-- Deploy order: ship the app code first, then apply this file. The new
-- book_appointment keeps its old 3-argument call shape working (the added
-- parameter has a default), so the previous build keeps booking after this runs;
-- the new build needs this file for the hold token, the payment RPCs and the
-- open-hold cap.
--
-- What this adds:
--   1. appointments.hold_token  — a per-booking secret. The server sets it in an
--      HttpOnly cookie when the hold is created and demands it for everything
--      that reads or changes the booking, so a bare appointment id is no longer
--      a credential.
--   2. appointments.stripe_session_expires_at — when the Checkout session stops
--      accepting payment, so abandoned payments can be swept.
--   3. appointments.client_key  — a hash of the caller's IP (set by the server)
--      and a cap on open holds per key (SQLSTATE JH429) — a cheap brake on
--      slot-hoarding; the real rate limit belongs at the edge (docs/supabase.md).
--   4. record_payment / cancel_unpaid_booking / release_checkout_session — the
--      atomic, row-locked transitions the Stripe webhook, the return-from-Stripe
--      reconcile and "back out" use. A paid booking can no longer be deleted or
--      cancelled by a race.
--   5. release_stale_holds also covers expired Checkout sessions. Pay-at-salon
--      (pay_later) bookings are intentional and are never swept; abuse is bounded
--      by the per-client open-hold cap.
--   6. appointments.checkout_attempt — bumped whenever a Checkout session is
--      released, so the server's Stripe idempotency key changes per attempt.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Columns and indexes
-- ─────────────────────────────────────────────────────────────────────────────
-- A volatile default is evaluated per existing row, so old bookings get tokens
-- too (nobody holds the cookie for them: they simply stop being addressable by id).
alter table public.appointments
  add column if not exists hold_token uuid not null default gen_random_uuid();
alter table public.appointments
  add column if not exists stripe_session_expires_at timestamptz;
alter table public.appointments
  add column if not exists client_key text;
alter table public.appointments
  add column if not exists checkout_attempt int not null default 0;

-- open holds per client, and the new sweeper scan
create index if not exists appointments_client_open_idx
  on public.appointments (client_key, created_at)
  where client_key is not null and payment_status in ('unpaid', 'pay_later');
create index if not exists appointments_session_expiry_idx
  on public.appointments (stripe_session_expires_at)
  where payment_status = 'unpaid' and stripe_session_id is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. book_appointment: records the client key and caps open holds
-- ─────────────────────────────────────────────────────────────────────────────
-- Replace the 3-argument version (a new signature would otherwise coexist as an
-- overload); the 4-argument one below accepts the old call shape.
drop function if exists public.book_appointment(uuid, uuid, timestamptz);

create or replace function public.book_appointment(
  p_service_id uuid,
  p_staff_id   uuid,
  p_starts_at  timestamptz,
  p_client_key text default null
)
returns public.appointments
language plpgsql security definer set search_path = '' as $$
declare
  v_duration int;
  v_price    int;
  v_staff    uuid;
  v_ends     timestamptz;
  v_code     text;
  v_open     int;
  v_row      public.appointments;
begin
  if p_starts_at is null
     or p_starts_at <= now()
     or p_starts_at > now() + interval '90 days' then
    raise exception 'slot no longer available' using errcode = 'JH409';
  end if;

  -- At most 5 open (unpaid or pay-later) bookings per client in 24 hours. The
  -- advisory lock serialises concurrent calls from the same client so the count
  -- cannot be raced past.
  if p_client_key is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_client_key, 0));
    select count(*) into v_open
      from public.appointments
     where client_key = p_client_key
       and status <> 'cancelled'
       and payment_status in ('unpaid', 'pay_later')
       and created_at > now() - interval '24 hours';
    if v_open >= 5 then
      raise exception 'too many open bookings' using errcode = 'JH429';
    end if;
  end if;

  select duration_min, price_cents into v_duration, v_price
  from public.services where id = p_service_id and active and online_booking;
  if v_duration is null then
    raise exception 'service not bookable' using errcode = 'P0001';
  end if;

  v_ends := p_starts_at + (v_duration || ' minutes')::interval;

  select s.staff_id into v_staff
  from public.get_available_slots(p_service_id, p_staff_id, (p_starts_at at time zone
    (select timezone from public.app_settings where id))::date) s
  where s.starts_at = p_starts_at
  limit 1;

  if v_staff is null then
    raise exception 'slot no longer available' using errcode = 'JH409';
  end if;

  for i in 1..5 loop
    begin
      v_code := public.gen_confirmation_code();
      insert into public.appointments
        (service_id, staff_id, starts_at, ends_at, status, price_cents, confirmation_code, client_key)
      values
        (p_service_id, v_staff, p_starts_at, v_ends, 'confirmed', v_price, v_code, p_client_key)
      returning * into v_row;
      return v_row;
    exception
      when unique_violation then
        -- confirmation-code collision: try another code
        null;
      when exclusion_violation then
        raise exception 'slot no longer available' using errcode = 'JH409';
    end;
  end loop;

  raise exception 'could not allocate a confirmation code' using errcode = 'P0001';
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Atomic payment transitions (row-locked)
-- ─────────────────────────────────────────────────────────────────────────────
-- Mark a booking paid for a Checkout session. Called by the Stripe webhook and
-- by the return-from-Stripe reconcile with values taken from the verified
-- session. Returns:
--   paid       transitioned to paid just now
--   duplicate  already paid (a retried webhook / a page refresh)
--   mismatch   the session is not the one stored for this booking, or the amount
--              differs from the booking price — nothing is changed
--   cancelled  the booking was cancelled before the payment landed — nothing is
--              changed; the caller must surface it for a manual refund
--   unknown    no such booking
create or replace function public.record_payment(
  p_appointment_id uuid,
  p_session_id     text,
  p_amount_total   int
)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.appointments;
begin
  select * into v_row from public.appointments where id = p_appointment_id for update;
  if not found then
    return 'unknown';
  end if;
  if v_row.stripe_session_id is distinct from p_session_id
     or p_amount_total is distinct from v_row.price_cents then
    return 'mismatch';
  end if;
  if v_row.payment_status = 'paid' then
    return 'duplicate';
  end if;
  if v_row.status = 'cancelled' then
    return 'cancelled';
  end if;
  update public.appointments set payment_status = 'paid' where id = p_appointment_id;
  return 'paid';
end;
$$;

-- Back out of a booking: frees the slot only for a confirmed, unpaid booking. The
-- caller expires any open Checkout session first; this takes the row lock, so a
-- payment that was recorded in the meantime wins. Returns
--   cancelled        cancelled now (or already cancelled)
--   paid             already paid - nothing changed
--   not_cancellable  completed / no-show / pay-at-salon - nothing changed
--   not_found        also for a wrong token, so the token cannot be probed
create or replace function public.cancel_unpaid_booking(
  p_appointment_id uuid,
  p_hold_token     uuid
)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.appointments;
begin
  select * into v_row from public.appointments
   where id = p_appointment_id and hold_token = p_hold_token
   for update;
  if not found then
    return 'not_found';
  end if;
  if v_row.payment_status = 'paid' then
    return 'paid';
  end if;
  if v_row.status = 'cancelled' then
    return 'cancelled';
  end if;
  if v_row.status <> 'confirmed' or v_row.payment_status <> 'unpaid' then
    return 'not_cancellable';
  end if;
  update public.appointments
     set status = 'cancelled', cancellation_reason = 'abandoned by guest'
   where id = p_appointment_id;
  return 'cancelled';
end;
$$;

-- checkout.session.expired: forget the dead session so the booking is an
-- ordinary unpaid hold again (the sweeper then frees it once it is old enough).
-- Never touches a paid booking. Bumps checkout_attempt so the next session gets a
-- fresh Stripe idempotency key. Returns the number of rows changed (0 or 1).
create or replace function public.release_checkout_session(p_session_id text)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  update public.appointments
     set stripe_session_id = null, stripe_session_expires_at = null,
         checkout_attempt = checkout_attempt + 1
   where stripe_session_id = p_session_id
     and payment_status <> 'paid';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Sweeper: abandoned holds and expired Checkout sessions
-- ─────────────────────────────────────────────────────────────────────────────
-- Returns the number of bookings released or cancelled.
--   a. unpaid, no Checkout session, older than 30 minutes      -> deleted. The window
--      leaves room for a guest filling in the form before the session is created.
--   b. unpaid, Checkout session expired more than 6 hours ago  -> cancelled. The
--      grace covers a late checkout.session.completed / async-payment webhook
--      (Stripe retries for days; anything later is logged for a manual refund); a
--      session that never got an expiry (created before this migration) is left alone.
-- Pay-later (pay at the salon) bookings are intentional and are not swept.
create or replace function public.release_stale_holds()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_total integer := 0;
  v_count integer;
begin
  delete from public.appointments
   where payment_status = 'unpaid'
     and stripe_session_id is null
     and created_at < now() - interval '30 minutes';
  get diagnostics v_count = row_count;
  v_total := v_total + v_count;

  update public.appointments
     set status = 'cancelled', cancellation_reason = 'checkout expired'
   where payment_status = 'unpaid'
     and status <> 'cancelled'
     and stripe_session_id is not null
     and stripe_session_expires_at < now() - interval '6 hours';
  get diagnostics v_count = row_count;
  v_total := v_total + v_count;

  return v_total;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Who may run them: the Next.js server (service_role) only
-- ─────────────────────────────────────────────────────────────────────────────
revoke all on function public.book_appointment(uuid, uuid, timestamptz, text) from public, anon, authenticated;
revoke all on function public.record_payment(uuid, text, int)                  from public, anon, authenticated;
revoke all on function public.cancel_unpaid_booking(uuid, uuid)                from public, anon, authenticated;
revoke all on function public.release_checkout_session(text)                   from public, anon, authenticated;
revoke all on function public.release_stale_holds()                            from public, anon, authenticated;

grant execute on function public.book_appointment(uuid, uuid, timestamptz, text) to service_role;
grant execute on function public.record_payment(uuid, text, int)                  to service_role;
grant execute on function public.cancel_unpaid_booking(uuid, uuid)                to service_role;
grant execute on function public.release_checkout_session(text)                   to service_role;
grant execute on function public.release_stale_holds()                            to service_role;
