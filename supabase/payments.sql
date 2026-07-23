-- Spice Route — online payments (Razorpay / UPI).
--
-- RUN NINTH, after campaigns.sql. Safe to re-run.
--
-- The flow is reserve-then-pay:
--   1. place_order() reserves the pickup slot and creates the order as UNPAID.
--   2. The customer pays through Razorpay (UPI / card / netbanking).
--   3. A Supabase edge function verifies Razorpay's signature — server-side,
--      never in the app — and calls mark_order_paid().
--   4. If payment is abandoned, release_unpaid_order() frees the slot again.
--
-- Reserving first means slot capacity is honoured before money moves, so a
-- customer never pays for a slot that filled during checkout.

-- ------------------------------------------------------- order payment ----

do $$ begin
  create type payment_state as enum ('unpaid', 'pending', 'paid', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

alter table orders add column if not exists payment_state payment_state not null default 'unpaid';
-- Razorpay's ids, kept for reconciliation and refunds.
alter table orders add column if not exists razorpay_order_id text;
alter table orders add column if not exists razorpay_payment_id text;
alter table orders add column if not exists paid_at timestamptz;

-- A ledger row per attempt, so a disputed charge can always be traced.
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders on delete cascade,
  provider text not null default 'razorpay',
  razorpay_order_id text,
  razorpay_payment_id text,
  amount integer not null check (amount >= 0),
  state payment_state not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists payments_order_idx on payments (order_id);

alter table payments enable row level security;

drop policy if exists "read own or kitchen payments" on payments;
create policy "read own or kitchen payments" on payments
  for select using (
    exists (
      select 1 from orders o
       where o.id = payments.order_id
         and (o.customer_id = auth.uid() or owns_kitchen(o.kitchen_id) or is_super_admin())
    )
  );

-- ----------------------------------------------------- mark_order_paid ----

-- Called by the verify edge function (running as service_role) AFTER it has
-- checked Razorpay's HMAC signature. Never call this from the app: it trusts
-- its caller, so its only safe caller is the verified server path.
create or replace function mark_order_paid(
  p_order_id uuid,
  p_razorpay_order_id text,
  p_razorpay_payment_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update orders
     set payment_state = 'paid',
         razorpay_order_id = p_razorpay_order_id,
         razorpay_payment_id = p_razorpay_payment_id,
         paid_at = now()
   where id = p_order_id;

  update payments
     set state = 'paid', razorpay_payment_id = p_razorpay_payment_id
   where order_id = p_order_id;
end;
$$;

-- ------------------------------------------------ release_unpaid_order ----

-- Frees a reserved slot when the customer abandons payment. Only touches
-- orders that never got paid, and reuses the capacity-release logic.
create or replace function release_unpaid_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state payment_state;
begin
  select payment_state into v_state from orders where id = p_order_id and customer_id = auth.uid();
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if v_state = 'paid' then
    -- Never cancel a paid order from here; refunds are a separate, manual path.
    return;
  end if;

  -- cancel_order releases the slot capacity and marks the order cancelled.
  perform cancel_order(p_order_id);
  update orders set payment_state = 'failed' where id = p_order_id;
end;
$$;

-- --------------------------------------------- sweep abandoned orders -----

-- Belt and braces: release anything left pending for over 20 minutes, so a
-- customer who closes the app mid-payment doesn't hold a slot forever.
create or replace function sweep_abandoned_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
  v_count integer := 0;
begin
  for v_order in
    select * from orders
     where payment_state in ('unpaid', 'pending')
       and status <> 'cancelled'
       and placed_at < now() - interval '20 minutes'
  loop
    perform cancel_order(v_order.id);
    update orders set payment_state = 'failed' where id = v_order.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('spiceroute-sweep')
      where exists (select 1 from cron.job where jobname = 'spiceroute-sweep');
    perform cron.schedule('spiceroute-sweep', '*/5 * * * *', 'select sweep_abandoned_orders()');
  else
    raise notice 'pg_cron not installed — abandoned orders will not be swept automatically.';
  end if;
exception when others then
  raise notice 'Could not schedule the abandoned-order sweep: %', sqlerrm;
end $$;
