-- justhairs — drop auth. Bookings are made by guests: contact details live on
-- the appointment row, and Stripe (or a "pay after the visit" choice) sets the
-- payment status. Nothing here touches existing seeded rows destructively.

-- ─────────────────────────────────────────────────────────────────────────────
-- appointments: guest-owned
-- ─────────────────────────────────────────────────────────────────────────────
alter table appointments
  alter column customer_id drop not null;

alter table appointments
  drop constraint if exists appointments_customer_id_fkey;

alter table appointments
  drop column if exists created_by;

alter table appointments
  add column if not exists customer_name  text,
  add column if not exists customer_email text,
  add column if not exists customer_phone text,
  add column if not exists confirmation_code text,
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pay_later', 'paid')),
  add column if not exists stripe_session_id text;

create unique index if not exists appointments_confirmation_code_idx
  on appointments (confirmation_code);

-- Carry existing (auth-era) bookings' contact details onto the row itself,
-- while profiles is still around, so seeded reviews keep their reviewer names.
update appointments a
set customer_name  = coalesce(a.customer_name,  p.full_name),
    customer_email = coalesce(a.customer_email, p.email),
    customer_phone = coalesce(a.customer_phone, p.phone)
from profiles p
where p.id = a.customer_id;

update appointments set payment_status = 'pay_later' where payment_status = 'unpaid';

-- Short, unambiguous, human-readable reference (no 0/O/1/I).
create or replace function gen_confirmation_code()
returns text language plpgsql as $$
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

-- ─────────────────────────────────────────────────────────────────────────────
-- Booking engine: no auth.uid(), callable by anon
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
  select duration_min, price_cents into v_duration, v_price
  from services where id = p_service_id and active and online_booking;
  if v_duration is null then
    raise exception 'service not bookable' using errcode = 'P0001';
  end if;

  v_ends := p_starts_at + (v_duration || ' minutes')::interval;

  -- pick a concrete staff member from the still-available slots
  select s.staff_id into v_staff
  from get_available_slots(p_service_id, p_staff_id, (p_starts_at at time zone
    (select timezone from app_settings where id))::date) s
  where s.starts_at = p_starts_at
  limit 1;

  if v_staff is null then
    raise exception 'slot no longer available' using errcode = 'P0001';
  end if;

  -- retry a couple of times on the (astronomically unlikely) code collision
  for i in 1..5 loop
    begin
      v_code := gen_confirmation_code();
      insert into appointments
        (service_id, staff_id, starts_at, ends_at, status, price_cents, confirmation_code)
      values
        (p_service_id, v_staff, p_starts_at, v_ends, 'confirmed', v_price, v_code)
      returning * into v_row;
      return v_row;
    exception when unique_violation then
      -- try another code
    end;
  end loop;

  raise exception 'could not allocate a confirmation code' using errcode = 'P0001';
end;
$$;

-- Self-service reschedule/cancel required a signed-in owner — gone with auth.
drop function if exists reschedule_appointment(uuid, uuid, timestamptz);
drop function if exists cancel_appointment(uuid, text);

revoke execute on function book_appointment(uuid, uuid, timestamptz) from authenticated;
grant  execute on function book_appointment(uuid, uuid, timestamptz) to anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: appointments carry PII (name/email/phone) now, so no anon read at all.
-- The app reads them with the service-role key server-side; get_available_slots
-- still sees them because it's SECURITY DEFINER.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "appointments: own read"   on appointments;
drop policy if exists "appointments: admin write" on appointments;

-- Reviews: submission is removed from the app (display only). Drop the
-- auth-scoped write policies; keep public read for the rating views/feed.
drop policy if exists "reviews: own write"  on reviews;
drop policy if exists "reviews: own insert" on reviews;
drop policy if exists "reviews: own update" on reviews;
drop policy if exists "reviews: own delete" on reviews;

-- Reviews no longer belong to a signed-in profile — the reviewer's name comes
-- from the appointment's contact details.
alter table reviews alter column customer_id drop not null;
alter table reviews drop constraint if exists reviews_customer_id_fkey;

create or replace view public_reviews
with (security_invoker = false) as
  select r.id,
         r.rating,
         r.comment,
         r.created_at,
         nullif(split_part(coalesce(a.customer_name, ''), ' ', 1), '') as reviewer_first,
         s.name  as service_name,
         st.name as staff_name,
         r.service_id,
         r.staff_id
  from reviews r
  left join appointments a on a.id = r.appointment_id
  left join services s     on s.id = r.service_id
  left join staff    st    on st.id = r.staff_id
  order by r.created_at desc;

grant select on public_reviews to anon;
