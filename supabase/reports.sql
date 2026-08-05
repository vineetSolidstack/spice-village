-- Spice Route — monthly sales report storage.
--
-- RUN TWENTY-FIRST, after loyalty.sql. Safe to re-run.
--
-- A private bucket the owner's app writes a month's PDF into, keyed
-- <slug>/<year>-<month>.pdf. The PDF itself is built on the device (expo-print)
-- from the month's orders and uploaded here so it's archived and re-downloadable.

insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;

drop policy if exists "owner reads reports" on storage.objects;
create policy "owner reads reports" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'reports'
    and (
      is_super_admin()
      or exists (select 1 from kitchens k where k.owner_id = auth.uid() and k.slug = split_part(name, '/', 1))
    )
  );

drop policy if exists "owner writes reports" on storage.objects;
create policy "owner writes reports" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'reports'
    and (
      is_super_admin()
      or exists (select 1 from kitchens k where k.owner_id = auth.uid() and k.slug = split_part(name, '/', 1))
    )
  );

drop policy if exists "owner updates reports" on storage.objects;
create policy "owner updates reports" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'reports'
    and (
      is_super_admin()
      or exists (select 1 from kitchens k where k.owner_id = auth.uid() and k.slug = split_part(name, '/', 1))
    )
  );
