-- Spice Route — storage upload fix.
--
-- RUN any time after extras.sql + workshop_photos.sql. Safe to re-run.
--
-- Why: dish/workshop photo uploads were rejected because the insert policy only
-- allowed the kitchen's OWNER (kitchens.owner_id = auth.uid()). When you test as
-- the super-admin — or before owner_id is set — the upload fails with a vague
-- "could not be uploaded". This widens the policy to owner OR super-admin, and
-- re-creates the buckets in case they were never made.

-- Buckets (idempotent).
insert into storage.buckets (id, name, public)
values ('dish-photos', 'dish-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('workshop-photos', 'workshop-photos', true)
on conflict (id) do nothing;

-- ------------------------------------------------------ dish photos --------

drop policy if exists "dish photos are public" on storage.objects;
create policy "dish photos are public" on storage.objects
  for select using (bucket_id = 'dish-photos');

-- Insert/replace/delete allowed for the kitchen's owner OR any super-admin.
drop policy if exists "owners upload dish photos" on storage.objects;
create policy "owners upload dish photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'dish-photos'
    and (
      is_super_admin()
      or exists (
        select 1 from kitchens k
         where k.owner_id = auth.uid() and k.slug = split_part(name, '/', 1)
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

-- --------------------------------------------------- workshop photos -------

drop policy if exists "workshop photos are public" on storage.objects;
create policy "workshop photos are public" on storage.objects
  for select using (bucket_id = 'workshop-photos');

-- Keyed <user-id>/<file>; the instructor writes their own folder, super-admin any.
drop policy if exists "instructors upload workshop photos" on storage.objects;
create policy "instructors upload workshop photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'workshop-photos'
    and (is_super_admin() or split_part(name, '/', 1) = auth.uid()::text)
  );

drop policy if exists "instructors replace workshop photos" on storage.objects;
create policy "instructors replace workshop photos" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'workshop-photos'
    and (is_super_admin() or split_part(name, '/', 1) = auth.uid()::text)
  );

drop policy if exists "instructors delete workshop photos" on storage.objects;
create policy "instructors delete workshop photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'workshop-photos'
    and (is_super_admin() or split_part(name, '/', 1) = auth.uid()::text)
  );
