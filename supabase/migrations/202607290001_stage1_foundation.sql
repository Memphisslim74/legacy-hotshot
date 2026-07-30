-- Legacy Hotshot Command Center
-- Stage 1: companies, profiles, settings, notifications, audit history, and RLS.

create extension if not exists pgcrypto;

create type public.user_role as enum ('owner', 'dispatcher', 'driver', 'finance');
create type public.company_status as enum ('setup', 'active', 'suspended');
create type public.notification_severity as enum ('info', 'warning', 'critical');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text not null,
  status public.company_status not null default 'setup',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  full_name text,
  role public.user_role not null default 'driver',
  phone text,
  avatar_path text,
  setup_complete boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  owner_name text,
  company_email text,
  company_phone text,
  business_address text,
  service_area text,
  mc_number text,
  usdot_number text,
  default_invoice_terms text not null default 'Net 30',
  default_detention_policy text not null default '2 hours free, then billed hourly',
  default_communication_preference text not null default 'email',
  email_signature text,
  logo_path text,
  primary_color text not null default '#b98542',
  secondary_color text not null default '#15181c',
  facebook_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  severity public.notification_severity not null default 'info',
  title text not null,
  message text,
  action_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  company_id uuid references public.companies(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  changes jsonb not null default '{}'::jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index profiles_company_id_idx on public.profiles(company_id);
create index notifications_company_user_idx on public.notifications(company_id, user_id, created_at desc);
create index audit_logs_company_created_idx on public.audit_logs(company_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_set_updated_at before update on public.companies for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger company_settings_set_updated_at before update on public.company_settings for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case
      when new.raw_user_meta_data ->> 'role' = 'owner' then 'owner'::public.user_role
      when new.raw_user_meta_data ->> 'role' = 'dispatcher' then 'dispatcher'::public.user_role
      when new.raw_user_meta_data ->> 'role' = 'finance' then 'finance'::public.user_role
      else 'driver'::public.user_role
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.complete_owner_setup(requested_company_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_company_id uuid;
  current_profile public.profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if nullif(trim(requested_company_name), '') is null then raise exception 'Company name is required'; end if;

  select * into current_profile from public.profiles where id = auth.uid() for update;
  if current_profile.id is null then raise exception 'Profile not found'; end if;
  if current_profile.role <> 'owner'::public.user_role then raise exception 'Only an owner can complete company setup'; end if;

  if current_profile.company_id is not null then
    update public.profiles set setup_complete = true where id = auth.uid();
    return current_profile.company_id;
  end if;

  insert into public.companies (legal_name, display_name, status)
  values (trim(requested_company_name), trim(requested_company_name), 'active')
  returning id into created_company_id;

  insert into public.company_settings (company_id, owner_name)
  values (created_company_id, current_profile.full_name);

  update public.profiles
  set company_id = created_company_id, setup_complete = true
  where id = auth.uid();

  insert into public.audit_logs (company_id, actor_id, action, entity_type, entity_id)
  values (created_company_id, auth.uid(), 'company_setup_completed', 'company', created_company_id::text);

  return created_company_id;
end;
$$;

grant execute on function public.complete_owner_setup(text) to authenticated;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.company_settings enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy "Company members can read their company"
on public.companies for select to authenticated
using (id = public.current_company_id());

create policy "Owners can update their company"
on public.companies for update to authenticated
using (id = public.current_company_id() and public.current_user_role() = 'owner')
with check (id = public.current_company_id() and public.current_user_role() = 'owner');

create policy "Users can read their own profile"
on public.profiles for select to authenticated
using (id = auth.uid());

create policy "Owners can read company profiles"
on public.profiles for select to authenticated
using (company_id = public.current_company_id() and public.current_user_role() = 'owner');

create policy "Company members can read company settings"
on public.company_settings for select to authenticated
using (company_id = public.current_company_id());

create policy "Owners can update company settings"
on public.company_settings for update to authenticated
using (company_id = public.current_company_id() and public.current_user_role() = 'owner')
with check (company_id = public.current_company_id() and public.current_user_role() = 'owner');

create policy "Users can read assigned or company notifications"
on public.notifications for select to authenticated
using (
  company_id = public.current_company_id()
  and (user_id is null or user_id = auth.uid() or public.current_user_role() = 'owner')
);

create policy "Users can mark their notifications read"
on public.notifications for update to authenticated
using (company_id = public.current_company_id() and (user_id is null or user_id = auth.uid()))
with check (company_id = public.current_company_id() and (user_id is null or user_id = auth.uid()));

create policy "Owners can read company audit logs"
on public.audit_logs for select to authenticated
using (company_id = public.current_company_id() and public.current_user_role() = 'owner');

revoke all on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;
