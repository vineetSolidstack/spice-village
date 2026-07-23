-- Spice Route / Nandhan Delight — seed.
--
-- Written for the Supabase SQL Editor: pure SQL, no psql meta-commands.
--
-- PREREQUISITE: at least one auth user must exist. Create one in the dashboard
-- under Authentication → Users → "Add user" (email + password is fine), then
-- run this file. It attaches the kitchen, workshops, and roles to that user.
--
-- Safe to re-run: every insert is guarded, so nothing is duplicated.

do $$
declare
  v_owner   uuid;
  v_kitchen uuid;
  v_w1      uuid;
begin
  -- Use the oldest auth user as the founder/owner account.
  select id into v_owner from auth.users order by created_at limit 1;

  if v_owner is null then
    raise exception
      'No auth users found. Create one in Authentication → Users, then re-run this file.';
  end if;

  -- ---------------------------------------------------------- profile ----
  insert into profiles (id, full_name, phone, language)
  values (v_owner, 'Nandhan Delight', null, 'en')
  on conflict (id) do nothing;

  -- The founder wears every hat at launch: they own the kitchen, teach the
  -- classes, and administer the platform.
  insert into user_roles (user_id, role)
  values (v_owner, 'kitchen_owner'), (v_owner, 'instructor'),
         (v_owner, 'super_admin'),   (v_owner, 'customer')
  on conflict do nothing;

  -- ---------------------------------------------------------- kitchen ----
  insert into kitchens (slug, owner_id, name, cuisine, area, rating,
                        state, featured, accepting_orders, pickup_window)
  values ('nandhan-delight', v_owner, 'Nandhan Delight', 'South Indian',
          'Cloud kitchen', 4.9, 'approved', true, true, '5–7 pm')
  on conflict (slug) do nothing;

  select id into v_kitchen from kitchens where slug = 'nandhan-delight';

  -- ------------------------------------------------------------ menu ----
  -- Placeholder menu mirroring src/data/demo.ts — replace with the real one.
  insert into dishes (kitchen_id, name, description, price, old_price, veg, is_combo, sort_order)
  select v_kitchen, d.name, d.description, d.price, d.old_price, d.veg, d.is_combo, d.sort_order
    from (values
      ('Nandhan special thali',      'Sambar, rasam, poriyal, curd rice, papad + sweet', 240, 300, true,  true,  0),
      ('Weekend feast box',          'Chicken biryani, chettinad curry, dessert for two', 460, 560, false, true,  1),
      ('Ghee podi dosa (2 pc)',      'Crisp dosa, house podi, extra ghee',                100, 120, true,  false, 0),
      ('Idli · vada combo',          'Two idlis, one medu vada, sambar & chutney',         80,  95, true,  false, 1),
      ('Chettinad chicken curry',    'Slow-roasted spice masala, bone-in',                190, 230, false, false, 2),
      ('Paneer butter masala',       'Creamy tomato gravy with soft paneer',              180, 220, true,  false, 3),
      ('Hyderabadi chicken biryani', 'Dum-cooked, saffron rice, boiled egg',              220, 270, false, false, 4),
      ('Filter coffee',              'Frothy, strong, brewed in brass',                    40,  50, true,  false, 5)
    ) as d(name, description, price, old_price, veg, is_combo, sort_order)
   where not exists (
     select 1 from dishes x where x.kitchen_id = v_kitchen and x.name = d.name
   );

  -- ----------------------------------------------------------- slots ----
  -- Today's pickup slots. `used` starts at zero: real capacity is only ever
  -- consumed through place_order().
  insert into pickup_slots (kitchen_id, time_label, digits, service_date, capacity, used, last_sequence)
  select v_kitchen, s.time_label, s.digits, current_date, s.capacity, 0, 0
    from (values
      ('5:00 pm', '500', 15),
      ('5:15 pm', '515', 15),
      ('5:30 pm', '530', 12),
      ('5:45 pm', '545', 12),
      ('6:00 pm', '600', 15)
    ) as s(time_label, digits, capacity)
   where not exists (
     select 1 from pickup_slots p
      where p.kitchen_id = v_kitchen and p.service_date = current_date and p.digits = s.digits
   );

  -- ------------------------------------------------------- workshops ----
  insert into workshops (instructor_id, title, price, duration_label, status)
  select v_owner, w.title, w.price, w.duration_label, w.status::workshop_status
    from (values
      ('Master the dosa flip',   499, '2 hrs',  'live'),
      ('Biryani, layer by layer', 799, '3 hrs',  'live'),
      ('Chutney chemistry',      349, '90 min', 'draft')
    ) as w(title, price, duration_label, status)
   where not exists (
     select 1 from workshops x where x.instructor_id = v_owner and x.title = w.title
   );

  select id into v_w1 from workshops
   where instructor_id = v_owner and title = 'Master the dosa flip' limit 1;

  -- Sessions are seeded relative to today so they never look stale.
  insert into workshop_sessions (workshop_id, starts_at, when_label, capacity, booked)
  select v_w1,
         (current_date + s.day_offset + time '10:00') at time zone 'Asia/Kolkata',
         to_char(current_date + s.day_offset, 'Dy DD Mon') || ' · 10 am',
         s.capacity, 0
    from (values (3, 8), (10, 8)) as s(day_offset, capacity)
   where v_w1 is not null
     and not exists (
       select 1 from workshop_sessions x
        where x.workshop_id = v_w1
          and x.when_label = to_char(current_date + s.day_offset, 'Dy DD Mon') || ' · 10 am'
     );

  raise notice 'Seed complete. Kitchen % owned by %.', v_kitchen, v_owner;
end $$;
