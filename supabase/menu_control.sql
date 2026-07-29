-- Spice Route — menu control: hide items, availability-aware total, daily codes.
--
-- RUN EIGHTEENTH, after kitchen_applications.sql. Safe to re-run.
--
-- Three owner-facing changes:
--   1. dishes.hidden — "taken out" items vanish from the customer app entirely
--      (distinct from `available`, which just greys them as "not available today").
--   2. today_stock now only counts items that are ON (available) and not hidden,
--      so switching an item off shrinks the day's total.
--   3. Order codes shift each day: the printed number starts at a per-slot,
--      per-day random offset (500-47, 500-48 …), so nobody can guess the next
--      code or the order count — but the true sequence is stored on the order,
--      so scanning still tells the kitchen "this is order #1".

-- 1. Taken-out flag. Hidden items still exist for the owner; customers never see them.
alter table dishes add column if not exists hidden boolean not null default false;

-- 2. Day total = sum of units for items that are available AND not hidden.
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
   where k.slug = p_kitchen_slug
     and d.daily_units is not null
     and d.available
     and not d.hidden;
$$;

-- 3. place_order with a daily-shifting printed code. The real position is still
--    stored in orders.sequence; only the printed number is offset.
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
  v_offset   integer;
  v_display  integer;
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

  -- True position (1, 2, 3 …) — this is what the kitchen sees when scanning.
  v_sequence := v_slot.last_sequence + 1;
  -- Per-slot, per-day offset in [20, 59]. Deterministic for the day, different
  -- each day and each slot, so the printed number can't be guessed.
  v_offset := 20 + (abs(hashtext(current_date::text || v_slot.id::text)) % 40);
  v_display := v_sequence + v_offset;
  v_code := v_slot.digits || '-' || lpad(v_display::text, 2, '0');
  v_ref  := 'SR-' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');

  perform set_config('spiceroute.allow_counter_write', 'on', true);

  -- Validate + draw down each line against its own item stock, under a row lock.
  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_qty := (v_line ->> 'quantity')::int;
    select * into v_dish from dishes
     where id = (v_line ->> 'dish_id')::uuid and kitchen_id = p_kitchen_id;
    if not found then
      raise exception 'Dish % is not on this menu', v_line ->> 'dish_id' using errcode = 'P0002';
    end if;
    if not v_dish.available or v_dish.hidden then
      raise exception 'Dish % is unavailable', v_dish.name using errcode = 'P0001';
    end if;
    v_total := v_total + v_dish.price * v_qty;

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

  -- sequence stores the TRUE position; slot_code carries the shifted printed code.
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
