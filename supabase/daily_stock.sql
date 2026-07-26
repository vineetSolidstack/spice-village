-- Spice Route — shared daily stock (pooled capacity).
--
-- RUN THIRTEENTH, after coupons.sql. Safe to re-run.
--
-- The capacity model changes here. Instead of each pickup slot having its own
-- cap, the kitchen sets ONE number of units for the day (e.g. 50). Every slot
-- shows that same remaining count, and any order — at any slot, for any combo —
-- draws from the single pool. When the pool hits zero, every slot is full.
--
-- Pickup slots still exist, but only as pickup TIMES: they carry the per-slot
-- sequence used to build the slot code (500-07). Capacity now lives in
-- daily_stock, one row per kitchen per day.

create table if not exists daily_stock (
  kitchen_id uuid not null references kitchens on delete cascade,
  service_date date not null default current_date,
  capacity integer not null check (capacity >= 0),
  used integer not null default 0 check (used >= 0),
  primary key (kitchen_id, service_date),
  constraint stock_within_capacity check (used <= capacity)
);

alter table daily_stock enable row level security;

drop policy if exists "anyone reads daily stock" on daily_stock;
create policy "anyone reads daily stock" on daily_stock
  for select using (true);

-- Only the owner sets the day's number; used is moved by place_order() only.
drop policy if exists "owner sets daily stock" on daily_stock;
create policy "owner sets daily stock" on daily_stock
  for all using (owns_kitchen(kitchen_id) or is_super_admin())
  with check (owns_kitchen(kitchen_id) or is_super_admin());

-- The guard trigger keeps `used` server-controlled, like the slot counters.
create or replace function guard_daily_stock()
returns trigger
language plpgsql
as $$
begin
  if current_setting('spiceroute.allow_counter_write', true) = 'on' then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.used <> old.used then
    raise exception 'daily_stock.used is managed by place_order()/cancel_order()'
      using errcode = 'P0001';
  end if;
  if new.capacity < new.used then
    raise exception 'Capacity cannot be lower than the % already booked today', new.used
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists daily_stock_guard on daily_stock;
create trigger daily_stock_guard
  before update on daily_stock
  for each row execute function guard_daily_stock();

-- ------------------------------------------------- owner: set the day ------

-- Sets (or resets) today's unit pool. Owners call this each morning.
create or replace function set_daily_capacity(p_kitchen_slug text, p_capacity integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kitchen uuid;
begin
  select id into v_kitchen from kitchens where slug = p_kitchen_slug;
  if v_kitchen is null then
    raise exception 'Kitchen not found' using errcode = 'P0002';
  end if;
  if not (owns_kitchen(v_kitchen) or is_super_admin()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  perform set_config('spiceroute.allow_counter_write', 'on', true);
  insert into daily_stock (kitchen_id, service_date, capacity, used)
  values (v_kitchen, current_date, p_capacity, 0)
  on conflict (kitchen_id, service_date)
    do update set capacity = excluded.capacity;
end;
$$;

-- Today's pool for a kitchen: what every slot shows as remaining.
create or replace function today_stock(p_kitchen_slug text)
returns table (capacity integer, used integer, remaining integer)
language sql
stable
security definer
set search_path = public
as $$
  select s.capacity, s.used, greatest(0, s.capacity - s.used)
    from daily_stock s
    join kitchens k on k.id = s.kitchen_id
   where k.slug = p_kitchen_slug and s.service_date = current_date;
$$;

-- ---------------------------------------- place_order (pooled capacity) -----

-- Re-declared to gate on the shared daily pool instead of the slot's own cap.
-- The slot is still locked to allocate its sequence for the code.
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
  v_stock    daily_stock%rowtype;
  v_count    integer;
  v_total    integer := 0;
  v_sequence integer;
  v_code     text;
  v_ref      text;
  v_order_id uuid;
  v_line     jsonb;
  v_dish     dishes%rowtype;
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

  -- The authoritative check is against the shared daily pool, locked for update.
  select * into v_stock from daily_stock
   where kitchen_id = p_kitchen_id and service_date = current_date for update;
  if not found then
    raise exception 'The kitchen hasn''t opened orders for today yet'
      using errcode = 'P0001', hint = 'no_stock';
  end if;
  if v_stock.used + v_count > v_stock.capacity then
    raise exception 'Only % left today', greatest(0, v_stock.capacity - v_stock.used)
      using errcode = 'P0001', hint = 'sold_out';
  end if;

  -- Price from the dishes table; never trust client amounts.
  for v_line in select * from jsonb_array_elements(p_lines) loop
    select * into v_dish from dishes
     where id = (v_line ->> 'dish_id')::uuid and kitchen_id = p_kitchen_id;
    if not found then
      raise exception 'Dish % is not on this menu', v_line ->> 'dish_id' using errcode = 'P0002';
    end if;
    if not v_dish.available then
      raise exception 'Dish % is unavailable', v_dish.name using errcode = 'P0001';
    end if;
    v_total := v_total + v_dish.price * (v_line ->> 'quantity')::int;
  end loop;

  v_sequence := v_slot.last_sequence + 1;
  v_code := v_slot.digits || '-' || lpad(v_sequence::text, 2, '0');
  v_ref  := 'SR-' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');

  perform set_config('spiceroute.allow_counter_write', 'on', true);

  -- Draw from the shared pool, and advance this slot's sequence for the code.
  update daily_stock set used = used + v_count
   where kitchen_id = p_kitchen_id and service_date = current_date;
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

-- ------------------------------------------ cancel_order (pooled release) ----

create or replace function cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if v_order.status in ('completed', 'cancelled') then
    raise exception 'Order is already closed' using errcode = 'P0001';
  end if;

  perform set_config('spiceroute.allow_counter_write', 'on', true);

  -- Return the units to the shared pool and the slot's own tally.
  update daily_stock set used = greatest(0, used - v_order.item_count)
   where kitchen_id = v_order.kitchen_id
     and service_date = (select service_date from pickup_slots where id = v_order.slot_id);
  update pickup_slots set used = greatest(0, used - v_order.item_count)
   where id = v_order.slot_id;

  update orders set status = 'cancelled' where id = p_order_id;
end;
$$;

-- Pre-fill today's pool for the founder's kitchen so orders work immediately.
do $$
declare v_kitchen uuid;
begin
  select id into v_kitchen from kitchens where slug = 'nandhan-delight';
  if v_kitchen is not null then
    perform set_config('spiceroute.allow_counter_write', 'on', true);
    insert into daily_stock (kitchen_id, service_date, capacity, used)
    values (v_kitchen, current_date, 50, 0)
    on conflict (kitchen_id, service_date) do nothing;
  end if;
end $$;
