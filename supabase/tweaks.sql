-- Spice Route — launch tweaks: server-side cutoff + low-stock auto-push.
--
-- RUN NINETEENTH, after menu_control.sql. Safe to re-run.
--
--   1. place_order now enforces the daily cutoff on the SERVER (not just the
--      app), with a grace window that covers the 10-minute "last call". A late
--      order is genuinely refused.
--   2. A trigger auto-pushes "almost gone" when an item crosses a low-stock
--      threshold, to drive the final orders. Fire-and-forget; never breaks an
--      order if the push fails.

-- ---------------------------------------------- place_order (with cutoff) ---

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
  v_now_ist  time;
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

  -- Server-side cutoff: reject once we're past the cutoff + a 45-minute grace
  -- that covers the last-call window. Kitchen-local (IST) wall clock.
  if v_kitchen.order_cutoff is not null then
    v_now_ist := (now() at time zone 'Asia/Kolkata')::time;
    if v_now_ist > (v_kitchen.order_cutoff + interval '45 minutes')::time
       and v_now_ist > v_kitchen.order_cutoff then
      raise exception 'Pre-orders are closed for today'
        using errcode = 'P0001', hint = 'closed';
    end if;
  end if;

  select * into v_slot from pickup_slots
   where id = p_slot_id and kitchen_id = p_kitchen_id for update;
  if not found then
    raise exception 'Pickup slot not found' using errcode = 'P0002';
  end if;

  v_sequence := v_slot.last_sequence + 1;
  v_offset := 20 + (abs(hashtext(current_date::text || v_slot.id::text)) % 40);
  v_display := v_sequence + v_offset;
  v_code := v_slot.digits || '-' || lpad(v_display::text, 2, '0');
  v_ref  := 'SR-' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');

  perform set_config('spiceroute.allow_counter_write', 'on', true);

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

-- ------------------------------------------------ low-stock auto-push ------

-- Threshold at or below which a "almost gone" push fires (once, on crossing).
create or replace function notify_low_stock()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_dish      dishes%rowtype;
  v_threshold integer := 5;
  v_remaining integer := new.units - new.used;
  v_prev      integer := old.units - old.used;
  v_user      uuid;
begin
  -- Only when we cross DOWN to the threshold, and there's still something left.
  if v_remaining > 0 and v_remaining <= v_threshold and v_prev > v_threshold then
    select * into v_dish from dishes where id = new.dish_id;
    if found and v_dish.available and not v_dish.hidden then
      for v_user in
        select user_id from campaign_recipients(v_dish.kitchen_id, 'all'::campaign_audience)
      loop
        perform send_push(
          v_user,
          'Almost gone!',
          'Only ' || v_remaining || ' ' || v_dish.name || ' left today — order before it sells out.',
          jsonb_build_object('type', 'low_stock', 'dish_id', v_dish.id)
        );
      end loop;
    end if;
  end if;
  return new;
exception when others then
  -- A notification must never roll back the order that triggered it.
  return new;
end;
$$;

drop trigger if exists dish_stock_low on dish_daily_stock;
create trigger dish_stock_low
  after update on dish_daily_stock
  for each row execute function notify_low_stock();
