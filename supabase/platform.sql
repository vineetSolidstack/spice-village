-- Spice Route — platform settings, signup wiring, and owner provisioning.
--
-- RUN FIFTH, after schema.sql → functions.sql → policies.sql → seed.sql.
-- Safe to re-run.
--
-- This is what makes the app multi-tenant rather than a single-device demo:
--   * settings live on the server, so one super-admin edit reaches every
--     customer instead of only the phone it was typed on,
--   * signing up creates a profile automatically,
--   * the super admin can create a kitchen and hand its owner an invite code,
--     without anyone needing the service_role key.

-- ------------------------------------------------- platform settings ------

-- Single-row table. `id` is constrained to true so a second row cannot exist.
create table if not exists platform_settings (
  id boolean primary key default true constraint one_row check (id),
  -- 'single' shows one cloud kitchen; 'marketplace' opens up every approved one.
  app_mode text not null default 'single' check (app_mode in ('single', 'marketplace')),
  -- The kitchen the app showcases while in single mode.
  showcase_kitchen_id uuid references kitchens on delete set null,
  updated_at timestamptz not null default now()
);

insert into platform_settings (id) values (true) on conflict (id) do nothing;

-- Point the showcase at the founder's kitchen if it isn't set yet.
update platform_settings
   set showcase_kitchen_id = (select id from kitchens where slug = 'nandhan-delight')
 where showcase_kitchen_id is null;

alter table platform_settings enable row level security;

-- Everyone reads settings (the customer app needs the mode before sign-in);
-- only a super admin writes them.
drop policy if exists "anyone reads platform settings" on platform_settings;
create policy "anyone reads platform settings" on platform_settings
  for select using (true);

drop policy if exists "super admin writes platform settings" on platform_settings;
create policy "super admin writes platform settings" on platform_settings
  for update using (is_super_admin()) with check (is_super_admin());

-- ------------------------------------------------------ signup wiring -----

-- Every auth user needs a profile row: orders, bookings, and kitchens all
-- reference it. Creating it in a trigger means signup "just works" rather than
-- failing later with a foreign-key error.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name)
  values (
    new.id,
    -- Prefer a name supplied at signup; fall back to the email's local part.
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  -- Everyone is a customer to begin with. Elevated roles are granted
  -- explicitly: super_admin by hand, kitchen_owner by claiming an invite.
  insert into user_roles (user_id, role) values (new.id, 'customer')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Backfill anyone who signed up before this trigger existed.
insert into profiles (id, full_name)
select u.id, coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), split_part(u.email, '@', 1))
  from auth.users u
 where not exists (select 1 from profiles p where p.id = u.id);

insert into user_roles (user_id, role)
select u.id, 'customer' from auth.users u
 where not exists (select 1 from user_roles r where r.user_id = u.id and r.role = 'customer');

-- --------------------------------------------------- owner provisioning ---

-- The super admin creates a kitchen and gets back a one-time code. The owner
-- signs up normally, enters the code, and becomes that kitchen's owner.
--
-- This deliberately avoids the service_role key: creating users from the client
-- would require shipping a key that bypasses every policy.
create table if not exists kitchen_invites (
  code text primary key,
  kitchen_id uuid not null references kitchens on delete cascade,
  created_by uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now(),
  claimed_by uuid references profiles on delete set null,
  claimed_at timestamptz
);

alter table kitchen_invites enable row level security;

drop policy if exists "super admin manages invites" on kitchen_invites;
create policy "super admin manages invites" on kitchen_invites
  for all using (is_super_admin()) with check (is_super_admin());

-- Creates the kitchen (owned by the super admin until claimed) and its invite.
create or replace function create_kitchen_invite(
  p_name text,
  p_cuisine text,
  p_area text
)
returns table (kitchen_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin   uuid := auth.uid();
  v_slug    text;
  v_kitchen uuid;
  v_code    text;
begin
  if not is_super_admin() then
    raise exception 'Only a super admin can create kitchens' using errcode = '42501';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Kitchen name is required' using errcode = '22023';
  end if;

  -- Slugify: lowercase, non-alphanumerics to hyphens, trimmed.
  v_slug := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  if exists (select 1 from kitchens where slug = v_slug) then
    v_slug := v_slug || '-' || substr(md5(random()::text), 1, 4);
  end if;

  insert into kitchens (slug, owner_id, name, cuisine, area, state, accepting_orders)
  values (v_slug, v_admin, trim(p_name), coalesce(nullif(trim(p_cuisine), ''), 'South Indian'),
          coalesce(nullif(trim(p_area), ''), 'Cloud kitchen'), 'approved', true)
  returning id into v_kitchen;

  -- Short, readable, unambiguous enough to read down a phone line.
  v_code := upper(substr(md5(random()::text), 1, 6));

  insert into kitchen_invites (code, kitchen_id, created_by)
  values (v_code, v_kitchen, v_admin);

  return query select v_kitchen, v_code;
end;
$$;

-- The new owner calls this after signing up.
create or replace function claim_kitchen_invite(p_code text)
returns table (kitchen_id uuid, kitchen_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_invite kitchen_invites%rowtype;
begin
  if v_user is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  select * into v_invite
    from kitchen_invites
   where code = upper(trim(p_code))
     for update;

  if not found then
    raise exception 'That invite code is not valid' using errcode = 'P0002';
  end if;
  if v_invite.claimed_by is not null then
    raise exception 'That invite code has already been used' using errcode = 'P0001';
  end if;

  update kitchens set owner_id = v_user where id = v_invite.kitchen_id;

  insert into user_roles (user_id, role) values (v_user, 'kitchen_owner')
  on conflict do nothing;

  update kitchen_invites
     set claimed_by = v_user, claimed_at = now()
   where code = v_invite.code;

  return query
    select k.id, k.name from kitchens k where k.id = v_invite.kitchen_id;
end;
$$;

-- --------------------------------------------------------- my roles -------

-- Convenience for the app: the caller's roles in one round trip.
create or replace function my_roles()
returns setof user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from user_roles where user_id = auth.uid();
$$;
