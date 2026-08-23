-- Nandhan Delight — persistent pickup slots.
--
-- RUN after schema.sql / policies.sql / tweaks.sql. Safe to re-run.
--
-- Problem this fixes: pickup_slots rows are scoped to a `service_date`, so a
-- time the owner created today vanished tomorrow and had to be re-added daily.
--
-- Fix: the owner now defines slot *templates* once (they persist). Each day the
-- app materialises that day's real pickup_slots row from the active templates —
-- so the per-day `used` count and the "reset to Order #1 each day" order codes
-- keep working exactly as before, while the owner never re-enters times.

-- ------------------------------------------------------- slot_templates ----

create table if not exists slot_templates (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references kitchens on delete cascade,
  -- Clock time as displayed, e.g. '5:00 pm'.
  time_label text not null,
  -- Digits derived from time_label, e.g. '500'.
  digits text not null check (digits ~ '^\d{3,4}$'),
  -- Soft-delete: a removed slot is deactivated (orders may still reference the
  -- per-day rows it produced), and simply stops materialising going forward.
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (kitchen_id, digits)
);

create index if not exists slot_templates_kitchen_idx
  on slot_templates (kitchen_id, active);

alter table slot_templates enable row level security;

drop policy if exists "browse slot templates of visible kitchens" on slot_templates;
create policy "browse slot templates of visible kitchens" on slot_templates
  for select using (
    exists (
      select 1 from kitchens k
       where k.id = slot_templates.kitchen_id
         and (k.state = 'approved' or k.owner_id = auth.uid() or is_super_admin())
    )
  );

drop policy if exists "owner manages own slot templates" on slot_templates;
create policy "owner manages own slot templates" on slot_templates
  for all using (owns_kitchen(kitchen_id)) with check (owns_kitchen(kitchen_id));

-- One-time backfill: seed templates from whatever slots already exist, so
-- kitchens that were set up before this migration keep their times.
insert into slot_templates (kitchen_id, time_label, digits)
select distinct on (kitchen_id, digits) kitchen_id, time_label, digits
  from pickup_slots
 order by kitchen_id, digits, service_date desc
on conflict (kitchen_id, digits) do nothing;

-- ------------------------------------------ ensure_todays_slots(kitchen) ----

-- Materialise today's pickup_slots rows for a kitchen from its active
-- templates. Idempotent — the unique(kitchen_id, service_date, digits)
-- constraint makes a second call a no-op. Called on every slot fetch.
create or replace function ensure_todays_slots(p_kitchen_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into pickup_slots (kitchen_id, time_label, digits, service_date, capacity)
  select t.kitchen_id, t.time_label, t.digits, current_date, 9999
    from slot_templates t
   where t.kitchen_id = p_kitchen_id
     and t.active
  on conflict (kitchen_id, service_date, digits) do nothing;
end;
$$;

grant execute on function ensure_todays_slots(uuid) to anon, authenticated;
