-- Nandhan Delight — lightweight in-app visit analytics.
--
-- RUN after schema.sql / policies.sql. Safe to re-run.
--
-- Powers a "views today" number on the owner Dashboard. A view is logged once
-- per app open (customers included, signed in or not). All access is through
-- the two SECURITY DEFINER functions below — clients never touch the table.

create table if not exists page_views (
  id bigint generated always as identity primary key,
  kitchen_id uuid references kitchens on delete cascade,
  -- Optional channel tag from a ?from= link (qr, whatsapp, poster …).
  source text,
  viewed_at timestamptz not null default now()
);

create index if not exists page_views_time_idx on page_views (viewed_at);
create index if not exists page_views_kitchen_idx on page_views (kitchen_id, viewed_at);

alter table page_views enable row level security;
-- No direct client policies: reads and writes go only through the RPCs.

-- Log one visit. Anyone may call it, including anonymous guests.
create or replace function log_visit(p_kitchen text default null, p_source text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kid uuid;
begin
  if p_kitchen is not null then
    select id into v_kid from kitchens where slug = p_kitchen;
  end if;
  insert into page_views (kitchen_id, source) values (v_kid, nullif(p_source, ''));
end;
$$;

grant execute on function log_visit(text, text) to anon, authenticated;

-- Visit counts for the owner Dashboard. "today" is since midnight IST.
-- Restricted to the kitchen's owner (or a super admin).
create or replace function visit_stats(p_kitchen text default null)
returns table (today integer, week integer, total integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kid uuid;
  v_day_start timestamptz := (date_trunc('day', now() at time zone 'Asia/Kolkata')) at time zone 'Asia/Kolkata';
begin
  if p_kitchen is not null then
    select id into v_kid from kitchens where slug = p_kitchen;
  end if;

  -- Authorisation: a kitchen's own owner, or a super admin.
  if v_kid is not null then
    if not (owns_kitchen(v_kid) or is_super_admin()) then
      raise exception 'Not allowed' using errcode = '42501';
    end if;
  elsif not is_super_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  return query
    select
      count(*) filter (where pv.viewed_at >= v_day_start)::int,
      count(*) filter (where pv.viewed_at >= now() - interval '7 days')::int,
      count(*)::int
    from page_views pv
    where v_kid is null or pv.kitchen_id = v_kid;
end;
$$;

grant execute on function visit_stats(text) to authenticated;
