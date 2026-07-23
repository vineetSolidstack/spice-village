-- Spice Route — push notification triggers.
--
-- RUN SEVENTH, after extras.sql. Safe to re-run.
--
-- Sends through Expo's push API directly from Postgres using pg_net, so there
-- is no server to deploy or keep running. Two moments matter:
--   * an order lands  → tell the kitchen owner,
--   * an order is ready → tell the customer.

create extension if not exists pg_net with schema extensions;

-- Posts one Expo push message per token. Fire-and-forget: pg_net queues the
-- request, so a slow or failing push never blocks the order transaction.
create or replace function send_push(p_user uuid, p_title text, p_body text, p_data jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
begin
  for v_token in select token from push_tokens where user_id = p_user loop
    perform net.http_post(
      url     := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object(
                   'Content-Type', 'application/json',
                   'Accept', 'application/json'
                 ),
      body    := jsonb_build_object(
                   'to', v_token,
                   'title', p_title,
                   'body', p_body,
                   'sound', 'default',
                   'channelId', 'orders',
                   'data', p_data
                 )
    );
  end loop;
exception when others then
  -- Never let a notification failure roll back the order it was reporting.
  raise warning 'send_push failed: %', sqlerrm;
end;
$$;

-- ----------------------------------------------------- new order → owner ---

create or replace function notify_new_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_name  text;
begin
  select k.owner_id, k.name into v_owner, v_name from kitchens k where k.id = new.kitchen_id;
  if v_owner is not null then
    perform send_push(
      v_owner,
      'New order · ' || new.slot_code,
      new.item_count || ' items · ₹' || new.total,
      jsonb_build_object('type', 'new_order', 'ref', new.ref, 'slot_code', new.slot_code)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_order_created on orders;
create trigger on_order_created
  after insert on orders
  for each row execute function notify_new_order();

-- ------------------------------------------------ status change → customer -

create or replace function notify_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kitchen text;
begin
  if new.status = old.status then
    return new;
  end if;

  select name into v_kitchen from kitchens where id = new.kitchen_id;

  -- Only the transitions a customer actually cares about.
  if new.status = 'ready' then
    perform send_push(
      new.customer_id,
      'Order ready for pickup',
      coalesce(v_kitchen, 'Your order') || ' · show slot code ' || new.slot_code || ' at the counter.',
      jsonb_build_object('type', 'order_ready', 'ref', new.ref, 'slot_code', new.slot_code)
    );
  elsif new.status = 'preparing' then
    perform send_push(
      new.customer_id,
      'Order’s simmering',
      coalesce(v_kitchen, 'Your kitchen') || ' has started cooking. We’ll ping you when it’s ready.',
      jsonb_build_object('type', 'order_preparing', 'ref', new.ref)
    );
  elsif new.status = 'completed' then
    perform send_push(
      new.customer_id,
      'Picked up — enjoy!',
      'Thanks for pre-ordering from ' || coalesce(v_kitchen, 'us') || '.',
      jsonb_build_object('type', 'order_completed', 'ref', new.ref)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_order_status_changed on orders;
create trigger on_order_status_changed
  after update of status on orders
  for each row execute function notify_order_status();

-- ------------------------------------------- bulk quote answered → customer -

create or replace function notify_bulk_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if new.status = 'quoted' then
    perform send_push(
      new.customer_id,
      'Your bulk quote is in',
      'Tap to review the price for ' || new.ref || '.',
      jsonb_build_object('type', 'bulk_quoted', 'ref', new.ref)
    );
  elsif new.status = 'declined' then
    perform send_push(
      new.customer_id,
      'Bulk request declined',
      'Sorry — we can’t take ' || new.ref || ' on that date.',
      jsonb_build_object('type', 'bulk_declined', 'ref', new.ref)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_bulk_status_changed on bulk_requests;
create trigger on_bulk_status_changed
  after update of status on bulk_requests
  for each row execute function notify_bulk_status();
