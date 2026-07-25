-- Spice Route — discount codes / coupons.
--
-- RUN TWELFTH, after compliance.sql. Safe to re-run.
--
-- Flow: the customer enters a code, the app previews the discount, and on
-- checkout apply_coupon_to_order() re-validates server-side and lowers the
-- order total BEFORE the Razorpay amount is read. So the discount can't be
-- forged from the client, and the customer pays the reduced amount.

do $$ begin
  create type discount_kind as enum ('percent', 'flat');
exception when duplicate_object then null; end $$;

create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references kitchens on delete cascade,
  -- Codes are case-insensitive; stored upper. Unique within a kitchen.
  code text not null,
  kind discount_kind not null,
  -- percent: 0–100. flat: rupees off.
  value integer not null check (value > 0),
  -- Only applies above this subtotal.
  min_order integer not null default 0 check (min_order >= 0),
  -- Optional ceiling on a percentage discount, in rupees.
  max_discount integer check (max_discount is null or max_discount > 0),
  -- Total redemptions allowed across all customers; null = unlimited.
  max_uses integer check (max_uses is null or max_uses > 0),
  used_count integer not null default 0,
  active boolean not null default true,
  expires_at date,
  created_at timestamptz not null default now(),
  unique (kitchen_id, code)
);

create index if not exists coupons_kitchen_idx on coupons (kitchen_id) where active;

alter table coupons enable row level security;

-- Owners manage their own codes. Customers never read the table directly; they
-- go through the validation functions, so a code list can't be scraped.
drop policy if exists "owners manage coupons" on coupons;
create policy "owners manage coupons" on coupons
  for all using (is_super_admin() or owns_kitchen(kitchen_id))
  with check (is_super_admin() or owns_kitchen(kitchen_id));

create table if not exists coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupons on delete cascade,
  order_id uuid not null references orders on delete cascade,
  customer_id uuid not null references profiles on delete cascade,
  discount integer not null,
  created_at timestamptz not null default now(),
  -- A coupon applies once per order.
  unique (order_id)
);

-- --------------------------------------------------- discount maths -------

-- Pure calculation shared by preview and apply. Returns 0 when the coupon
-- doesn't apply, so callers can treat 0 as "no discount".
create or replace function coupon_discount(c coupons, p_subtotal integer)
returns integer
language plpgsql
immutable
as $$
declare
  v integer;
begin
  if not c.active then return 0; end if;
  if c.expires_at is not null and c.expires_at < current_date then return 0; end if;
  if c.max_uses is not null and c.used_count >= c.max_uses then return 0; end if;
  if p_subtotal < c.min_order then return 0; end if;

  if c.kind = 'percent' then
    v := (p_subtotal * c.value) / 100;
    if c.max_discount is not null and v > c.max_discount then v := c.max_discount; end if;
  else
    v := c.value;
  end if;

  -- Never discount below zero.
  if v > p_subtotal then v := p_subtotal; end if;
  return greatest(0, v);
end;
$$;

-- ------------------------------------------------------- preview ----------

-- What the customer sees before paying: the discount and a reason if invalid.
create or replace function preview_coupon(p_kitchen_slug text, p_code text, p_subtotal integer)
returns table (valid boolean, discount integer, message text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_kitchen uuid;
  v_coupon  coupons%rowtype;
  v_disc    integer;
begin
  select id into v_kitchen from kitchens where slug = p_kitchen_slug;
  if v_kitchen is null then
    return query select false, 0, 'Kitchen not found'; return;
  end if;

  select * into v_coupon
    from coupons
   where kitchen_id = v_kitchen and code = upper(trim(p_code));

  if not found then
    return query select false, 0, 'That code isn’t valid'; return;
  end if;
  if not v_coupon.active then
    return query select false, 0, 'That code is no longer active'; return;
  end if;
  if v_coupon.expires_at is not null and v_coupon.expires_at < current_date then
    return query select false, 0, 'That code has expired'; return;
  end if;
  if v_coupon.max_uses is not null and v_coupon.used_count >= v_coupon.max_uses then
    return query select false, 0, 'That code has been fully used'; return;
  end if;
  if p_subtotal < v_coupon.min_order then
    return query select false, 0,
      'Spend ₹' || v_coupon.min_order || ' to use this code'; return;
  end if;

  v_disc := coupon_discount(v_coupon, p_subtotal);
  return query select true, v_disc, 'You save ₹' || v_disc;
end;
$$;

-- ------------------------------------------------------- apply ------------

-- Re-validates and applies the discount to a reserved order, atomically:
-- lowers the order total, records the redemption, bumps used_count. Runs before
-- the Razorpay amount is created, so the customer pays the discounted total.
create or replace function apply_coupon_to_order(p_order_id uuid, p_code text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order  orders%rowtype;
  v_coupon coupons%rowtype;
  v_disc   integer;
begin
  select * into v_order from orders where id = p_order_id and customer_id = auth.uid() for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if v_order.payment_state = 'paid' then
    raise exception 'Order is already paid' using errcode = 'P0001';
  end if;
  -- One coupon per order.
  if exists (select 1 from coupon_redemptions where order_id = p_order_id) then
    raise exception 'A code is already applied' using errcode = 'P0001';
  end if;

  select * into v_coupon
    from coupons
   where kitchen_id = v_order.kitchen_id and code = upper(trim(p_code))
     for update;
  if not found then
    raise exception 'That code isn’t valid' using errcode = 'P0002';
  end if;

  v_disc := coupon_discount(v_coupon, v_order.total);
  if v_disc <= 0 then
    raise exception 'That code can’t be applied to this order' using errcode = 'P0001';
  end if;

  update orders set total = total - v_disc where id = p_order_id;
  update coupons set used_count = used_count + 1 where id = v_coupon.id;
  insert into coupon_redemptions (coupon_id, order_id, customer_id, discount)
  values (v_coupon.id, p_order_id, auth.uid(), v_disc);

  return v_disc;
end;
$$;
