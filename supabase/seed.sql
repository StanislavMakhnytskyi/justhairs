-- justhairs — demo seed data. Safe to re-run (truncates catalog first).
truncate service_categories, services, staff, staff_services,
  staff_working_hours, staff_time_off restart identity cascade;

-- Categories
insert into service_categories (id, slug, name, gender, sort) values
  ('11111111-0000-0000-0000-000000000001', 'men',   'Men',   'men',   1),
  ('11111111-0000-0000-0000-000000000002', 'women', 'Women', 'women', 2);

-- Services (prices in cents, EUR)
insert into services (category_id, name, slug, description, duration_min, price_cents, deposit_cents, popular) values
  ('11111111-0000-0000-0000-000000000001', 'Haircut',          'mens-haircut',        'Wash, cut and finish.',                   45, 2500, null, true),
  ('11111111-0000-0000-0000-000000000001', 'Beard',            'mens-beard',          'Beard shape-up and line detailing.',      20, 1500, null, false),
  ('11111111-0000-0000-0000-000000000001', 'Haircut + Beard',  'mens-haircut-beard',  'Full haircut with matching beard work.',   60, 3500, null, true),
  ('11111111-0000-0000-0000-000000000001', 'Shaving',          'mens-shaving',        'Traditional hot-towel wet shave.',         30, 2200, null, false),
  ('11111111-0000-0000-0000-000000000001', 'Styling',          'mens-styling',        'Wash and blow-style, no cut.',             25, 1800, null, false),
  ('11111111-0000-0000-0000-000000000002', 'Haircut',          'womens-haircut',      'Consultation, wash, cut and blow-dry.',    60, 4500, null, true),
  ('11111111-0000-0000-0000-000000000002', 'Coloring',         'womens-coloring',     'Single-process all-over colour.',         120, 9000, 3000, true),
  ('11111111-0000-0000-0000-000000000002', 'Highlights',       'womens-highlights',   'Foil highlights, half or full head.',     150, 12000, 3000, false),
  ('11111111-0000-0000-0000-000000000002', 'Blow-dry',         'womens-blow-dry',     'Wash and professional blow-dry.',          40, 3000, null, true),
  ('11111111-0000-0000-0000-000000000002', 'Styling',          'womens-styling',      'Occasion and event styling.',              50, 4000, null, false),
  ('11111111-0000-0000-0000-000000000002', 'Treatment',        'womens-treatment',    'Deep-conditioning or bond-repair treatment.', 30, 3500, null, false);

-- Staff
insert into staff (id, name, slug, title, bio) values
  ('22222222-0000-0000-0000-000000000001', 'Amara Lee',  'amara-lee',  'Senior Stylist', 'Fifteen years behind the chair. Colour and precision cutting.'),
  ('22222222-0000-0000-0000-000000000002', 'Devon Cole', 'devon-cole', 'Barber',         'Classic barbering, fades and beard sculpting.'),
  ('22222222-0000-0000-0000-000000000003', 'Priya Shah', 'priya-shah', 'Stylist',        'Blow-dries, styling and treatments. Great with curls.');

-- Which staff perform which services
insert into staff_services (staff_id, service_id)
select '22222222-0000-0000-0000-000000000001', id from services where slug in
  ('womens-haircut','womens-coloring','womens-highlights','womens-blow-dry','womens-styling','womens-treatment','mens-haircut');
insert into staff_services (staff_id, service_id)
select '22222222-0000-0000-0000-000000000002', id from services where slug in
  ('mens-haircut','mens-beard','mens-haircut-beard','mens-shaving','mens-styling');
insert into staff_services (staff_id, service_id)
select '22222222-0000-0000-0000-000000000003', id from services where slug in
  ('womens-haircut','womens-blow-dry','womens-styling','womens-treatment','mens-haircut','mens-styling');

-- Working hours (weekday: 0 = Sunday). Tue–Sat, salon closed Sun/Mon.
insert into staff_working_hours (staff_id, weekday, start_time, end_time)
select s.id, d.weekday, '09:00', '18:00'
from staff s cross join (values (2),(3),(4),(5),(6)) as d(weekday);

-- Amara takes Wednesdays off
delete from staff_working_hours
where staff_id = '22222222-0000-0000-0000-000000000001' and weekday = 3;

-- Sample vacation for Priya
insert into staff_time_off (staff_id, starts_at, ends_at, reason) values
  ('22222222-0000-0000-0000-000000000003',
   (now() + interval '10 days')::date + time '00:00',
   (now() + interval '15 days')::date + time '00:00',
   'Vacation');

-- To create an admin: sign in through the app, then in the SQL editor run
--   update profiles set role = 'admin' where email = 'you@example.com';
