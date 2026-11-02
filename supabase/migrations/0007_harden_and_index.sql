-- justhairs — harden the Data API surface and the booking functions, add the
-- missing indexes. Re-runnable. Booking behaviour is unchanged (the function
-- bodies are the 0006 logic with every name schema-qualified).
--
-- Deploy order: ship the app code first (it calls the booking functions with
-- the secret/service-role key, which works before AND after this migration),
-- then apply this file. Applying it first would make the old build's
-- anon-key calls fail with "permission denied".
--
-- What this fixes (Supabase advisor / docs references in brackets):
--   1. Booking functions were callable by anyone holding the public key,
--      straight at /rest/v1/rpc/..., bypassing the app's validation.   [0028]
--   2. Functions used `search_path = public` (or none).                  [0011]
--   3. `reviews` was publicly readable including appointment_id, which opens
--      /book/confirmation/<id> (guest name + email). Only the display columns
--      are readable now; `staff_time_off` (reasons) and `app_settings` are
--      closed to the API roles.
--   4. Every table granted full DML to anon/authenticated, relying on RLS
--      alone. Grants and RLS are separate layers: revoke what isn't needed.
--   5. Policies named no role and called auth functions per row.   [0003, 0024]
--   6. Foreign keys without an index, one unused index.                 [0001]
--   7. pgcrypto in `public`.                                             [0014]
--   8. Overall rating averaged every review row in Node: now one view.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Functions: empty search_path, schema-qualified, server-only
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.gen_confirmation_code()
returns text
language plpgsql
set search_path = ''
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
  i int;
begin
  for i in 1..6 loop
    code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return code;
end;
$$;

create or replace function public.get_available_slots(
  p_service_id uuid,
  p_staff_id   uuid,
  p_day        date
)
returns table (starts_at timestamptz, staff_id uuid)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_tz       text;
  v_step     int;
  v_duration int;
begin
  select timezone, slot_step_min into v_tz, v_step from public.app_settings where id;
  select duration_min into v_duration from public.services
    where id = p_service_id and active and online_booking;
  if v_duration is null then
    return;
  end if;

  return query
  with candidates as (
    select s.id
    from public.staff s
    where s.active
      and (p_staff_id is null or s.id = p_staff_id)
      and exists (
        select 1 from public.staff_services ss
        where ss.staff_id = s.id and ss.service_id = p_service_id
      )
  ),
  raw_slots as (
    select
      c.id as staff_id,
      ((p_day::timestamp + wh.start_time) at time zone v_tz
        + (n * v_step || ' minutes')::interval) as slot_start
    from candidates c
    join public.staff_working_hours wh
      on wh.staff_id = c.id
     and wh.weekday = extract(dow from p_day)::int
    cross join lateral generate_series(
      0,
      floor((extract(epoch from (wh.end_time - wh.start_time)) / 60 - v_duration) / v_step)::int
    ) as n
  ),
  valid as (
    select rs.staff_id, rs.slot_start
    from raw_slots rs
    where rs.slot_start > now()
      and not exists (
        select 1 from public.staff_time_off t
        where t.staff_id = rs.staff_id
          and tstzrange(t.starts_at, t.ends_at, '[)')
              && tstzrange(rs.slot_start, rs.slot_start + (v_duration || ' minutes')::interval, '[)')
      )
      and not exists (
        select 1 from public.appointments a
        where a.staff_id = rs.staff_id
          and a.status in ('pending', 'confirmed', 'completed')
          and tstzrange(a.starts_at, a.ends_at, '[)')
              && tstzrange(rs.slot_start, rs.slot_start + (v_duration || ' minutes')::interval, '[)')
      )
  )
  select distinct on (v.slot_start) v.slot_start, v.staff_id
  from valid v
  order by v.slot_start, v.staff_id;
end;
$$;

create or replace function public.get_day_availability(
  p_service_id uuid,
  p_staff_id   uuid,
  p_from       date,
  p_days       int
)
returns table (starts_at timestamptz, staff_id uuid)
language plpgsql stable security definer set search_path = '' as $$
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
      from public.get_available_slots(p_service_id, p_staff_id, v_day) s;
  end loop;
end;
$$;

create or replace function public.book_appointment(
  p_service_id uuid,
  p_staff_id   uuid,
  p_starts_at  timestamptz
)
returns public.appointments
language plpgsql security definer set search_path = '' as $$
declare
  v_duration int;
  v_price    int;
  v_staff    uuid;
  v_ends     timestamptz;
  v_code     text;
  v_row      public.appointments;
begin
  if p_starts_at is null
     or p_starts_at <= now()
     or p_starts_at > now() + interval '90 days' then
    raise exception 'slot no longer available' using errcode = 'JH409';
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

create or replace function public.complete_past_appointments()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  update public.appointments
    set status = 'completed'
    where status = 'confirmed' and ends_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.release_stale_holds()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  delete from public.appointments
   where payment_status = 'unpaid'
     and stripe_session_id is null
     and created_at < now() - interval '15 minutes';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Who may run them. By default any role can; the booking functions are only
-- ever called by the Next.js server with the secret (service_role) key, so the
-- public key gets none of them. gen_confirmation_code is internal.
revoke all on function public.gen_confirmation_code()                          from public, anon, authenticated;
revoke all on function public.get_available_slots(uuid, uuid, date)           from public, anon, authenticated;
revoke all on function public.get_day_availability(uuid, uuid, date, int)      from public, anon, authenticated;
revoke all on function public.book_appointment(uuid, uuid, timestamptz)        from public, anon, authenticated;
revoke all on function public.complete_past_appointments()                     from public, anon, authenticated;
revoke all on function public.release_stale_holds()                            from public, anon, authenticated;

grant execute on function public.get_available_slots(uuid, uuid, date)         to service_role;
grant execute on function public.get_day_availability(uuid, uuid, date, int)   to service_role;
grant execute on function public.book_appointment(uuid, uuid, timestamptz)     to service_role;
grant execute on function public.complete_past_appointments()                  to service_role;
grant execute on function public.release_stale_holds()                         to service_role;

-- Future functions in public start private too, instead of PUBLIC-executable.
-- (The second statement is global to role postgres, as Supabase documents; it
-- only affects functions created from now on.)
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;
alter default privileges for role postgres revoke execute on functions from public;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Ratings: one aggregate instead of every review row
-- ─────────────────────────────────────────────────────────────────────────────
create or replace view public.overall_rating
with (security_invoker = true) as
  select round(avg(rating)::numeric, 1) as rating,
         count(*)::int                  as review_count
  from public.reviews;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS policies: start clean, name the roles, no per-row auth calls
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  p record;
begin
  for p in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end;
$$;

-- Public catalog: readable, never writable through the API.
create policy "catalog: read" on public.service_categories
  for select to anon, authenticated using (true);
create policy "catalog: read" on public.staff_services
  for select to anon, authenticated using (true);
create policy "catalog: read" on public.staff_working_hours
  for select to anon, authenticated using (true);
create policy "catalog: read active" on public.services
  for select to anon, authenticated using (active);
create policy "catalog: read active" on public.staff
  for select to anon, authenticated using (active);
create policy "reviews: read" on public.reviews
  for select to anon, authenticated using (true);

-- appointments, app_settings and staff_time_off keep RLS on with no policy for
-- the API roles: they are read and written only by the server (service_role
-- bypasses RLS) and by the SECURITY DEFINER functions.

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Grants: close everything, then open exactly what the app reads
-- ─────────────────────────────────────────────────────────────────────────────
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables    from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;

grant select on public.service_categories, public.services, public.staff,
                public.staff_services, public.staff_working_hours
  to anon, authenticated;

-- Column-level: the display columns only. appointment_id (which opens a
-- guest's confirmation page) is not readable through the API.
grant select (id, rating, comment, created_at, reviewer_first, staff_id, service_id)
  on public.reviews to anon, authenticated;

grant select on public.service_ratings, public.staff_ratings,
                public.public_reviews, public.overall_rating
  to anon, authenticated;

comment on table public.appointments is
  'Guest bookings. Holds PII (name, email, phone): no Data API access, server-only (secret key).';
comment on table public.staff_time_off is
  'Staff leave, with reasons. No Data API access; read by the slot functions only.';
comment on table public.app_settings is
  'Salon-wide settings (single row). No Data API access; read by the slot functions only.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Indexes: every foreign key, plus the two sweepers
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists services_category_idx          on public.services (category_id);
create index if not exists staff_services_service_idx     on public.staff_services (service_id);
create index if not exists staff_working_hours_staff_idx  on public.staff_working_hours (staff_id, weekday);
create index if not exists staff_time_off_staff_idx       on public.staff_time_off (staff_id, starts_at);
create index if not exists appointments_service_idx       on public.appointments (service_id);
create index if not exists reviews_staff_idx              on public.reviews (staff_id);
create index if not exists reviews_service_idx            on public.reviews (service_id);

-- small partial indexes for the cron sweepers
create index if not exists appointments_stale_hold_idx
  on public.appointments (created_at)
  where payment_status = 'unpaid' and stripe_session_id is null;
create index if not exists appointments_to_complete_idx
  on public.appointments (ends_at)
  where status = 'confirmed';

-- one Checkout session belongs to at most one appointment
create unique index if not exists appointments_stripe_session_idx
  on public.appointments (stripe_session_id)
  where stripe_session_id is not null;

-- customer_id is null on every guest booking: this index is never used.
drop index if exists public.appointments_customer_idx;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Extension hygiene
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1 from pg_extension e join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pgcrypto' and n.nspname = 'public'
  ) then
    alter extension pgcrypto set schema extensions;
  end if;
end;
$$;
