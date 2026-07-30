-- Legacy Hotshot Command Center
-- Stage 3.1: Expand customers into a two-way business relationship directory.

begin;

alter table public.customers
  add column if not exists relationship_types text[] not null default array['customer']::text[],
  add column if not exists relationship_status text not null default 'active',
  add column if not exists preferred_partner boolean not null default false,
  add column if not exists website_url text,
  add column if not exists address_line_1 text,
  add column if not exists address_line_2 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postal_code text,
  add column if not exists vendor_category text,
  add column if not exists account_number text,
  add column if not exists last_activity_at timestamptz;

update public.customers
set relationship_types = array['customer']::text[]
where relationship_types is null or cardinality(relationship_types) = 0;

do $$
begin
  alter table public.customers
    add constraint customers_relationship_status_check
    check (relationship_status in ('active', 'inactive', 'on_hold'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.customers
    add constraint customers_relationship_types_check
    check (
      cardinality(relationship_types) > 0
      and relationship_types <@ array[
        'customer',
        'broker',
        'shipper',
        'receiver',
        'vendor',
        'repair_shop',
        'fuel_partner',
        'insurance_partner',
        'other'
      ]::text[]
    );
exception when duplicate_object then null;
end $$;

create index if not exists customers_relationship_types_idx
  on public.customers using gin (relationship_types);

create index if not exists customers_relationship_status_idx
  on public.customers (company_id, relationship_status, company_name);

create table if not exists public.business_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  full_name text not null,
  title text,
  department text,
  email text,
  phone text,
  contact_role text not null default 'general',
  is_primary boolean not null default false,
  is_active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_contacts_customer_idx
  on public.business_contacts (customer_id, is_primary desc, full_name);

create unique index if not exists business_contacts_one_primary_idx
  on public.business_contacts (customer_id)
  where is_primary = true and is_active = true;

drop trigger if exists business_contacts_set_updated_at on public.business_contacts;
create trigger business_contacts_set_updated_at
before update on public.business_contacts
for each row execute function public.set_updated_at();

alter table public.business_contacts enable row level security;

drop policy if exists "Company members manage business contacts" on public.business_contacts;
create policy "Company members manage business contacts"
on public.business_contacts for all to authenticated
using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());

insert into public.business_contacts (
  company_id,
  customer_id,
  full_name,
  email,
  phone,
  contact_role,
  is_primary,
  created_by
)
select
  customer.company_id,
  customer.id,
  customer.primary_contact,
  customer.email,
  customer.phone,
  'primary',
  true,
  customer.created_by
from public.customers as customer
where nullif(trim(customer.primary_contact), '') is not null
  and not exists (
    select 1
    from public.business_contacts as contact
    where contact.customer_id = customer.id
      and contact.is_primary = true
  );

commit;
