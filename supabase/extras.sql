-- Spice Route — menu categories, the bulk-ordering switch, and dish photos.
--
-- RUN SIXTH, after platform.sql. Safe to re-run.

-- ------------------------------------------------------ menu categories ---

-- Groups dishes into named sections on the storefront ("Tiffin", "Biryani",
-- "Desserts"). Null falls back to Combos / Meals.
alter table dishes add column if not exists category text;

-- ---------------------------------------------------- bulk-order switch ---

-- When false the whole bulk-quote feature disappears from the customer app for
-- this kitchen — the entry row, the screen, and the ability to submit.
alter table kitchens add column if not exists bulk_enabled boolean not null default true;

-- Minimum units before a bulk request is worth quoting.
alter table kitchens add column if not exists bulk_min_units integer not null default 20;

-- Optional guide price shown to the customer while they build the request.
-- Pricing is still negotiated; this only sets expectations.
alter table kitchens add column if not exists bulk_note text;

-- Which dishes may be ordered in bulk. Most kitchens can batch-cook only some
-- of the menu, so this is opt-in per dish rather than the whole list.
alter table dishes add column if not exists bulk_available boolean not null default true;

-- Per-dish bulk unit price. Null means "quote it by hand".
alter table dishes add column if not exists bulk_price integer check (bulk_price is null or bulk_price >= 0);

-- ------------------------------------------------------- dish photography -

-- Public bucket: menu photos are shown to anyone browsing, so they need no
-- signing. Writes are restricted to the owning kitchen below.
insert into storage.buckets (id, name, public)
values ('dish-photos', 'dish-photos', true)
on conflict (id) do nothing;

drop policy if exists "dish photos are public" on storage.objects;
create policy "dish photos are public" on storage.objects
  for select using (bucket_id = 'dish-photos');

-- Any signed-in kitchen owner or super admin may upload. Objects are keyed
-- <kitchen-slug>/<file>, so the folder is checked against kitchens they own.
drop policy if exists "owners upload dish photos" on storage.objects;
create policy "owners upload dish photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'dish-photos'
    and (
      is_super_admin()
      or exists (
        select 1 from kitchens k
         where k.owner_id = auth.uid()
           and k.slug = split_part(name, '/', 1)
      )
    )
  );

drop policy if exists "owners replace dish photos" on storage.objects;
create policy "owners replace dish photos" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'dish-photos'
    and (
      is_super_admin()
      or exists (
        select 1 from kitchens k
         where k.owner_id = auth.uid() and k.slug = split_part(name, '/', 1)
      )
    )
  );

drop policy if exists "owners delete dish photos" on storage.objects;
create policy "owners delete dish photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'dish-photos'
    and (
      is_super_admin()
      or exists (
        select 1 from kitchens k
         where k.owner_id = auth.uid() and k.slug = split_part(name, '/', 1)
      )
    )
  );

-- --------------------------------------------------------- push tokens ----

-- Expo push tokens, one row per device. Used to tell a customer their order is
-- ready and to alert the kitchen when an order lands.
create table if not exists push_tokens (
  token text primary key,
  user_id uuid not null references profiles on delete cascade,
  platform text,
  updated_at timestamptz not null default now()
);

alter table push_tokens enable row level security;

drop policy if exists "own push tokens" on push_tokens;
create policy "own push tokens" on push_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Seed the founder's kitchen with sensible bulk defaults.
update kitchens
   set bulk_enabled = true,
       bulk_min_units = 20,
       bulk_note = 'Parties, offices and events. Tell us what you need and we will price it.'
 where slug = 'nandhan-delight' and bulk_note is null;
