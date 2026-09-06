-- justhairs — initial schema, RLS, and booking engine
-- Salon operates in a single timezone; slot math is done in local time.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────────
create type appointment_status as enum
  ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
create type category_gender as enum ('men', 'women', 'unisex');
create type user_role as enum ('customer', 'admin');

-- Salon-wide settings kept in one row for easy tweaking.
create table app_settings (
  id            boolean primary key default true check (id),
  timezone      text not null default 'Europe/Dublin',
  slot_step_min int  not null default 15,
  cancel_window_hours int not null default 24
);
insert into app_settings (id) values (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Profiles
-- ─────────────────────────────────────────────────────────────────────────────
create table profiles (
  id                 uuid primary key references auth.users on delete cascade,
  full_name          text,
  phone              text,
  phone_verified     boolean not null default false,
  email              text,
  birthday           date,
  gender             text,
  preferred_staff_id uuid,
  notification_prefs  jsonb not null default '{"email": true, "sms": false}'::jsonb,
  role               user_role not null default 'customer',
  created_at         timestamptz not null default now()
);

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- Catalog
-- ─────────────────────────────────────────────────────────────────────────────
create table service_categories (
  id     uuid primary key default gen_random_uuid(),
  slug   text not null unique,
  name   text not null,
  gender category_gender not null,
  sort   int not null default 0
);

create table services (
  id             uuid primary key default gen_random_uuid(),
  category_id    uuid not null references service_categories on delete restrict,
  name           text not null,
  slug           text not null unique,
  description    text,
  duration_min   int not null check (duration_min > 0),
  price_cents    int not null check (price_cents >= 0),
  deposit_cents  int check (deposit_cents >= 0),
  photo_url      text,
  online_booking boolean not null default true,
  popular        boolean not null default false,
  active         boolean not null default true
);

create table staff (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  slug      text not null unique,
  photo_url text,
  bio       text,
  title     text,
  active    boolean not null default true
);

alter table profiles
  add constraint profiles_preferred_staff_fk
  foreign key (preferred_staff_id) references staff on delete set null;

create table staff_services (
  staff_id   uuid not null references staff on delete cascade,
  service_id uuid not null references services on delete cascade,
  primary key (staff_id, service_id)
);

create table staff_working_hours (
  id         uuid primary key default gen_random_uuid(),
  staff_id   uuid not null references staff on delete cascade,
  weekday    int not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time   time not null,
  check (end_time > start_time)
);

create table staff_time_off (
  id        uuid primary key default gen_random_uuid(),
  staff_id  uuid not null references staff on delete cascade,
  starts_at timestamptz not null,
  ends_at   timestamptz not null,
  reason    text,
  check (ends_at > starts_at)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Appointments
-- ─────────────────────────────────────────────────────────────────────────────
create table appointments (
  id                  uuid primary key default gen_random_uuid(),
  customer_id         uuid not null references profiles on delete cascade,
  service_id          uuid not null references services on delete restrict,
  staff_id            uuid references staff on delete set null,
  starts_at           timestamptz not null,
  ends_at             timestamptz not null,
  status              appointment_status not null default 'confirmed',
  price_cents         int not null,
  cancellation_reason text,
  created_by          uuid references auth.users on delete set null,
  created_at          timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index appointments_staff_time_idx on appointments (staff_id, starts_at);
create index appointments_customer_idx on appointments (customer_id, starts_at desc);

-- Stubs for later milestones (created now so migrations stay linear; no UI yet).
create table orders (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles on delete cascade,
  appointment_id uuid references appointments on delete set null,
  subtotal_cents int not null default 0,
  total_cents  int not null default 0,
  status      text not null default 'unpaid',
  created_at  timestamptz not null default now()
);
create table order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders on delete cascade,
  label      text not null,
  amount_cents int not null
);
create table payments (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders on delete cascade,
  provider    text not null default 'stripe',
  provider_payment_id text,
  amount_cents int not null,
  status      text not null default 'pending',
  created_at  timestamptz not null default now()
);
create table reviews (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references appointments on delete cascade,
  customer_id    uuid not null references profiles on delete cascade,
  staff_id       uuid references staff on delete set null,
  service_id     uuid references services on delete set null,
  rating         int not null check (rating between 1 and 5),
  comment        text,
  created_at     timestamptz not null default now()
);
create table favorites (
  customer_id uuid not null references profiles on delete cascade,
  service_id  uuid not null references services on delete cascade,
  staff_id    uuid references staff on delete set null,
  created_at  timestamptz not null default now(),
  primary key (customer_id, service_id)
);
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles on delete cascade,
  kind        text not null,
  payload     jsonb not null default '{}'::jsonb,
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Booking engine
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function get_available_slots(
  p_service_id uuid,
  p_staff_id   uuid,
  p_day        date
)
returns table (starts_at timestamptz, staff_id uuid)
language plpgsql stable security definer set search_path = public as $$
declare
  v_tz       text;
  v_step     int;
  v_duration int;
begin
  select timezone, slot_step_min into v_tz, v_step from app_settings where id;
  select duration_min into v_duration from services
    where id = p_service_id and active and online_booking;
  if v_duration is null then
    return;
  end if;

  return query
  with candidates as (
    select s.id
    from staff s
    where s.active
      and (p_staff_id is null or s.id = p_staff_id)
      and exists (
        select 1 from staff_services ss
        where ss.staff_id = s.id and ss.service_id = p_service_id
      )
  ),
  raw_slots as (
    select
      c.id as staff_id,
      ((p_day::timestamp + wh.start_time) at time zone v_tz
        + (n * v_step || ' minutes')::interval) as slot_start
    from candidates c
    join staff_working_hours wh
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
        select 1 from staff_time_off t
        where t.staff_id = rs.staff_id
          and tstzrange(t.starts_at, t.ends_at, '[)')
              && tstzrange(rs.slot_start, rs.slot_start + (v_duration || ' minutes')::interval, '[)')
      )
      and not exists (
        select 1 from appointments a
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

create or replace function book_appointment(
  p_service_id uuid,
  p_staff_id   uuid,
  p_starts_at  timestamptz
)
returns appointments
language plpgsql security definer set search_path = public as $$
declare
  v_uid      uuid := auth.uid();
  v_duration int;
  v_price    int;
  v_staff    uuid;
  v_ends     timestamptz;
  v_row      appointments;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

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

  insert into appointments
    (customer_id, service_id, staff_id, starts_at, ends_at, status, price_cents, created_by)
  values
    (v_uid, p_service_id, v_staff, p_starts_at, v_ends, 'confirmed', v_price, v_uid)
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function reschedule_appointment(
  p_appointment_id uuid,
  p_staff_id       uuid,
  p_starts_at      timestamptz
)
returns appointments
language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_appt   appointments;
  v_staff  uuid;
  v_dur    int;
begin
  select * into v_appt from appointments where id = p_appointment_id;
  if v_appt.id is null or (v_appt.customer_id <> v_uid and not is_admin()) then
    raise exception 'not found' using errcode = 'P0001';
  end if;
  if v_appt.status not in ('pending', 'confirmed') then
    raise exception 'cannot reschedule this appointment' using errcode = 'P0001';
  end if;

  select duration_min into v_dur from services where id = v_appt.service_id;

  select s.staff_id into v_staff
  from get_available_slots(v_appt.service_id, p_staff_id, (p_starts_at at time zone
    (select timezone from app_settings where id))::date) s
  where s.starts_at = p_starts_at
  limit 1;
  if v_staff is null then
    raise exception 'slot no longer available' using errcode = 'P0001';
  end if;

  update appointments set
    staff_id = v_staff,
    starts_at = p_starts_at,
    ends_at = p_starts_at + (v_dur || ' minutes')::interval
  where id = p_appointment_id
  returning * into v_appt;
  return v_appt;
end;
$$;

create or replace function cancel_appointment(
  p_appointment_id uuid,
  p_reason         text
)
returns appointments
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_appt appointments;
begin
  select * into v_appt from appointments where id = p_appointment_id;
  if v_appt.id is null or (v_appt.customer_id <> v_uid and not is_admin()) then
    raise exception 'not found' using errcode = 'P0001';
  end if;
  if v_appt.status not in ('pending', 'confirmed') then
    raise exception 'cannot cancel this appointment' using errcode = 'P0001';
  end if;

  update appointments set status = 'cancelled', cancellation_reason = p_reason
  where id = p_appointment_id
  returning * into v_appt;
  return v_appt;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
alter table profiles              enable row level security;
alter table app_settings          enable row level security;
alter table service_categories    enable row level security;
alter table services              enable row level security;
alter table staff                 enable row level security;
alter table staff_services        enable row level security;
alter table staff_working_hours   enable row level security;
alter table staff_time_off        enable row level security;
alter table appointments          enable row level security;
alter table orders                enable row level security;
alter table order_items           enable row level security;
alter table payments              enable row level security;
alter table reviews               enable row level security;
alter table favorites             enable row level security;
alter table notifications         enable row level security;

-- profiles
create policy "profiles: self read"  on profiles for select using (id = auth.uid() or is_admin());
create policy "profiles: self write" on profiles for update using (id = auth.uid() or is_admin());

-- app settings: readable by anyone, writable by admin
create policy "settings: read"  on app_settings for select using (true);
create policy "settings: admin" on app_settings for all using (is_admin()) with check (is_admin());

-- catalog: public read of active rows, admin writes
create policy "categories: read" on service_categories for select using (true);
create policy "categories: admin" on service_categories for all using (is_admin()) with check (is_admin());

create policy "services: read" on services for select using (active or is_admin());
create policy "services: admin" on services for all using (is_admin()) with check (is_admin());

create policy "staff: read" on staff for select using (active or is_admin());
create policy "staff: admin" on staff for all using (is_admin()) with check (is_admin());

create policy "staff_services: read" on staff_services for select using (true);
create policy "staff_services: admin" on staff_services for all using (is_admin()) with check (is_admin());

create policy "working_hours: read" on staff_working_hours for select using (true);
create policy "working_hours: admin" on staff_working_hours for all using (is_admin()) with check (is_admin());

create policy "time_off: read" on staff_time_off for select using (true);
create policy "time_off: admin" on staff_time_off for all using (is_admin()) with check (is_admin());

-- appointments: customers see their own; writes go through SECURITY DEFINER RPCs
create policy "appointments: own read" on appointments
  for select using (customer_id = auth.uid() or is_admin());
create policy "appointments: admin write" on appointments
  for all using (is_admin()) with check (is_admin());

-- later-milestone tables: owner-read, admin-all
create policy "orders: own" on orders for select using (customer_id = auth.uid() or is_admin());
create policy "orders: admin" on orders for all using (is_admin()) with check (is_admin());
create policy "order_items: own" on order_items for select using (
  exists (select 1 from orders o where o.id = order_id and (o.customer_id = auth.uid() or is_admin()))
);
create policy "payments: own" on payments for select using (
  exists (select 1 from orders o where o.id = order_id and (o.customer_id = auth.uid() or is_admin()))
);
create policy "reviews: read" on reviews for select using (true);
create policy "reviews: own write" on reviews for insert with check (customer_id = auth.uid());
create policy "favorites: own" on favorites for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy "notifications: own" on notifications for select using (customer_id = auth.uid() or is_admin());

grant execute on function get_available_slots(uuid, uuid, date) to anon, authenticated;
grant execute on function book_appointment(uuid, uuid, timestamptz) to authenticated;
grant execute on function reschedule_appointment(uuid, uuid, timestamptz) to authenticated;
grant execute on function cancel_appointment(uuid, text) to authenticated;
grant execute on function is_admin() to anon, authenticated;
