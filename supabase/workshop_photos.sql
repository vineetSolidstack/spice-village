-- Spice Route — workshop cover photos.
--
-- RUN FOURTEENTH, after daily_stock.sql. Safe to re-run.
--
-- A public bucket for class cover photos. Objects are keyed <user-id>/<file>,
-- so an instructor can only write in their own folder.

insert into storage.buckets (id, name, public)
values ('workshop-photos', 'workshop-photos', true)
on conflict (id) do nothing;

drop policy if exists "workshop photos are public" on storage.objects;
create policy "workshop photos are public" on storage.objects
  for select using (bucket_id = 'workshop-photos');

drop policy if exists "instructors upload workshop photos" on storage.objects;
create policy "instructors upload workshop photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'workshop-photos' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "instructors replace workshop photos" on storage.objects;
create policy "instructors replace workshop photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'workshop-photos' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "instructors delete workshop photos" on storage.objects;
create policy "instructors delete workshop photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'workshop-photos' and split_part(name, '/', 1) = auth.uid()::text);

-- ------------------------------------------------- save a workshop ---------

-- Upserts a workshop and replaces its sessions in one call, so the instructor
-- editor persists to every customer. Runs as the caller (owns the workshop via
-- RLS on workshops/workshop_sessions).
--
-- p_sessions is [{"when_label": text, "capacity": int, "booked": int}, …].
create or replace function save_workshop(
  p_id uuid,
  p_title text,
  p_price integer,
  p_duration text,
  p_status text,
  p_image_url text,
  p_sessions jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id   uuid;
  v_s    jsonb;
begin
  if v_user is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  if p_id is null then
    insert into workshops (instructor_id, title, price, duration_label, status, hero_image_path)
    values (v_user, p_title, p_price, p_duration, p_status::workshop_status, p_image_url)
    returning id into v_id;
  else
    -- Only the owning instructor may edit (or a super admin).
    if not exists (
      select 1 from workshops w
       where w.id = p_id and (w.instructor_id = v_user or is_super_admin())
    ) then
      raise exception 'Not allowed to edit this workshop' using errcode = '42501';
    end if;
    update workshops
       set title = p_title, price = p_price, duration_label = p_duration,
           status = p_status::workshop_status, hero_image_path = p_image_url
     where id = p_id;
    v_id := p_id;
  end if;

  -- Replace the session set. Booked counts are carried in from the client
  -- (loaded from the DB when the editor opened), so they survive the round-trip.
  delete from workshop_sessions where workshop_id = v_id;
  for v_s in select * from jsonb_array_elements(coalesce(p_sessions, '[]'::jsonb)) loop
    insert into workshop_sessions (workshop_id, starts_at, when_label, capacity, booked)
    values (
      v_id,
      now(),  -- display uses when_label; starts_at is a sort key only.
      v_s ->> 'when_label',
      (v_s ->> 'capacity')::int,
      coalesce((v_s ->> 'booked')::int, 0)
    );
  end loop;

  return v_id;
end;
$$;
