-- Spice Route — broadcast campaigns.
--
-- RUN EIGHTH, after notifications.sql. Safe to re-run.
--
-- Lets an owner write a message once — a new menu, an offer, a festival
-- special — and push it to a chosen audience, now or at a scheduled time.
--
-- Two things are deliberate:
--   * customers can opt out of marketing, and opting out is honoured here
--     rather than in the app, so it cannot be bypassed by a client;
--   * order updates are NOT marketing and always send. Someone who turned off
--     offers still hears that their food is ready.

-- ------------------------------------------------------------- opt-out ----

alter table profiles add column if not exists marketing_opt_in boolean not null default true;

-- --------------------------------------------------------- campaigns ------

do $$ begin
  create type campaign_audience as enum ('all', 'my_customers', 'lapsed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type campaign_status as enum ('draft', 'scheduled', 'sending', 'sent', 'failed');
exception when duplicate_object then null; end $$;

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid references kitchens on delete cascade,
  created_by uuid not null references profiles on delete cascade,
  title text not null check (length(trim(title)) > 0),
  body text not null check (length(trim(body)) > 0),
  audience campaign_audience not null default 'my_customers',
  status campaign_status not null default 'draft',
  -- When set and status = 'scheduled', the dispatcher sends at this time.
  scheduled_at timestamptz,
  sent_at timestamptz,
  -- How many devices it actually went to; useful for judging reach.
  sent_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists campaigns_kitchen_idx on campaigns (kitchen_id, created_at desc);
create index if not exists campaigns_due_idx on campaigns (scheduled_at)
  where status = 'scheduled';

alter table campaigns enable row level security;

drop policy if exists "owners manage own campaigns" on campaigns;
create policy "owners manage own campaigns" on campaigns
  for all
  using (is_super_admin() or owns_kitchen(kitchen_id))
  with check (is_super_admin() or owns_kitchen(kitchen_id));

-- --------------------------------------------------------- audience -------

-- Resolves an audience to the profiles that should receive it. Marketing
-- opt-out is applied here, so every send path respects it.
create or replace function campaign_recipients(p_kitchen uuid, p_audience campaign_audience)
returns table (user_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select p.id
    from profiles p
   where p.marketing_opt_in
     and exists (select 1 from push_tokens t where t.user_id = p.id)
     and (
       p_audience = 'all'
       or (
         p_audience = 'my_customers'
         and exists (
           select 1 from orders o
            where o.customer_id = p.id
              and (p_kitchen is null or o.kitchen_id = p_kitchen)
         )
       )
       or (
         -- Ordered once, but not in the last 30 days.
         p_audience = 'lapsed'
         and exists (
           select 1 from orders o
            where o.customer_id = p.id
              and (p_kitchen is null or o.kitchen_id = p_kitchen)
         )
         and not exists (
           select 1 from orders o
            where o.customer_id = p.id
              and (p_kitchen is null or o.kitchen_id = p_kitchen)
              and o.placed_at > now() - interval '30 days'
         )
       )
     );
$$;

/** How many people a campaign would reach — shown before sending. */
create or replace function campaign_reach(p_kitchen uuid, p_audience campaign_audience)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from campaign_recipients(p_kitchen, p_audience);
$$;

-- ------------------------------------------------------------- sending ----

create or replace function send_campaign(p_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign campaigns%rowtype;
  v_user     uuid;
  v_count    integer := 0;
begin
  select * into v_campaign from campaigns where id = p_id for update;
  if not found then
    raise exception 'Campaign not found' using errcode = 'P0002';
  end if;

  -- Only the owning kitchen or a super admin may send it.
  if not (is_super_admin() or owns_kitchen(v_campaign.kitchen_id)) then
    raise exception 'Not allowed to send this campaign' using errcode = '42501';
  end if;

  if v_campaign.status = 'sent' then
    raise exception 'That campaign has already been sent' using errcode = 'P0001';
  end if;

  update campaigns set status = 'sending' where id = p_id;

  for v_user in
    select user_id from campaign_recipients(v_campaign.kitchen_id, v_campaign.audience)
  loop
    perform send_push(
      v_user,
      v_campaign.title,
      v_campaign.body,
      jsonb_build_object('type', 'campaign', 'campaign_id', v_campaign.id)
    );
    v_count := v_count + 1;
  end loop;

  update campaigns
     set status = 'sent', sent_at = now(), sent_count = v_count
   where id = p_id;

  return v_count;
end;
$$;

-- --------------------------------------------------------- scheduling -----

-- Sends anything whose scheduled time has passed. Runs under the scheduler, so
-- it bypasses the ownership check that send_campaign applies to interactive
-- callers — the campaign was already authorised when it was scheduled.
create or replace function dispatch_due_campaigns()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign campaigns%rowtype;
  v_user     uuid;
  v_count    integer;
  v_total    integer := 0;
begin
  for v_campaign in
    select * from campaigns
     where status = 'scheduled' and scheduled_at is not null and scheduled_at <= now()
     order by scheduled_at
     limit 20
  loop
    update campaigns set status = 'sending' where id = v_campaign.id;
    v_count := 0;

    for v_user in
      select user_id from campaign_recipients(v_campaign.kitchen_id, v_campaign.audience)
    loop
      perform send_push(
        v_user, v_campaign.title, v_campaign.body,
        jsonb_build_object('type', 'campaign', 'campaign_id', v_campaign.id)
      );
      v_count := v_count + 1;
    end loop;

    update campaigns
       set status = 'sent', sent_at = now(), sent_count = v_count
     where id = v_campaign.id;

    v_total := v_total + v_count;
  end loop;

  return v_total;
end;
$$;

-- Run the dispatcher every minute if pg_cron is available. Supabase enables it
-- from the Database → Extensions page; without it, scheduled campaigns simply
-- wait until something calls dispatch_due_campaigns().
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('spiceroute-campaigns')
      where exists (select 1 from cron.job where jobname = 'spiceroute-campaigns');
    perform cron.schedule('spiceroute-campaigns', '* * * * *', 'select dispatch_due_campaigns()');
  else
    raise notice 'pg_cron not installed — enable it to send scheduled campaigns automatically.';
  end if;
exception when others then
  raise notice 'Could not schedule the campaign dispatcher: %', sqlerrm;
end $$;
