-- Spice Route — stamp-card loyalty.
--
-- RUN TWENTIETH, after tweaks.sql. Safe to re-run.
--
-- Every customer earns 1 stamp per completed (picked-up) order. At the goal
-- (default 8) the card rolls over into 1 free-combo reward. The owner marks
-- which menu items may be taken as the free reward, so customers only ever
-- redeem items the kitchen chose. All state is server-side and the redemption
-- lowers the order total BEFORE payment, so a free item cannot be faked.

-- How many stamps make a reward (per kitchen).
alter table kitchens add column if not exists stamp_goal integer not null default 8
  check (stamp_goal between 1 and 50);

-- Which items customers may pick as the free reward.
alter table dishes add column if not exists reward_eligible boolean not null default false;

-- Marks an order that has already earned its one stamp (so paid + picked-up
-- never double-counts).
alter table orders add column if not exists stamped boolean not null default false;

-- One loyalty row per customer per kitchen.
create table if not exists loyalty (
  customer_id uuid not null references profiles on delete cascade,
  kitchen_id  uuid not null references kitchens on delete cascade,
  stamps      integer not null default 0 check (stamps >= 0),
  rewards     integer not null default 0 check (rewards >= 0),
  updated_at  timestamptz not null default now(),
  primary key (customer_id, kitchen_id)
);

alter table loyalty enable row level security;

-- Customers read their own card; the kitchen owner/super-admin can read all
-- (for stats). Writes happen only through the SECURITY DEFINER paths below.
drop policy if exists "read own or kitchen loyalty" on loyalty;
create policy "read own or kitchen loyalty" on loyalty
  for select using (
    customer_id = auth.uid() or owns_kitchen(kitchen_id) or is_super_admin()
  );

-- ------------------------------------- earn: 1 stamp per paid / picked-up ---

-- A stamp lands as soon as the order is genuinely earned — paid online, or
-- marked completed at pickup (covers pay-at-pickup). The `stamped` flag makes
-- it exactly once. BEFORE UPDATE so we can set the flag on the same row.
create or replace function grant_stamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_goal integer;
begin
  if not new.stamped
     and (new.payment_state = 'paid' or new.status = 'completed') then
    new.stamped := true;

    select stamp_goal into v_goal from kitchens where id = new.kitchen_id;
    v_goal := coalesce(v_goal, 8);

    insert into loyalty (customer_id, kitchen_id, stamps)
    values (new.customer_id, new.kitchen_id, 1)
    on conflict (customer_id, kitchen_id)
      do update set stamps = loyalty.stamps + 1, updated_at = now();

    -- Roll a full card over into a reward (carry any remainder).
    update loyalty
       set rewards = rewards + (stamps / v_goal),
           stamps  = stamps % v_goal
     where customer_id = new.customer_id
       and kitchen_id = new.kitchen_id
       and stamps >= v_goal;
  end if;
  return new;
end;
$$;

drop trigger if exists order_grants_stamp on orders;
create trigger order_grants_stamp
  before update on orders
  for each row execute function grant_stamp();

-- --------------------------------------------- read: my card ---------------

-- The signed-in customer's card for a kitchen (0 rewards/stamps if none yet).
create or replace function my_loyalty(p_kitchen_slug text)
returns table (stamps integer, rewards integer, goal integer)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(l.stamps, 0), coalesce(l.rewards, 0), k.stamp_goal
    from kitchens k
    left join loyalty l on l.kitchen_id = k.id and l.customer_id = auth.uid()
   where k.slug = p_kitchen_slug;
$$;

-- --------------------------------------------- redeem: free eligible item --

-- Applies one reward to a reserved (unpaid) order: the chosen item must be in
-- the order and marked reward_eligible, the customer must have a reward, and
-- the order total is lowered by one unit's price BEFORE the payment amount is
-- read. Returns the rupee value taken off.
create or replace function redeem_reward_to_order(p_order_id uuid, p_dish_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order   orders%rowtype;
  v_dish    dishes%rowtype;
  v_rewards integer;
  v_disc    integer;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found or v_order.customer_id <> auth.uid() then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if v_order.payment_state = 'paid' or v_order.status in ('completed', 'cancelled') then
    raise exception 'This order is already closed' using errcode = 'P0001';
  end if;

  select * into v_dish from dishes where id = p_dish_id and kitchen_id = v_order.kitchen_id;
  if not found or not v_dish.reward_eligible then
    raise exception 'That item is not a stamp reward' using errcode = 'P0001';
  end if;

  -- The free item must already be in the order.
  if not exists (select 1 from order_lines where order_id = p_order_id and dish_id = p_dish_id) then
    raise exception 'Add the free item to your order first' using errcode = 'P0001';
  end if;

  select rewards into v_rewards from loyalty
   where customer_id = auth.uid() and kitchen_id = v_order.kitchen_id;
  if coalesce(v_rewards, 0) < 1 then
    raise exception 'You have no free reward yet' using errcode = 'P0001';
  end if;

  v_disc := v_dish.price;  -- one unit free
  update orders set total = greatest(0, total - v_disc) where id = p_order_id;
  update loyalty set rewards = rewards - 1, updated_at = now()
   where customer_id = auth.uid() and kitchen_id = v_order.kitchen_id;

  return v_disc;
end;
$$;

-- --------------------------------------------- owner: loyalty at a glance --

-- Cards on the go and free combos currently owed. Owner / super-admin only;
-- returns zeros to anyone else (the owns_kitchen guard filters the rows).
create or replace function loyalty_stats(p_kitchen_slug text)
returns table (members integer, rewards_out integer)
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int, coalesce(sum(l.rewards), 0)::int
    from loyalty l
    join kitchens k on k.id = l.kitchen_id
   where k.slug = p_kitchen_slug
     and (owns_kitchen(k.id) or is_super_admin());
$$;
