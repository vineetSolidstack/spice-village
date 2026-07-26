-- Spice Route — per-item daily stock (units set on each menu item).
--
-- RUN FIFTEENTH, after workshop_photos.sql. Safe to re-run.
--
-- This SUPERSEDES the single kitchen pool from daily_stock.sql. Instead of one
-- number for the whole kitchen, each combo/dish carries its own units for the
-- day. The day's total is the SUM across items, and any slot shows that sum as
-- remaining. A combo can sell out on its own while others still have stock;
-- when every tracked item is out, the total hits zero and all slots are full.
--
-- Two numbers per item:
--   dishes.daily_units          the REPEATING default (e.g. 10 every day)
--   dish_daily_stock.units      TODAY's effective number (an override, or the
--                               default copied in for the day)
--
-- Changing an item asks "every day or just today":
--   every day  -> update dishes.daily_units AND today's row
--   just today -> update today's row only; tomorrow reverts to daily_units
--
-- An item with daily_units = NULL is untracked (unlimited) and never gates.

-- The repeating default, per item. NULL = not limited.
alter table dishes add column if not exists daily_units integer
  check (daily_units is null or daily_units >= 0);

-- Today's live stock for one item.
create table if not exists dish_daily_stock (
  dish_id uuid not null references dishes on delete cascade,
  service_date date not null default current_date,
  units integer not null check (units >= 0),
  used integer not null default 0 check (used >= 0),
  primary key (dish_id, service_date),
  constraint dish_stock_within_units check (used <= units)
);

alter table dish_daily_stock enable row level security;

drop policy if exists "anyone reads dish stock" on dish_daily_stock;
create policy "anyone reads dish stock" on dish_daily_stock
  for select using (true);

-- The owner may set units; `used` is moved by place_order()/cancel_order() only,
-- enforced by the guard trigger below.
drop policy if exists "owner sets dish stock" on dish_daily_stock;
create policy "owner sets dish stock" on dish_daily_stock
  for all using (
    exists (select 1 from dishes d
             where d.id = dish_id and (owns_kitchen(d.kitchen_id) or is_super_admin()))
  )
  with check (
    exists (select 1 from dishes d
             where d.id = dish_id and (owns_kitchen(d.kitchen_id) or is_super_admin()))
  );

create or replace function guard_dish_stock()
returns trigger
language plpgsql
as $$
begin
  if current_setting('spiceroute.allow_counter_write', true) = 'on' then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.used <> old.used then
    raise exception 'dish_daily_stock.used is managed by place_order()/cancel_order()'
      using errcode = 'P0001';
  end if;
  if new.units < new.used then
    raise exception 'Units cannot be lower than the % already booked today', new.used
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists dish_stock_guard on dish_daily_stock;
create trigger dish_stock_guard
  before update on dish_daily_stock
  for each row execute function guard_dish_stock();

-- ------------------------------------------------- ensure today's row ------

-- Lazily create today's stock row for a tracked item, copying the repeating
-- default. Does nothing for untracked items (daily_units IS NULL). Callers must
-- already hold the counter-write flag when they need to mutate `used` after.
create or replace function ensure_dish_stock(p_dish_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_default integer;
begin
  select daily_units into v_default from dishes where id = p_dish_id;
  if v_default is null then
    return;
  end if;
  insert into dish_daily_stock (dish_id, service_date, units, used)
  values (p_dish_id, current_date, v_default, 0)
  on conflict (dish_id, service_date) do nothing;
end;
$$;

-- --------------------------------------------- owner: set an item's units ---

-- Sets an item's units. p_repeat=true changes the everyday default too; false
-- overrides today only. NULL p_units clears the limit (untracked/unlimited).
create or replace function set_dish_daily_units(
  p_dish_id uuid,
  p_units   integer,
  p_repeat  boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kitchen uuid;
begin
  select kitchen_id into v_kitchen from dishes where id = p_dish_id;
  if v_kitchen is null then
    raise exception 'Dish not found' using errcode = 'P0002';
  end if;
  if not (owns_kitchen(v_kitchen) or is_super_admin()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  if p_repeat then
    update dishes set daily_units = p_units where id = p_dish_id;
  end if;

  perform set_config('spiceroute.allow_counter_write', 'on', true);

  if p_units is null then
    -- Clearing the limit: drop today's row so nothing gates this item.
    delete from dish_daily_stock
     where dish_id = p_dish_id and service_date = current_date;
    return;
  end if;

  insert into dish_daily_stock (dish_id, service_date, units, used)
  values (p_dish_id, current_date, p_units, 0)
  on conflict (dish_id, service_date)
    -- Never drop units below what's already booked today.
    do update set units = greatest(dish_daily_stock.used, excluded.units);
end;
$$;

-- ------------------------------------------------ today's menu stock -------

-- Per-item remaining for one kitchen today. units/remaining are NULL for
-- untracked items so the app can show "no limit".
create or replace function menu_stock(p_kitchen_slug text)
returns table (dish_id uuid, units integer, used integer, remaining integer)
language sql
stable
security definer
set search_path = public
as $$
  select d.id,
         coalesce(s.units, d.daily_units),
         coalesce(s.used, 0),
         case when d.daily_units is null then null
              else greatest(0, coalesce(s.units, d.daily_units) - coalesce(s.used, 0)) end
    from dishes d
    join kitchens k on k.id = d.kitchen_id
    left join dish_daily_stock s
           on s.dish_id = d.id and s.service_date = current_date
   where k.slug = p_kitchen_slug;
$$;

-- The kitchen's shared total for today = SUM across tracked items. Kept under
-- the same name the app already calls, so every slot shows this as remaining.
create or replace function today_stock(p_kitchen_slug text)
returns table (capacity integer, used integer, remaining integer)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(coalesce(s.units, d.daily_units)), 0)::int,
         coalesce(sum(coalesce(s.used, 0)), 0)::int,
         coalesce(sum(greatest(0, coalesce(s.units, d.daily_units) - coalesce(s.used, 0))), 0)::int
    from dishes d
    join kitchens k on k.id = d.kitchen_id
    left join dish_daily_stock s
           on s.dish_id = d.id and s.service_date = current_date
   where k.slug = p_kitchen_slug and d.daily_units is not null;
$$;

-- ---------------------------------------- place_order (per-item capacity) ---

-- Re-declared to gate on each item's own daily stock. Untracked items (no
-- daily_units) never gate. The slot is still locked to allocate its sequence.
create or replace function place_order(
  p_kitchen_id uuid,
  p_slot_id uuid,
  p_lines jsonb
)
returns table (order_id uuid, ref text, slot_code text, slot_time text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer uuid := auth.uid();
  v_slot     pickup_slots%rowtype;
  v_kitchen  kitchens%rowtype;
  v_count    integer;
  v_total    integer := 0;
  v_sequence integer;
  v_code     text;
  v_ref      text;
  v_order_id uuid;
  v_line     jsonb;
  v_dish     dishes%rowtype;
  v_qty      integer;
  v_stock    dish_daily_stock%rowtype;
begin
  if v_customer is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Order is empty' using errcode = '22023';
  end if;

  select coalesce(sum((line ->> 'quantity')::int), 0) into v_count
    from jsonb_array_elements(p_lines) as line;
  if v_count <= 0 then
    raise exception 'Order is empty' using errcode = '22023';
  end if;

  select * into v_kitchen from kitchens where id = p_kitchen_id;
  if not found then
    raise exception 'Kitchen not found' using errcode = 'P0002';
  end if;
  if v_kitchen.state <> 'approved' or not v_kitchen.accepting_orders then
    raise exception 'Kitchen is not accepting orders' using errcode = 'P0001';
  end if;

  select * into v_slot from pickup_slots
   where id = p_slot_id and kitchen_id = p_kitchen_id for update;
  if not found then
    raise exception 'Pickup slot not found' using errcode = 'P0002';
  end if;

  v_sequence := v_slot.last_sequence + 1;
  v_code := v_slot.digits || '-' || lpad(v_sequence::text, 2, '0');
  v_ref  := 'SR-' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');

  perform set_config('spiceroute.allow_counter_write', 'on', true);

  -- Validate + draw down each line against its own item stock, under a row
  -- lock. Any shortfall raises and rolls the whole order back.
  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_qty := (v_line ->> 'quantity')::int;
    select * into v_dish from dishes
     where id = (v_line ->> 'dish_id')::uuid and kitchen_id = p_kitchen_id;
    if not found then
      raise exception 'Dish % is not on this menu', v_line ->> 'dish_id' using errcode = 'P0002';
    end if;
    if not v_dish.available then
      raise exception 'Dish % is unavailable', v_dish.name using errcode = 'P0001';
    end if;
    v_total := v_total + v_dish.price * v_qty;

    -- Only tracked items draw from a pool.
    if v_dish.daily_units is not null then
      perform ensure_dish_stock(v_dish.id);
      select * into v_stock from dish_daily_stock
       where dish_id = v_dish.id and service_date = current_date for update;
      if v_stock.used + v_qty > v_stock.units then
        raise exception 'Only % of % left today',
          greatest(0, v_stock.units - v_stock.used), v_dish.name
          using errcode = 'P0001', hint = 'sold_out';
      end if;
      update dish_daily_stock set used = used + v_qty
       where dish_id = v_dish.id and service_date = current_date;
    end if;
  end loop;

  update pickup_slots set used = used + v_count, last_sequence = v_sequence
   where id = v_slot.id;

  insert into orders (ref, kitchen_id, customer_id, slot_id, slot_code, sequence, item_count, total)
  values (v_ref, p_kitchen_id, v_customer, p_slot_id, v_code, v_sequence, v_count, v_total)
  returning id into v_order_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    select * into v_dish from dishes where id = (v_line ->> 'dish_id')::uuid;
    insert into order_lines (order_id, dish_id, dish_name, unit_price, quantity)
    values (v_order_id, v_dish.id, v_dish.name, v_dish.price, (v_line ->> 'quantity')::int);
  end loop;

  return query select v_order_id, v_ref, v_code, v_slot.time_label;
end;
$$;

-- ----------------------------------------- cancel_order (per-item release) --

create or replace function cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
  v_svc   date;
  v_line  order_lines%rowtype;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if v_order.status in ('completed', 'cancelled') then
    raise exception 'Order is already closed' using errcode = 'P0001';
  end if;

  -- Release against the day the order was placed for.
  select service_date into v_svc from pickup_slots where id = v_order.slot_id;

  perform set_config('spiceroute.allow_counter_write', 'on', true);

  -- Return each line's units to its item pool for that day.
  for v_line in select * from order_lines where order_id = p_order_id loop
    update dish_daily_stock set used = greatest(0, used - v_line.quantity)
     where dish_id = v_line.dish_id and service_date = v_svc;
  end loop;

  update pickup_slots set used = greatest(0, used - v_order.item_count)
   where id = v_order.slot_id;

  update orders set status = 'cancelled' where id = p_order_id;
end;
$$;

-- Seed sensible starting units for the founder's combos so orders work today:
-- 10 units each on every combo that has none set yet.
do $$
declare v_kitchen uuid;
begin
  select id into v_kitchen from kitchens where slug = 'nandhan-delight';
  if v_kitchen is not null then
    update dishes set daily_units = 10
     where kitchen_id = v_kitchen and is_combo and daily_units is null;
  end if;
end $$;
