-- Spice Route — kitchen applications (apply → approve → code appears in-app).
--
-- RUN SEVENTEENTH, after service_window.sql. Safe to re-run.
--
-- Flips who starts the owner-onboarding: instead of the super admin creating a
-- kitchen and handing a code out-of-band, a would-be owner APPLIES from their
-- own app with their details. The super admin sees the request and approves it;
-- approval creates the kitchen + invite code and stamps the code on the
-- application, so it appears in the applicant's own Profile. They then tap to
-- claim it (existing claim_kitchen_invite) and the kitchen portal unlocks.
--
-- No email/SMS: everything shows in-app.

create table if not exists kitchen_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references profiles on delete cascade,
  full_name   text not null,
  kitchen_name text not null,
  area        text not null,
  cuisine     text not null,
  phone       text not null,
  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'active', 'rejected')),
  invite_code text,                       -- set on approval
  kitchen_id  uuid references kitchens on delete set null, -- set on approval
  created_at  timestamptz not null default now(),
  decided_at  timestamptz
);

-- One live application per applicant (a partial unique index over open states).
create unique index if not exists one_open_application_per_user
  on kitchen_applications (applicant_id)
  where status in ('pending', 'approved');

alter table kitchen_applications enable row level security;

-- Applicants see their own; super admins see all.
drop policy if exists "read own or admin applications" on kitchen_applications;
create policy "read own or admin applications" on kitchen_applications
  for select using (applicant_id = auth.uid() or is_super_admin());

-- Applicants create their own; the RPC below is the supported path.
drop policy if exists "applicant inserts own application" on kitchen_applications;
create policy "applicant inserts own application" on kitchen_applications
  for insert with check (applicant_id = auth.uid());

-- Only the RPCs (security definer) move status; super admins may also update.
drop policy if exists "admin updates applications" on kitchen_applications;
create policy "admin updates applications" on kitchen_applications
  for update using (is_super_admin()) with check (is_super_admin());

-- --------------------------------------------------- applicant: submit -----

create or replace function submit_kitchen_application(
  p_full_name text,
  p_kitchen_name text,
  p_area text,
  p_cuisine text,
  p_phone text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id   uuid;
begin
  if v_user is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if coalesce(trim(p_kitchen_name), '') = '' or coalesce(trim(p_full_name), '') = '' then
    raise exception 'Name and kitchen name are required' using errcode = '22023';
  end if;
  if exists (
    select 1 from kitchen_applications
     where applicant_id = v_user and status in ('pending', 'approved')
  ) then
    raise exception 'You already have an application in progress' using errcode = 'P0001';
  end if;

  insert into kitchen_applications (applicant_id, full_name, kitchen_name, area, cuisine, phone)
  values (v_user, trim(p_full_name), trim(p_kitchen_name),
          coalesce(nullif(trim(p_area), ''), 'Cloud kitchen'),
          coalesce(nullif(trim(p_cuisine), ''), 'South Indian'),
          coalesce(trim(p_phone), ''))
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------- applicant: my application --

-- The caller's latest application (for the Profile state machine).
create or replace function my_kitchen_application()
returns table (
  id uuid, status text, kitchen_name text, invite_code text, created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select id, status, kitchen_name, invite_code, created_at
    from kitchen_applications
   where applicant_id = auth.uid()
   order by created_at desc
   limit 1;
$$;

-- ------------------------------------------------ super admin: pending -----

create or replace function pending_kitchen_applications()
returns setof kitchen_applications
language sql
stable
security definer
set search_path = public
as $$
  select * from kitchen_applications
   where status = 'pending'
   order by created_at;  -- oldest first, so nobody waits behind a newer one
$$;

-- ------------------------------------------------ super admin: approve -----

-- Approves an application: creates the kitchen (owned by the admin until the
-- applicant claims), mints an invite code, and stamps it on the application so
-- the applicant sees it in-app. Returns the code.
create or replace function approve_kitchen_application(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app     kitchen_applications%rowtype;
  v_admin   uuid := auth.uid();
  v_slug    text;
  v_kitchen uuid;
  v_code    text;
begin
  if not is_super_admin() then
    raise exception 'Only a super admin can approve' using errcode = '42501';
  end if;

  select * into v_app from kitchen_applications where id = p_id for update;
  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;
  if v_app.status <> 'pending' then
    raise exception 'Application is already %', v_app.status using errcode = 'P0001';
  end if;

  -- Slugify the proposed name; add a short suffix if it collides.
  v_slug := trim(both '-' from regexp_replace(lower(trim(v_app.kitchen_name)), '[^a-z0-9]+', '-', 'g'));
  if v_slug = '' then v_slug := 'kitchen'; end if;
  if exists (select 1 from kitchens where slug = v_slug) then
    v_slug := v_slug || '-' || substr(md5(random()::text), 1, 4);
  end if;

  insert into kitchens (slug, owner_id, name, cuisine, area, state, accepting_orders)
  values (v_slug, v_admin, v_app.kitchen_name, v_app.cuisine, v_app.area, 'approved', true)
  returning id into v_kitchen;

  v_code := upper(substr(md5(random()::text), 1, 6));
  insert into kitchen_invites (code, kitchen_id, created_by)
  values (v_code, v_kitchen, v_admin);

  update kitchen_applications
     set status = 'approved', invite_code = v_code, kitchen_id = v_kitchen, decided_at = now()
   where id = p_id;

  return v_code;
end;
$$;

-- ------------------------------------------------ super admin: reject ------

create or replace function reject_kitchen_application(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_super_admin() then
    raise exception 'Only a super admin can reject' using errcode = '42501';
  end if;
  update kitchen_applications
     set status = 'rejected', decided_at = now()
   where id = p_id and status = 'pending';
end;
$$;

-- When the applicant claims their code, mark the application active. This runs
-- as a small addition on top of claim_kitchen_invite via the app calling it,
-- but we also expose it so the status follows through server-side.
create or replace function mark_application_active(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update kitchen_applications
     set status = 'active'
   where applicant_id = auth.uid()
     and invite_code = upper(trim(p_code))
     and status = 'approved';
end;
$$;
