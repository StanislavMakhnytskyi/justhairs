-- justhairs — demo seed data. Safe to re-run (truncates catalog first).
-- Images are served from the Supabase Storage "assets" bucket (public).
truncate service_categories, services, staff, staff_services,
  staff_working_hours, staff_time_off restart identity cascade;

-- Categories
insert into service_categories (id, slug, name, gender, sort) values
  ('11111111-0000-0000-0000-000000000001', 'men',   'Men',   'men',   1),
  ('11111111-0000-0000-0000-000000000002', 'women', 'Women', 'women', 2);

-- Services (prices in cents, EUR)
insert into services (category_id, name, slug, description, duration_min, price_cents, deposit_cents, popular, photo_url) values
  ('11111111-0000-0000-0000-000000000001', 'Haircut',          'mens-haircut',        'Wash, cut and finish.',                       45, 2500, null, true,  'https://vyrgrzmsslcaztkydlng.supabase.co/storage/v1/object/public/assets/services/mens-haircut.webp'),
  ('11111111-0000-0000-0000-000000000001', 'Beard',            'mens-beard',          'Beard shape-up and line detailing.',          20, 1500, null, false, 'https://vyrgrzmsslcaztkydlng.supabase.co/storage/v1/object/public/assets/services/mens-beard.webp'),
  ('11111111-0000-0000-0000-000000000001', 'Haircut + Beard',  'mens-haircut-beard',  'Full haircut with matching beard work.',       60, 3500, null, true,  'https://vyrgrzmsslcaztkydlng.supabase.co/storage/v1/object/public/assets/services/mens-haircut-beard.webp'),
  ('11111111-0000-0000-0000-000000000001', 'Shaving',          'mens-shaving',        'Traditional hot-towel wet shave.',             30, 2200, null, false, 'https://vyrgrzmsslcaztkydlng.supabase.co/storage/v1/object/public/assets/services/mens-shaving.webp'),
  ('11111111-0000-0000-0000-000000000001', 'Styling',          'mens-styling',        'Wash and blow-style, no cut.',                 25, 1800, null, false, 'https://vyrgrzmsslcaztkydlng.supabase.co/storage/v1/object/public/assets/services/mens-styling.webp'),
  ('11111111-0000-0000-0000-000000000002', 'Haircut',          'womens-haircut',      'Consultation, wash, cut and blow-dry.',        60, 4500, null, true,  'https://vyrgrzmsslcaztkydlng.supabase.co/storage/v1/object/public/assets/services/womens-haircut.webp'),
  ('11111111-0000-0000-0000-000000000002', 'Coloring',         'womens-coloring',     'Single-process all-over colour.',             120, 9000, 3000, true,  'https://vyrgrzmsslcaztkydlng.supabase.co/storage/v1/object/public/assets/services/womens-coloring.webp'),
  ('11111111-0000-0000-0000-000000000002', 'Highlights',       'womens-highlights',   'Foil highlights, half or full head.',         150, 12000, 3000, false, 'https://vyrgrzmsslcaztkydlng.supabase.co/storage/v1/object/public/assets/services/womens-highlights.webp'),
  ('11111111-0000-0000-0000-000000000002', 'Blow-dry',         'womens-blow-dry',     'Wash and professional blow-dry.',              40, 3000, null, true,  'https://vyrgrzmsslcaztkydlng.supabase.co/storage/v1/object/public/assets/services/womens-blow-dry.webp'),
  ('11111111-0000-0000-0000-000000000002', 'Styling',          'womens-styling',      'Occasion and event styling.',                 50, 4000, null, false, 'https://vyrgrzmsslcaztkydlng.supabase.co/storage/v1/object/public/assets/services/womens-styling.webp'),
  ('11111111-0000-0000-0000-000000000002', 'Treatment',        'womens-treatment',    'Deep-conditioning or bond-repair treatment.',  30, 3500, null, false, 'https://vyrgrzmsslcaztkydlng.supabase.co/storage/v1/object/public/assets/services/womens-treatment.webp');

-- Staff
insert into staff (id, name, slug, title, bio, photo_url) values
  ('22222222-0000-0000-0000-000000000001', 'Amara Lee',       'amara-lee',       'Senior Stylist',    'Fifteen years behind the chair. Colour and precision cutting.', 'https://vyrgrzmsslcaztkydlng.supabase.co/storage/v1/object/public/assets/staff/amara-lee.webp'),
  ('22222222-0000-0000-0000-000000000002', 'Devon Cole',      'devon-cole',      'Barber',            'Classic barbering, fades and beard sculpting.',                'https://vyrgrzmsslcaztkydlng.supabase.co/storage/v1/object/public/assets/staff/devon-cole.webp'),
  ('22222222-0000-0000-0000-000000000003', 'Priya Shah',      'priya-shah',      'Stylist',           'Blow-dries, styling and treatments. Great with curls.',        'https://vyrgrzmsslcaztkydlng.supabase.co/storage/v1/object/public/assets/staff/priya-shah.webp'),
  ('22222222-0000-0000-0000-000000000004', 'Marco Ferreira',  'marco-ferreira',  'Barber',            'Skin fades, hot-towel shaves and beard design.',               'https://vyrgrzmsslcaztkydlng.supabase.co/storage/v1/object/public/assets/staff/marco-ferreira.webp'),
  ('22222222-0000-0000-0000-000000000005', 'Yuki Tanaka',     'yuki-tanaka',     'Colour Specialist', 'Balayage, corrective colour and bond treatments.',             'https://vyrgrzmsslcaztkydlng.supabase.co/storage/v1/object/public/assets/staff/yuki-tanaka.webp'),
  ('22222222-0000-0000-0000-000000000006', 'Nadia Hassan',    'nadia-hassan',    'Stylist',           'Cuts, blow-dries and event styling.',                          'https://vyrgrzmsslcaztkydlng.supabase.co/storage/v1/object/public/assets/staff/nadia-hassan.webp'),
  ('22222222-0000-0000-0000-000000000007', 'Ben Carter',      'ben-carter',      'Barber',            'Scissor work, classic cuts and beard trims.',                  'https://vyrgrzmsslcaztkydlng.supabase.co/storage/v1/object/public/assets/staff/ben-carter.webp');

-- Which staff perform which services (2–4 per service)
insert into staff_services (staff_id, service_id)
select s.id, sv.id from staff s join services sv on true
where (s.slug, sv.slug) in (
  -- men
  ('devon-cole','mens-haircut'),   ('marco-ferreira','mens-haircut'),   ('ben-carter','mens-haircut'),
  ('devon-cole','mens-beard'),     ('marco-ferreira','mens-beard'),     ('ben-carter','mens-beard'),
  ('devon-cole','mens-haircut-beard'), ('marco-ferreira','mens-haircut-beard'), ('ben-carter','mens-haircut-beard'),
  ('devon-cole','mens-shaving'),   ('marco-ferreira','mens-shaving'),
  ('devon-cole','mens-styling'),   ('priya-shah','mens-styling'),       ('ben-carter','mens-styling'),
  -- women
  ('amara-lee','womens-haircut'),  ('priya-shah','womens-haircut'),     ('yuki-tanaka','womens-haircut'), ('nadia-hassan','womens-haircut'),
  ('amara-lee','womens-coloring'), ('yuki-tanaka','womens-coloring'),
  ('amara-lee','womens-highlights'), ('yuki-tanaka','womens-highlights'),
  ('amara-lee','womens-blow-dry'), ('priya-shah','womens-blow-dry'),    ('nadia-hassan','womens-blow-dry'),
  ('amara-lee','womens-styling'),  ('priya-shah','womens-styling'),     ('nadia-hassan','womens-styling'),
  ('priya-shah','womens-treatment'), ('yuki-tanaka','womens-treatment'), ('nadia-hassan','womens-treatment')
);

-- Working hours (weekday: 0 = Sunday). Salon open Tue–Sat; each stylist has a day off.
insert into staff_working_hours (staff_id, weekday, start_time, end_time)
select s.id, d.weekday, '09:00', '18:00'
from staff s
cross join (values (2),(3),(4),(5),(6)) as d(weekday)
where not (
  (s.slug = 'amara-lee'     and d.weekday = 3) or  -- Wed off
  (s.slug = 'priya-shah'    and d.weekday = 4) or  -- Thu off
  (s.slug = 'yuki-tanaka'   and d.weekday = 2) or  -- Tue off
  (s.slug = 'nadia-hassan'  and d.weekday = 5)     -- Fri off
);

-- Sample vacation for Priya
insert into staff_time_off (staff_id, starts_at, ends_at, reason) values
  ('22222222-0000-0000-0000-000000000003',
   (now() + interval '10 days')::date + time '00:00',
   (now() + interval '15 days')::date + time '00:00',
   'Vacation');

-- To create an admin: sign in through the app, then in the SQL editor run
--   update profiles set role = 'admin' where email = 'you@example.com';
