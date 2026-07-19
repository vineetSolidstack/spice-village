-- Spice Route — row-level security.
--
-- Everything is deny-by-default. Customers see approved kitchens and their own
-- records; kitchen owners see their own kitchen's data; super admins see all.
-- Capacity and slot codes are only ever mutated through the SECURITY DEFINER
-- functions in functions.sql, never by direct client writes.

alter table profiles            enable row level security;
alter table user_roles          enable row level security;
alter table kitchens            enable row level security;
alter table dishes              enable row level security;
alter table pickup_slots        enable row level security;
alter table orders              enable row level security;
alter table order_lines         enable row level security;
alter table bulk_requests       enable row level security;
alter table bulk_request_lines  enable row level security;
alter table workshops           enable row level security;
alter table workshop_sessions   enable row level security;
alter table workshop_bookings   enable row level security;

-- ------------------------------------------------------------- helpers ----

create or replace function is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles where user_id = auth.uid() and role = 'super_admin'
  );
$$;

create or replace function owns_kitchen(p_kitchen_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from kitchens where id = p_kitchen_id and owner_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------ profiles ----

create policy "read own profile" on profiles
  for select using (id = auth.uid() or is_super_admin());

create policy "update own profile" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "read own roles" on user_roles
  for select using (user_id = auth.uid() or is_super_admin());

create policy "super admin manages roles" on user_roles
  for all using (is_super_admin()) with check (is_super_admin());

-- ------------------------------------------------------------ kitchens ----

-- Customers browse approved kitchens only; owners always see their own.
create policy "browse approved kitchens" on kitchens
  for select using (state = 'approved' or owner_id = auth.uid() or is_super_admin());

create policy "owner updates own kitchen" on kitchens
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Approval state and featured flags are curation decisions, not owner settings.
create policy "super admin manages kitchens" on kitchens
  for all using (is_super_admin()) with check (is_super_admin());

create policy "browse dishes of visible kitchens" on dishes
  for select using (
    exists (
      select 1 from kitchens k
       where k.id = dishes.kitchen_id
         and (k.state = 'approved' or k.owner_id = auth.uid() or is_super_admin())
    )
  );

create policy "owner manages own dishes" on dishes
  for all using (owns_kitchen(kitchen_id)) with check (owns_kitchen(kitchen_id));

-- --------------------------------------------------------------- slots ----

create policy "browse slots of visible kitchens" on pickup_slots
  for select using (
    exists (
      select 1 from kitchens k
       where k.id = pickup_slots.kitchen_id
         and (k.state = 'approved' or k.owner_id = auth.uid() or is_super_admin())
    )
  );

-- Owners define slots and caps. `used` and `last_sequence` are still only moved
-- by place_order()/cancel_order(); a WITH CHECK cannot express "these two
-- columns are immutable", so it is enforced by this trigger instead.
create policy "owner manages own slots" on pickup_slots
  for all using (owns_kitchen(kitchen_id)) with check (owns_kitchen(kitchen_id));

create or replace function guard_slot_counters()
returns trigger
language plpgsql
as $$
begin
  -- SECURITY DEFINER functions run with the definer's rights and bypass this
  -- check via the session flag they set.
  if current_setting('spiceroute.allow_counter_write', true) = 'on' then
    return new;
  end if;
  if new.used <> old.used or new.last_sequence <> old.last_sequence then
    raise exception 'Slot counters are managed by place_order()/cancel_order()'
      using errcode = 'P0001';
  end if;
  -- Capacity may never drop below what is already booked.
  if new.capacity < new.used then
    raise exception 'Capacity cannot be lower than the % already booked', new.used
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger pickup_slots_guard
  before update on pickup_slots
  for each row execute function guard_slot_counters();

-- -------------------------------------------------------------- orders ----

create policy "read own or kitchen orders" on orders
  for select using (
    customer_id = auth.uid() or owns_kitchen(kitchen_id) or is_super_admin()
  );

-- Orders are created exclusively through place_order(); no direct inserts.
create policy "kitchen advances own orders" on orders
  for update using (owns_kitchen(kitchen_id)) with check (owns_kitchen(kitchen_id));

create policy "read lines of visible orders" on order_lines
  for select using (
    exists (
      select 1 from orders o
       where o.id = order_lines.order_id
         and (o.customer_id = auth.uid() or owns_kitchen(o.kitchen_id) or is_super_admin())
    )
  );

-- ---------------------------------------------------------- bulk quotes ----

create policy "read own or kitchen bulk requests" on bulk_requests
  for select using (
    customer_id = auth.uid() or owns_kitchen(kitchen_id) or is_super_admin()
  );

create policy "kitchen answers bulk requests" on bulk_requests
  for update using (owns_kitchen(kitchen_id)) with check (owns_kitchen(kitchen_id));

create policy "read lines of visible bulk requests" on bulk_request_lines
  for select using (
    exists (
      select 1 from bulk_requests b
       where b.id = bulk_request_lines.request_id
         and (b.customer_id = auth.uid() or owns_kitchen(b.kitchen_id) or is_super_admin())
    )
  );

-- ----------------------------------------------------------- workshops ----

create policy "browse live workshops" on workshops
  for select using (status = 'live' or instructor_id = auth.uid() or is_super_admin());

create policy "instructor manages own workshops" on workshops
  for all using (instructor_id = auth.uid()) with check (instructor_id = auth.uid());

create policy "browse sessions of visible workshops" on workshop_sessions
  for select using (
    exists (
      select 1 from workshops w
       where w.id = workshop_sessions.workshop_id
         and (w.status = 'live' or w.instructor_id = auth.uid() or is_super_admin())
    )
  );

create policy "instructor manages own sessions" on workshop_sessions
  for all using (
    exists (
      select 1 from workshops w
       where w.id = workshop_sessions.workshop_id and w.instructor_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from workshops w
       where w.id = workshop_sessions.workshop_id and w.instructor_id = auth.uid()
    )
  );

create policy "read own or hosted bookings" on workshop_bookings
  for select using (
    customer_id = auth.uid()
    or exists (
      select 1 from workshop_sessions s
        join workshops w on w.id = s.workshop_id
       where s.id = workshop_bookings.session_id and w.instructor_id = auth.uid()
    )
    or is_super_admin()
  );
