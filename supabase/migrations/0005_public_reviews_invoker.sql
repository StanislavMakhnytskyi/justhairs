-- justhairs — public_reviews no longer needs SECURITY DEFINER.
--
-- The view ran as its owner only so it could read appointments.customer_name
-- (appointments has no anon read, it carries PII). Store the reviewer's first
-- name on the review itself instead, so the view reads only publicly readable
-- tables (reviews, services, staff) under the caller's own RLS.

alter table reviews add column if not exists reviewer_first text;

update reviews r
   set reviewer_first = nullif(split_part(coalesce(a.customer_name, ''), ' ', 1), '')
  from appointments a
 where a.id = r.appointment_id
   and r.reviewer_first is null;

create or replace view public_reviews
with (security_invoker = true) as
  select r.id,
         r.rating,
         r.comment,
         r.created_at,
         r.reviewer_first,
         s.name  as service_name,
         st.name as staff_name,
         r.service_id,
         r.staff_id
  from reviews r
  left join services s  on s.id  = r.service_id
  left join staff    st on st.id = r.staff_id
  order by r.created_at desc;

grant select on public_reviews to anon;
