-- Legacy Hotshot Command Center
-- Stage 3: driver checklists, operational time logs, photo permissions, and optional GPS sharing.

begin;

do $$ begin
  create type public.driver_checklist_phase as enum ('pickup', 'delivery');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.driver_time_event_type as enum (
    'started_work',
    'en_route_to_pickup',
    'arrived_at_pickup',
    'departed_pickup',
    'fuel_stop',
    'break',
    'arrived_at_delivery',
    'departed_delivery',
    'finished_work'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.location_session_status as enum ('active', 'stopped', 'completed');
exception when duplicate_object then null;
end $$;

alter table public.loads
  add column if not exists driver_location_sharing_allowed boolean not null default true,
  add column if not exists location_last_updated_at timestamptz,
  add column if not exists location_last_latitude numeric(9,6),
  add column if not exists location_last_longitude numeric(9,6),
  add column if not exists location_accuracy_meters numeric(10,2);

create table if not exists public.load_checklist_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  load_id uuid not null references public.loads(id) on delete cascade,
  phase public.driver_checklist_phase not null,
  item_key text not null,
  label text not null,
  required boolean not null default true,
  sort_order integer not null default 0,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  unique(load_id, item_key)
);

create table if not exists public.driver_time_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  load_id uuid not null references public.loads(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  event_type public.driver_time_event_type not null,
  occurred_at timestamptz not null default now(),
  notes text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  created_at timestamptz not null default now()
);

create table if not exists public.location_sharing_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  load_id uuid not null references public.loads(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  status public.location_session_status not null default 'active',
  visibility text not null default 'city_state' check (visibility in ('exact', 'approximate', 'city_state', 'milestones_only')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  last_location_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists location_sessions_one_active_per_load
  on public.location_sharing_sessions(load_id)
  where status = 'active';

create table if not exists public.location_points (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  load_id uuid not null references public.loads(id) on delete cascade,
  session_id uuid not null references public.location_sharing_sessions(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  latitude numeric(9,6) not null,
  longitude numeric(9,6) not null,
  accuracy_meters numeric(10,2),
  recorded_at timestamptz not null default now()
);

create index if not exists checklist_load_phase_idx on public.load_checklist_items(load_id, phase, sort_order);
create index if not exists driver_time_events_load_idx on public.driver_time_events(load_id, occurred_at);
create index if not exists location_points_load_time_idx on public.location_points(load_id, recorded_at desc);

create or replace function public.seed_driver_checklist_for_load()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.load_checklist_items (company_id, load_id, phase, item_key, label, required, sort_order)
  values
    (new.company_id, new.id, 'pickup', 'confirm_pickup_location', 'Confirm pickup location and appointment', true, 10),
    (new.company_id, new.id, 'pickup', 'inspect_equipment', 'Inspect truck, trailer, straps, chains, and binders', true, 20),
    (new.company_id, new.id, 'pickup', 'confirm_freight', 'Confirm freight description, count, and weight', true, 30),
    (new.company_id, new.id, 'pickup', 'photo_before_loading', 'Photograph freight before loading', true, 40),
    (new.company_id, new.id, 'pickup', 'inspect_damage', 'Inspect and document existing damage', true, 50),
    (new.company_id, new.id, 'pickup', 'secure_load', 'Confirm freight is loaded and secured correctly', true, 60),
    (new.company_id, new.id, 'pickup', 'collect_bol', 'Collect or upload bill of lading', true, 70),
    (new.company_id, new.id, 'pickup', 'mark_loaded', 'Mark pickup complete and loaded', true, 80),
    (new.company_id, new.id, 'delivery', 'confirm_delivery_location', 'Confirm delivery location and appointment', true, 10),
    (new.company_id, new.id, 'delivery', 'confirm_arrival', 'Confirm arrival with the delivery contact', true, 20),
    (new.company_id, new.id, 'delivery', 'photo_before_unloading', 'Photograph freight before unloading when appropriate', false, 30),
    (new.company_id, new.id, 'delivery', 'confirm_recipient', 'Record recipient name and delivery time', true, 40),
    (new.company_id, new.id, 'delivery', 'collect_signature', 'Capture signature or signed proof of delivery', true, 50),
    (new.company_id, new.id, 'delivery', 'photo_completed_delivery', 'Photograph completed delivery when appropriate', false, 60),
    (new.company_id, new.id, 'delivery', 'document_concerns', 'Document damage, shortages, or delivery concerns', false, 70),
    (new.company_id, new.id, 'delivery', 'mark_delivered', 'Mark the load delivered', true, 80)
  on conflict (load_id, item_key) do nothing;
  return new;
end;
$$;

drop trigger if exists loads_seed_driver_checklist on public.loads;
create trigger loads_seed_driver_checklist
after insert on public.loads
for each row execute function public.seed_driver_checklist_for_load();

insert into public.load_checklist_items (company_id, load_id, phase, item_key, label, required, sort_order)
select load.company_id, load.id, template.phase::public.driver_checklist_phase, template.item_key, template.label, template.required, template.sort_order
from public.loads as load
cross join (values
  ('pickup', 'confirm_pickup_location', 'Confirm pickup location and appointment', true, 10),
  ('pickup', 'inspect_equipment', 'Inspect truck, trailer, straps, chains, and binders', true, 20),
  ('pickup', 'confirm_freight', 'Confirm freight description, count, and weight', true, 30),
  ('pickup', 'photo_before_loading', 'Photograph freight before loading', true, 40),
  ('pickup', 'inspect_damage', 'Inspect and document existing damage', true, 50),
  ('pickup', 'secure_load', 'Confirm freight is loaded and secured correctly', true, 60),
  ('pickup', 'collect_bol', 'Collect or upload bill of lading', true, 70),
  ('pickup', 'mark_loaded', 'Mark pickup complete and loaded', true, 80),
  ('delivery', 'confirm_delivery_location', 'Confirm delivery location and appointment', true, 10),
  ('delivery', 'confirm_arrival', 'Confirm arrival with the delivery contact', true, 20),
  ('delivery', 'photo_before_unloading', 'Photograph freight before unloading when appropriate', false, 30),
  ('delivery', 'confirm_recipient', 'Record recipient name and delivery time', true, 40),
  ('delivery', 'collect_signature', 'Capture signature or signed proof of delivery', true, 50),
  ('delivery', 'photo_completed_delivery', 'Photograph completed delivery when appropriate', false, 60),
  ('delivery', 'document_concerns', 'Document damage, shortages, or delivery concerns', false, 70),
  ('delivery', 'mark_delivered', 'Mark the load delivered', true, 80)
) as template(phase, item_key, label, required, sort_order)
on conflict (load_id, item_key) do nothing;

alter table public.load_checklist_items enable row level security;
alter table public.driver_time_events enable row level security;
alter table public.location_sharing_sessions enable row level security;
alter table public.location_points enable row level security;

create policy "Office or assigned driver reads checklist"
on public.load_checklist_items for select to authenticated
using (
  company_id = public.current_company_id()
  and (
    public.current_user_role() in ('owner', 'dispatcher')
    or exists (select 1 from public.loads where loads.id = load_id and loads.assigned_driver_id = auth.uid())
  )
);

create policy "Office or assigned driver updates checklist"
on public.load_checklist_items for update to authenticated
using (
  company_id = public.current_company_id()
  and (
    public.current_user_role() in ('owner', 'dispatcher')
    or exists (select 1 from public.loads where loads.id = load_id and loads.assigned_driver_id = auth.uid())
  )
)
with check (
  company_id = public.current_company_id()
  and (
    public.current_user_role() in ('owner', 'dispatcher')
    or exists (select 1 from public.loads where loads.id = load_id and loads.assigned_driver_id = auth.uid())
  )
);

create policy "Office or assigned driver reads time events"
on public.driver_time_events for select to authenticated
using (
  company_id = public.current_company_id()
  and (
    public.current_user_role() in ('owner', 'dispatcher')
    or driver_id = auth.uid()
  )
);

create policy "Office or assigned driver adds time events"
on public.driver_time_events for insert to authenticated
with check (
  company_id = public.current_company_id()
  and driver_id = auth.uid()
  and (
    public.current_user_role() in ('owner', 'dispatcher')
    or exists (select 1 from public.loads where loads.id = load_id and loads.assigned_driver_id = auth.uid())
  )
);

create policy "Office or assigned driver reads location sessions"
on public.location_sharing_sessions for select to authenticated
using (
  company_id = public.current_company_id()
  and (
    public.current_user_role() in ('owner', 'dispatcher')
    or driver_id = auth.uid()
  )
);

create policy "Office or assigned driver creates location sessions"
on public.location_sharing_sessions for insert to authenticated
with check (
  company_id = public.current_company_id()
  and driver_id = auth.uid()
  and (
    public.current_user_role() in ('owner', 'dispatcher')
    or exists (select 1 from public.loads where loads.id = load_id and loads.assigned_driver_id = auth.uid())
  )
);

create policy "Office or assigned driver updates location sessions"
on public.location_sharing_sessions for update to authenticated
using (
  company_id = public.current_company_id()
  and (
    public.current_user_role() in ('owner', 'dispatcher')
    or driver_id = auth.uid()
  )
)
with check (
  company_id = public.current_company_id()
  and (
    public.current_user_role() in ('owner', 'dispatcher')
    or driver_id = auth.uid()
  )
);

create policy "Office or assigned driver reads location points"
on public.location_points for select to authenticated
using (
  company_id = public.current_company_id()
  and (
    public.current_user_role() in ('owner', 'dispatcher')
    or driver_id = auth.uid()
  )
);

create policy "Assigned driver records location points"
on public.location_points for insert to authenticated
with check (
  company_id = public.current_company_id()
  and driver_id = auth.uid()
  and (
    public.current_user_role() in ('owner', 'dispatcher')
    or exists (select 1 from public.loads where loads.id = load_id and loads.assigned_driver_id = auth.uid())
  )
);

-- Replace the broad Stage 2 document policy with role-aware access.
drop policy if exists "Company members manage documents" on public.documents;

create policy "Office manages company documents"
on public.documents for all to authenticated
using (company_id = public.current_company_id() and public.current_user_role() in ('owner', 'dispatcher', 'finance'))
with check (company_id = public.current_company_id() and public.current_user_role() in ('owner', 'dispatcher', 'finance'));

create policy "Assigned drivers read load documents"
on public.documents for select to authenticated
using (
  company_id = public.current_company_id()
  and exists (select 1 from public.loads where loads.id = load_id and loads.assigned_driver_id = auth.uid())
);

create policy "Assigned drivers add load documents"
on public.documents for insert to authenticated
with check (
  company_id = public.current_company_id()
  and uploaded_by = auth.uid()
  and exists (select 1 from public.loads where loads.id = load_id and loads.assigned_driver_id = auth.uid())
);

-- Tighten private storage access for drivers while preserving office access.
drop policy if exists "Company members upload Legacy documents" on storage.objects;
drop policy if exists "Company members read Legacy documents" on storage.objects;
drop policy if exists "Owners and dispatch delete Legacy documents" on storage.objects;

create policy "Office uploads Legacy documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'legacy-documents'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.current_user_role() in ('owner', 'dispatcher', 'finance')
);

create policy "Office reads Legacy documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'legacy-documents'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.current_user_role() in ('owner', 'dispatcher', 'finance')
);

create policy "Office deletes Legacy documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'legacy-documents'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and public.current_user_role() in ('owner', 'dispatcher')
);

create policy "Assigned drivers upload load documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'legacy-documents'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and exists (
    select 1 from public.loads
    where loads.id::text = (storage.foldername(name))[2]
      and loads.assigned_driver_id = auth.uid()
  )
);

create policy "Assigned drivers read load documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'legacy-documents'
  and (storage.foldername(name))[1] = public.current_company_id()::text
  and exists (
    select 1 from public.loads
    where loads.id::text = (storage.foldername(name))[2]
      and loads.assigned_driver_id = auth.uid()
  )
);

create or replace function public.record_driver_location(
  requested_load_id uuid,
  requested_session_id uuid,
  requested_latitude numeric,
  requested_longitude numeric,
  requested_accuracy numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_load public.loads%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into target_load from public.loads where id = requested_load_id;
  if target_load.id is null then raise exception 'Load not found'; end if;
  if target_load.company_id <> public.current_company_id() then raise exception 'Access denied'; end if;
  if public.current_user_role() = 'driver' and target_load.assigned_driver_id <> auth.uid() then raise exception 'Load is not assigned to this driver'; end if;
  if not target_load.driver_location_sharing_allowed then raise exception 'Location sharing is disabled for this load'; end if;

  insert into public.location_points (company_id, load_id, session_id, driver_id, latitude, longitude, accuracy_meters)
  values (target_load.company_id, requested_load_id, requested_session_id, auth.uid(), requested_latitude, requested_longitude, requested_accuracy);

  update public.location_sharing_sessions
  set last_location_at = now()
  where id = requested_session_id and load_id = requested_load_id and driver_id = auth.uid() and status = 'active';

  update public.loads
  set location_last_updated_at = now(),
      location_last_latitude = requested_latitude,
      location_last_longitude = requested_longitude,
      location_accuracy_meters = requested_accuracy
  where id = requested_load_id;
end;
$$;

grant execute on function public.record_driver_location(uuid, uuid, numeric, numeric, numeric) to authenticated;

commit;
