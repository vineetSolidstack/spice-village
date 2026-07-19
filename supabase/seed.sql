-- Spice Route — development seed.
--
-- Mirrors the demo dataset in `src/data/demo.ts` so a local Supabase project
-- shows the same content the app falls back to when unconfigured.
--
-- Assumes the auth users already exist. Create them first, e.g.:
--   select auth.uid();  -- or use the Supabase dashboard / admin API
-- then substitute the ids below.

\set customer_id  '00000000-0000-0000-0000-000000000001'
\set owner_id     '00000000-0000-0000-0000-000000000002'
\set admin_id     '00000000-0000-0000-0000-000000000003'

insert into profiles (id, full_name, phone, language) values
  (:'customer_id', 'Priya S.',      '98400 11111', 'en'),
  (:'owner_id',    'Anita R.',      '98400 22222', 'ta'),
  (:'admin_id',    'Platform Team', null,          'en')
on conflict (id) do nothing;

insert into user_roles (user_id, role) values
  (:'customer_id', 'customer'),
  (:'owner_id',    'kitchen_owner'),
  (:'owner_id',    'instructor'),
  (:'admin_id',    'super_admin')
on conflict do nothing;

-- ------------------------------------------------------------- kitchens ----

insert into kitchens (slug, owner_id, name, cuisine, area, rating, state, featured, accepting_orders, pickup_window)
values
  ('anitas-kitchen', :'owner_id', 'Anita’s Kitchen', 'South Indian', 'T. Nagar',   4.8, 'approved', true,  true, '5–7 pm')
on conflict (slug) do nothing;

insert into dishes (kitchen_id, name, description, price, old_price, veg, is_combo, sort_order)
select k.id, d.name, d.description, d.price, d.old_price, d.veg, d.is_combo, d.sort_order
  from kitchens k,
       (values
         ('Sunday tiffin combo', 'Dosa, idli, vada, pongal + filter coffee', 220, 275, true,  true,  0),
         ('Feast for two',       'Chettinad chicken, dosas, dessert for two', 420, 520, false, true,  1),
         ('Ghee dosa (2 pc)',    'Crisp, golden, brushed with homemade ghee',  90, 110, true,  false, 0),
         ('Sambar idli bowl',    'Soft idlis soaked in drumstick sambar',      70,  85, true,  false, 1),
         ('Chicken chettinad',   'Slow-cooked with roasted spice masala',     180, 220, false, false, 2),
         ('Filter coffee',       'Frothy, strong, brewed in brass',            35,  40, true,  false, 3)
       ) as d(name, description, price, old_price, veg, is_combo, sort_order)
 where k.slug = 'anitas-kitchen';

-- ---------------------------------------------------------------- slots ----

-- `used` is seeded directly here (rather than through place_order) so the demo
-- shows a realistic mix of nearly-full and empty slots.
insert into pickup_slots (kitchen_id, time_label, digits, capacity, used, last_sequence)
select k.id, s.time_label, s.digits, s.capacity, s.used, s.used
  from kitchens k,
       (values
         ('5:00 pm', '500', 15,  6),
         ('5:15 pm', '515', 15, 15),
         ('5:30 pm', '530', 12,  3),
         ('5:45 pm', '545', 12, 11),
         ('6:00 pm', '600', 15,  2)
       ) as s(time_label, digits, capacity, used)
 where k.slug = 'anitas-kitchen';

-- ------------------------------------------------------------ workshops ----

insert into workshops (instructor_id, title, price, duration_label, status)
values
  (:'owner_id', 'Master the dosa flip', 499, '2 hrs',  'live'),
  (:'owner_id', 'Chutney chemistry',    349, '90 min', 'draft');

insert into workshop_sessions (workshop_id, starts_at, when_label, capacity, booked)
select w.id, s.starts_at::timestamptz, s.when_label, s.capacity, s.booked
  from workshops w,
       (values
         ('Master the dosa flip', '2026-07-25 10:00+05:30', 'Sat 25 Jul · 10 am', 8, 5),
         ('Master the dosa flip', '2026-07-26 10:00+05:30', 'Sun 26 Jul · 10 am', 8, 8),
         ('Master the dosa flip', '2026-08-01 16:00+05:30', 'Sat 1 Aug · 4 pm',   8, 2),
         ('Chutney chemistry',    '2026-08-09 11:00+05:30', 'Sun 9 Aug · 11 am', 10, 0)
       ) as s(title, starts_at, when_label, capacity, booked)
 where w.title = s.title;
