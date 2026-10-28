-- justhairs — booking integrity and abuse hardening.
--   1. Double-booking is now impossible at the database level (CODE_REVIEW #1).
--   2. Abandoned, unpaid holds are released automatically.
--   3. The anon availability RPCs are bounded.
--   4. "Slot taken" has its own SQLSTATE so the app no longer string-matches.
--
-- NOTE: step 1 fails if existing rows already overlap for the same staff
-- member. Check first with:
--   select a.id, b.id from appointments a join appointments b
--     on a.staff_id = b.staff_id and a.id < b.id
--    and a.status in ('pending','confirmed','completed')
--    and b.status in ('pending','confirmed','completed')
--    and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(b.starts_at, b.ends_at, '[)');

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. No overlapping active appointments per staff member
-- ─────────────────────────────────────────────────────────────────────────────
create extension if not exists btree_gist with schema extensions;

alter table appointments
  drop constraint if exists appointments_no_overlap;

alter table appointments
  add constraint appointments_no_overlap
  exclude using gist (
    staff_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (staff_id is not null and status in ('pending', 'confirmed', 'completed'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. book_appointment: custom SQLSTATE JH409 for "slot no longer available",
--    bounded start time, and the exclusion violation mapped to the same error
--    (two concurrent callers: one wins, the other gets JH409).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function book_appointment(
  p_service_id uuid,
  p_staff_id   uuid,
  p_starts_at  timestamptz
)
returns appointments
language plpgsql security definer set search_path = public as $$
declare
  v_duration int;
  v_price    int;
  v_staff    uuid;
  v_ends     timestamptz;
  v_code     text;
  v_row      appointments;
begin
  if p_starts_at is null
     or p_starts_at <= now()
     or p_starts_at > now() + interval '90 days' then
    raise exception 'slot no longer available' using errcode = 'JH409';
  end if;

  select duration_min, price_cents into v_duration, v_price
  from services where id = p_service_id and active and online_booking;
  if v_duration is null then
    raise exception 'service not bookable' using errcode = 'P0001';
  end if;

  v_ends := p_starts_at + (v_duration || ' minutes')::interval;

  select s.staff_id into v_staff
  from get_available_slots(p_service_id, p_staff_id, (p_starts_at at time zone
    (select timezone from app_settings where id))::date) s
  where s.starts_at = p_starts_at
  limit 1;

  if v_staff is null then
    raise exception 'slot no longer available' using errcode = 'JH409';
  end if;

  for i in 1..5 loop
    begin
      v_code := gen_confirmation_code();
      insert into appointments
        (service_id, staff_id, starts_at, ends_at, status, price_cents, confirmation_code)
      values
        (p_service_id, v_staff, p_starts_at, v_ends, 'confirmed', v_price, v_code)
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

revoke execute on function book_appointment(uuid, uuid, timestamptz) from public;
grant  execute on function book_appointment(uuid, uuid, timestamptz) to anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Bounded availability range for anon callers
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function get_day_availability(
  p_service_id uuid,
  p_staff_id   uuid,
  p_from       date,
  p_days       int
)
returns table (starts_at timestamptz, staff_id uuid)
language plpgsql stable security definer set search_path = public as $$
declare
  v_day  date;
  v_days int := least(greatest(coalesce(p_days, 1), 1), 31);
begin
  -- Nothing to offer outside the bookable window; also keeps the work bounded.
  if p_from is null
     or p_from < current_date - 1
     or p_from > current_date + 90 then
    return;
  end if;

  for i in 0..v_days - 1 loop
    v_day := p_from + i;
    return query
      select s.starts_at, s.staff_id
      from get_available_slots(p_service_id, p_staff_id, v_day) s;
  end loop;
end;
$$;

revoke execute on function get_day_availability(uuid, uuid, date, int) from public;
grant  execute on function get_day_availability(uuid, uuid, date, int) to anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Release abandoned holds
-- ─────────────────────────────────────────────────────────────────────────────
-- A hold is an appointment the guest started but never settled: still
-- 'unpaid' (not pay_later, not paid) with no Stripe Checkout session open.
-- Rows with a Checkout session are left alone — the guest may still be paying.
create or replace function release_stale_holds()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  delete from appointments
   where payment_status = 'unpaid'
     and stripe_session_id is null
     and created_at < now() - interval '15 minutes';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function release_stale_holds() from public, anon, authenticated;
grant  execute on function release_stale_holds() to service_role;

select cron.unschedule('release-stale-holds')
  where exists (select 1 from cron.job where jobname = 'release-stale-holds');

select cron.schedule(
  'release-stale-holds',
  '*/5 * * * *',
  $$select public.release_stale_holds()$$
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Default EXECUTE goes to PUBLIC, so revoking from anon/authenticated alone
-- (as 0002 did) leaves the cron-only function callable. Close that.
-- ─────────────────────────────────────────────────────────────────────────────
revoke execute on function complete_past_appointments() from public;
grant  execute on function complete_past_appointments() to service_role;
