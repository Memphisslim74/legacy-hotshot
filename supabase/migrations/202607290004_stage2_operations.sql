-- Legacy Hotshot Command Center
-- Stage 2: customers, load requests, quotes, loads, status history, and documents.

create type public.load_request_status as enum ('received','reviewing','quoted','converted','declined','cancelled');
create type public.quote_status as enum ('draft','sent','approved','declined','expired','converted');
create type public.load_status as enum ('request_received','reviewing','quoted','booked','driver_assigned','en_route_to_pickup','arrived_at_pickup','loaded','in_transit','delayed','arrived_at_delivery','delivered','pod_received','invoice_sent','paid','cancelled');
create type public.document_type as enum ('rate_confirmation','bill_of_lading','proof_of_delivery','freight_photo','securement_photo','receipt','invoice','insurance','driver_record','vehicle_record','permit','other');

alter table public.companies add column if not exists public_slug text;
update public.companies set public_slug = 'legacy-hotshot' where public_slug is null;
create unique index if not exists companies_public_slug_idx on public.companies(public_slug);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  company_name text not null,
  primary_contact text,
  email text,
  phone text,
  billing_contact text,
  billing_email text,
  billing_address text,
  payment_terms text not null default 'Net 30',
  communication_preference text not null default 'email',
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.load_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  request_number text not null,
  customer_id uuid references public.customers(id) on delete set null,
  requester_company text,
  requester_name text not null,
  requester_email text not null,
  requester_phone text,
  pickup_company text,
  pickup_address text not null,
  pickup_city text not null,
  pickup_state text not null,
  pickup_postal_code text,
  pickup_contact text,
  pickup_phone text,
  pickup_date date,
  pickup_time_window text,
  pickup_method text,
  pickup_instructions text,
  delivery_company text,
  delivery_address text not null,
  delivery_city text not null,
  delivery_state text not null,
  delivery_postal_code text,
  delivery_contact text,
  delivery_phone text,
  delivery_date date,
  delivery_time_window text,
  unloading_method text,
  delivery_instructions text,
  freight_description text not null,
  pieces integer,
  estimated_weight numeric(12,2),
  dimensions text,
  equipment_requirements text,
  tarping_requirements text,
  securement_requirements text,
  declared_value numeric(12,2),
  reference_number text,
  additional_instructions text,
  status public.load_request_status not null default 'received',
  public_token uuid not null default gen_random_uuid(),
  missing_fields text[] not null default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, request_number),
  unique(public_token)
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  load_request_id uuid not null references public.load_requests(id) on delete cascade,
  quote_number text not null,
  estimated_mileage numeric(10,1),
  base_rate numeric(12,2) not null default 0,
  fuel_surcharge numeric(12,2) not null default 0,
  tarping_charge numeric(12,2) not null default 0,
  additional_services numeric(12,2) not null default 0,
  total_amount numeric(12,2) generated always as (base_rate + fuel_surcharge + tarping_charge + additional_services) stored,
  detention_terms text,
  payment_terms text not null default 'Net 30',
  expires_at timestamptz,
  notes text,
  status public.quote_status not null default 'draft',
  public_token uuid not null default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, quote_number),
  unique(public_token)
);

create table public.loads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  load_number text not null,
  customer_id uuid references public.customers(id) on delete set null,
  load_request_id uuid references public.load_requests(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  assigned_driver_id uuid references public.profiles(id) on delete set null,
  status public.load_status not null default 'booked',
  pickup_company text,
  pickup_address text not null,
  pickup_city text not null,
  pickup_state text not null,
  pickup_contact text,
  pickup_phone text,
  pickup_at timestamptz,
  pickup_instructions text,
  delivery_company text,
  delivery_address text not null,
  delivery_city text not null,
  delivery_state text not null,
  delivery_contact text,
  delivery_phone text,
  delivery_at timestamptz,
  delivery_instructions text,
  freight_description text not null,
  pieces integer,
  estimated_weight numeric(12,2),
  dimensions text,
  equipment_requirements text,
  securement_requirements text,
  customer_rate numeric(12,2) not null default 0,
  driver_pay numeric(12,2) not null default 0,
  estimated_fuel numeric(12,2) not null default 0,
  additional_expenses numeric(12,2) not null default 0,
  loaded_miles numeric(10,1) not null default 0,
  deadhead_miles numeric(10,1) not null default 0,
  current_eta timestamptz,
  internal_notes text,
  customer_visible_notes text,
  tracking_token uuid not null default gen_random_uuid(),
  tracking_visibility text not null default 'city_state',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, load_number),
  unique(tracking_token)
);

create table public.load_status_history (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  load_id uuid not null references public.loads(id) on delete cascade,
  status public.load_status not null,
  note text,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  load_id uuid references public.loads(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  type public.document_type not null default 'other',
  file_name text not null,
  storage_path text not null,
  mime_type text,
  file_size bigint,
  customer_visible boolean not null default false,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index customers_company_name_idx on public.customers(company_id, company_name);
create index load_requests_company_status_idx on public.load_requests(company_id, status, created_at desc);
create index quotes_company_status_idx on public.quotes(company_id, status, created_at desc);
create index loads_company_status_idx on public.loads(company_id, status, created_at desc);
create index load_status_history_load_idx on public.load_status_history(load_id, created_at desc);
create index documents_company_load_idx on public.documents(company_id, load_id, created_at desc);

create trigger customers_set_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger load_requests_set_updated_at before update on public.load_requests for each row execute function public.set_updated_at();
create trigger quotes_set_updated_at before update on public.quotes for each row execute function public.set_updated_at();
create trigger loads_set_updated_at before update on public.loads for each row execute function public.set_updated_at();

alter table public.customers enable row level security;
alter table public.load_requests enable row level security;
alter table public.quotes enable row level security;
alter table public.loads enable row level security;
alter table public.load_status_history enable row level security;
alter table public.documents enable row level security;

create policy "Company members manage customers" on public.customers for all to authenticated
using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy "Company members manage load requests" on public.load_requests for all to authenticated
using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy "Company members manage quotes" on public.quotes for all to authenticated
using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());
create policy "Company members read loads" on public.loads for select to authenticated
using (company_id = public.current_company_id() and (public.current_user_role() <> 'driver' or assigned_driver_id = auth.uid()));
create policy "Owners and dispatch manage loads" on public.loads for all to authenticated
using (company_id = public.current_company_id() and public.current_user_role() in ('owner','dispatcher'))
with check (company_id = public.current_company_id() and public.current_user_role() in ('owner','dispatcher'));
create policy "Assigned drivers update loads" on public.loads for update to authenticated
using (company_id = public.current_company_id() and assigned_driver_id = auth.uid())
with check (company_id = public.current_company_id() and assigned_driver_id = auth.uid());
create policy "Company members read load history" on public.load_status_history for select to authenticated
using (company_id = public.current_company_id());
create policy "Company members add load history" on public.load_status_history for insert to authenticated
with check (company_id = public.current_company_id());
create policy "Company members manage documents" on public.documents for all to authenticated
using (company_id = public.current_company_id()) with check (company_id = public.current_company_id());

create or replace function public.next_legacy_number(prefix text, source_table regclass)
returns text language plpgsql security definer set search_path = public as $$
declare next_value bigint;
begin
  execute format('select coalesce(max(nullif(regexp_replace(%I, ''\D'', '''', ''g''), '''')::bigint), 1000) + 1 from %s where company_id = $1',
    case when prefix = 'LHR' then 'request_number' when prefix = 'LHQ' then 'quote_number' else 'load_number' end,
    source_table)
  into next_value using public.current_company_id();
  return prefix || '-' || next_value::text;
end;
$$;

create or replace function public.submit_public_load_request(requested_company_slug text, requested_payload jsonb)
returns table(request_number text, public_token uuid)
language plpgsql security definer set search_path = public as $$
declare target_company uuid; new_number text; new_token uuid; missing text[] := '{}';
begin
  select id into target_company from public.companies where public_slug = requested_company_slug and status = 'active';
  if target_company is null then raise exception 'Company not found'; end if;
  if nullif(trim(requested_payload->>'requesterName'),'') is null then raise exception 'Contact name is required'; end if;
  if nullif(trim(requested_payload->>'requesterEmail'),'') is null then raise exception 'Email is required'; end if;
  if nullif(trim(requested_payload->>'pickupAddress'),'') is null then raise exception 'Pickup address is required'; end if;
  if nullif(trim(requested_payload->>'deliveryAddress'),'') is null then raise exception 'Delivery address is required'; end if;
  if nullif(trim(requested_payload->>'freightDescription'),'') is null then raise exception 'Freight description is required'; end if;
  if nullif(trim(requested_payload->>'estimatedWeight'),'') is null then missing := array_append(missing,'Weight not provided'); end if;
  if nullif(trim(requested_payload->>'dimensions'),'') is null then missing := array_append(missing,'Dimensions missing'); end if;
  if nullif(trim(requested_payload->>'pickupTimeWindow'),'') is null then missing := array_append(missing,'Pickup appointment not confirmed'); end if;
  if nullif(trim(requested_payload->>'deliveryContact'),'') is null then missing := array_append(missing,'Delivery contact missing'); end if;
  select 'LHR-' || (coalesce(max(nullif(regexp_replace(request_number,'\D','','g'),'')::bigint),1000)+1)::text into new_number from public.load_requests where company_id = target_company;
  insert into public.load_requests (
    company_id, request_number, requester_company, requester_name, requester_email, requester_phone,
    pickup_company, pickup_address, pickup_city, pickup_state, pickup_postal_code, pickup_contact, pickup_phone, pickup_date, pickup_time_window, pickup_method, pickup_instructions,
    delivery_company, delivery_address, delivery_city, delivery_state, delivery_postal_code, delivery_contact, delivery_phone, delivery_date, delivery_time_window, unloading_method, delivery_instructions,
    freight_description, pieces, estimated_weight, dimensions, equipment_requirements, tarping_requirements, securement_requirements, declared_value, reference_number, additional_instructions, missing_fields
  ) values (
    target_company, new_number, requested_payload->>'requesterCompany', requested_payload->>'requesterName', requested_payload->>'requesterEmail', requested_payload->>'requesterPhone',
    requested_payload->>'pickupCompany', requested_payload->>'pickupAddress', requested_payload->>'pickupCity', requested_payload->>'pickupState', requested_payload->>'pickupPostalCode', requested_payload->>'pickupContact', requested_payload->>'pickupPhone', nullif(requested_payload->>'pickupDate','')::date, requested_payload->>'pickupTimeWindow', requested_payload->>'pickupMethod', requested_payload->>'pickupInstructions',
    requested_payload->>'deliveryCompany', requested_payload->>'deliveryAddress', requested_payload->>'deliveryCity', requested_payload->>'deliveryState', requested_payload->>'deliveryPostalCode', requested_payload->>'deliveryContact', requested_payload->>'deliveryPhone', nullif(requested_payload->>'deliveryDate','')::date, requested_payload->>'deliveryTimeWindow', requested_payload->>'unloadingMethod', requested_payload->>'deliveryInstructions',
    requested_payload->>'freightDescription', nullif(requested_payload->>'pieces','')::integer, nullif(requested_payload->>'estimatedWeight','')::numeric, requested_payload->>'dimensions', requested_payload->>'equipmentRequirements', requested_payload->>'tarpingRequirements', requested_payload->>'securementRequirements', nullif(requested_payload->>'declaredValue','')::numeric, requested_payload->>'referenceNumber', requested_payload->>'additionalInstructions', missing
  ) returning load_requests.public_token into new_token;
  return query select new_number, new_token;
end;
$$;

grant execute on function public.submit_public_load_request(text,jsonb) to anon, authenticated;
