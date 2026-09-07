-- justhairs — M1.5: appointment completion, review guard, rating views

-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-complete past appointments
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function complete_past_appointments()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  update appointments
    set status = 'completed'
    where status = 'confirmed' and ends_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function complete_past_appointments() from anon, authenticated;
grant execute on function complete_past_appointments() to service_role;

-- Hourly cron. pg_cron must be enabled (Supabase → Database → Extensions).
create extension if not exists pg_cron;

select cron.unschedule('complete-past-appointments')
  where exists (select 1 from cron.job where jobname = 'complete-past-appointments');

select cron.schedule(
  'complete-past-appointments',
  '0 * * * *',
  $$select public.complete_past_appointments()$$
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Reviews: only after a completed, owned appointment
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "reviews: own write" on reviews;

create policy "reviews: own insert" on reviews
  for insert to authenticated
  with check (
    customer_id = auth.uid()
    and exists (
      select 1 from appointments a
      where a.id = appointment_id
        and a.customer_id = auth.uid()
        and a.status = 'completed'
    )
  );

create policy "reviews: own update" on reviews
  for update to authenticated
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create policy "reviews: own delete" on reviews
  for delete to authenticated
  using (customer_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- Rating aggregates
-- ─────────────────────────────────────────────────────────────────────────────
create or replace view service_ratings
with (security_invoker = true) as
  select service_id,
         round(avg(rating)::numeric, 1) as rating,
         count(*)::int as review_count
  from reviews
  where service_id is not null
  group by service_id;

create or replace view staff_ratings
with (security_invoker = true) as
  select staff_id,
         round(avg(rating)::numeric, 1) as rating,
         count(*)::int as review_count
  from reviews
  where staff_id is not null
  group by staff_id;

grant select on service_ratings, staff_ratings to anon, authenticated;

-- Public review feed — exposes only a first name + the service/staff name, so it
-- can run as owner (bypassing the profiles RLS) without leaking contact details.
create or replace view public_reviews
with (security_invoker = false) as
  select r.id,
         r.rating,
         r.comment,
         r.created_at,
         nullif(split_part(coalesce(p.full_name, ''), ' ', 1), '') as reviewer_first,
         s.name  as service_name,
         st.name as staff_name,
         r.service_id,
         r.staff_id
  from reviews r
  left join profiles p  on p.id  = r.customer_id
  left join services s  on s.id  = r.service_id
  left join staff    st on st.id = r.staff_id
  order by r.created_at desc;

grant select on public_reviews to anon, authenticated;
