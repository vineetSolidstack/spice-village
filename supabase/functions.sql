-- Spice Route — order creation, QR verification, and workshop booking.
--
-- Business rule #1 is enforced HERE, not in the client: "The server must
-- re-check remaining capacity inside order creation and reject if full —
-- client-side gating is UX only."

-- ------------------------------------------------------------ place_order --

-- Creates an order atomically:
--   * takes a row lock on the slot so concurrent checkouts serialise,
--   * re-checks remaining capacity and rejects if the order no longer fits,
--   * allocates the next per-slot sequence number,
--   * derives the slot code (`digits-seq`, e.g. '500-07') that doubles as the
--     QR payload.
--
-- `p_lines` is [{"dish_id": uuid, "quantity": int}, …].
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
  v_customer   uuid := auth.uid();
  v_slot       pickup_slots%rowtype;
  v_kitchen    kitchens%rowtype;
  v_count      integer;
  v_total      integer := 0;
  v_sequence   integer;
  v_code       text;
  v_ref        text;
  v_order_id   uuid;
  v_line       jsonb;
  v_dish       dishes%rowtype;
begin
  if v_customer is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Order is empty' using errcode = '22023';
  end if;

  select coalesce(sum((line ->> 'quantity')::int), 0)
    into v_count
    from jsonb_array_elements(p_lines) as line;

  if v_count <= 0 then
    raise exception 'Order is empty' using errcode = '22023';
  end if;

  select * into v_kitchen from kitchens where id = p_kitchen_id;
  if not found then
    raise exception 'Kitchen not found' using errcode = 'P0002';
  end if;
  if v_kitchen.state <> 'approved' then
    raise exception 'Kitchen is not accepting orders' using errcode = 'P0001';
  end if;
  if not v_kitchen.accepting_orders then
    raise exception 'Kitchen is currently closed' using errcode = 'P0001';
  end if;

  -- Serialise concurrent checkouts against this slot. Everything below runs
  -- with the row held, so two customers cannot both take the last cover.
  select * into v_slot
    from pickup_slots
   where id = p_slot_id and kitchen_id = p_kitchen_id
     for update;

  if not found then
    raise exception 'Pickup slot not found' using errcode = 'P0002';
  end if;

  -- The authoritative capacity check.
  if v_slot.used + v_count > v_slot.capacity then
    raise exception 'Slot % is full (% of % booked, % requested)',
      v_slot.time_label, v_slot.used, v_slot.capacity, v_count
      using errcode = 'P0001', hint = 'slot_full';
  end if;

  -- Price from the dishes table, never from client-supplied amounts.
  for v_line in select * from jsonb_array_elements(p_lines) loop
    select * into v_dish
      from dishes
     where id = (v_line ->> 'dish_id')::uuid
       and kitchen_id = p_kitchen_id;

    if not found then
      raise exception 'Dish % is not on this menu', v_line ->> 'dish_id' using errcode = 'P0002';
    end if;
    if not v_dish.available then
      raise exception 'Dish % is unavailable', v_dish.name using errcode = 'P0001';
    end if;

    v_total := v_total + v_dish.price * (v_line ->> 'quantity')::int;
  end loop;

  v_sequence := v_slot.last_sequence + 1;
  v_code     := v_slot.digits || '-' || lpad(v_sequence::text, 2, '0');
  v_ref      := 'SR-' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');

  -- Authorise the counter write for this transaction; the guard trigger on
  -- pickup_slots rejects any update to used/last_sequence without it.
  perform set_config('spiceroute.allow_counter_write', 'on', true);

  update pickup_slots
     set used = used + v_count,
         last_sequence = v_sequence
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

-- ---------------------------------------------------------- cancel_order --

-- Releases capacity back to the slot. `last_sequence` is deliberately NOT
-- rolled back: slot codes are handed to customers and must never be reissued.
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

  update pickup_slots
     set used = greatest(0, used - v_order.item_count)
   where id = v_order.slot_id;

  update orders set status = 'cancelled' where id = p_order_id;
end;
$$;

-- ------------------------------------------------------ verify_slot_code --

-- The kitchen-side QR scan. The scanner yields a bare slot code ('500-07');
-- this resolves it, scoped to the scanning owner's kitchen, and returns the
-- details staff need to hand the order over.
create or replace function verify_slot_code(p_kitchen_id uuid, p_slot_code text)
returns table (
  order_id     uuid,
  ref          text,
  slot_code    text,
  slot_time    text,
  status       order_status,
  customer     text,
  item_count   integer,
  total        integer,
  lines        jsonb
)
language sql
security definer
set search_path = public
as $$
  select o.id,
         o.ref,
         o.slot_code,
         s.time_label,
         o.status,
         p.full_name,
         o.item_count,
         o.total,
         coalesce(
           jsonb_agg(jsonb_build_object('name', l.dish_name, 'quantity', l.quantity))
             filter (where l.id is not null),
           '[]'::jsonb
         )
    from orders o
    join pickup_slots s on s.id = o.slot_id
    join profiles p on p.id = o.customer_id
    left join order_lines l on l.order_id = o.id
   where o.kitchen_id = p_kitchen_id
     and o.slot_code = p_slot_code
     and s.service_date = current_date
   group by o.id, s.time_label, p.full_name;
$$;

-- ---------------------------------------------------------- advance_order --

create or replace function advance_order(p_order_id uuid)
returns order_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status order_status;
  v_next   order_status;
begin
  select status into v_status from orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  v_next := case v_status
              when 'new' then 'preparing'
              when 'preparing' then 'ready'
              when 'ready' then 'completed'
              else null
            end;

  if v_next is null then
    raise exception 'Order is already %', v_status using errcode = 'P0001';
  end if;

  update orders
     set status = v_next,
         completed_at = case when v_next = 'completed' then now() else completed_at end
   where id = p_order_id;

  return v_next;
end;
$$;

-- ---------------------------------------------------------- book_workshop --

-- Same locking discipline as place_order, applied to session seats.
create or replace function book_workshop(
  p_session_id uuid,
  p_people integer,
  p_payment payment_mode
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer uuid := auth.uid();
  v_session  workshop_sessions%rowtype;
  v_price    integer;
  v_id       uuid;
begin
  if v_customer is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if p_people <= 0 then
    raise exception 'Participant count must be positive' using errcode = '22023';
  end if;

  select * into v_session from workshop_sessions where id = p_session_id for update;
  if not found then
    raise exception 'Session not found' using errcode = 'P0002';
  end if;

  if v_session.booked + p_people > v_session.capacity then
    raise exception 'Only % seats left', v_session.capacity - v_session.booked
      using errcode = 'P0001', hint = 'session_full';
  end if;

  select price into v_price from workshops where id = v_session.workshop_id;

  update workshop_sessions set booked = booked + p_people where id = p_session_id;

  insert into workshop_bookings (session_id, customer_id, people, payment, total)
  values (p_session_id, v_customer, p_people, p_payment, v_price * p_people)
  returning id into v_id;

  return v_id;
end;
$$;

-- ------------------------------------------------------- request_bulk_quote --

-- Bulk orders skip slots entirely — no capacity is consumed and no slot code
-- is issued. The kitchen prices the request by hand.
create or replace function request_bulk_quote(
  p_kitchen_id uuid,
  p_lines jsonb,
  p_delivery_date date,
  p_delivery_window text,
  p_contact_phone text,
  p_sides_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer uuid := auth.uid();
  v_id       uuid;
  v_ref      text;
  v_line     jsonb;
  v_dish     dishes%rowtype;
begin
  if v_customer is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Add units for at least one dish' using errcode = '22023';
  end if;
  if p_delivery_date < current_date then
    raise exception 'Delivery date is in the past' using errcode = '22023';
  end if;

  v_ref := 'BQ-' || lpad((floor(random() * 900) + 100)::int::text, 3, '0');

  insert into bulk_requests (ref, kitchen_id, customer_id, contact_phone,
                             delivery_date, delivery_window, sides_note)
  values (v_ref, p_kitchen_id, v_customer, p_contact_phone,
          p_delivery_date, p_delivery_window, p_sides_note)
  returning id into v_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    select * into v_dish
      from dishes
     where id = (v_line ->> 'dish_id')::uuid and kitchen_id = p_kitchen_id;
    if not found then
      raise exception 'Dish % is not on this menu', v_line ->> 'dish_id' using errcode = 'P0002';
    end if;

    insert into bulk_request_lines (request_id, dish_id, dish_name, units)
    values (v_id, v_dish.id, v_dish.name, (v_line ->> 'units')::int);
  end loop;

  return v_id;
end;
$$;
