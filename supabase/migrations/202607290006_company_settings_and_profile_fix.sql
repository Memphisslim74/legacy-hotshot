-- Legacy Hotshot Command Center
-- Separate personal user profiles from editable company ownership and operating details.

alter table public.company_settings
  add column if not exists after_hours_phone text,
  add column if not exists mailing_address text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postal_code text,
  add column if not exists website_url text,
  add column if not exists billing_email text,
  add column if not exists dispatch_notes text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text;

-- Owner and dispatcher roles are the administrative roles for company settings.
drop policy if exists "Owners can update their company" on public.companies;
create policy "Company admins can update their company"
on public.companies for update to authenticated
using (
  id = public.current_company_id()
  and public.current_user_role() in ('owner','dispatcher')
)
with check (
  id = public.current_company_id()
  and public.current_user_role() in ('owner','dispatcher')
);

drop policy if exists "Owners can update company settings" on public.company_settings;
create policy "Company admins can update company settings"
on public.company_settings for update to authenticated
using (
  company_id = public.current_company_id()
  and public.current_user_role() in ('owner','dispatcher')
)
with check (
  company_id = public.current_company_id()
  and public.current_user_role() in ('owner','dispatcher')
);

-- Company setup creates the workspace but never renames the signed-in person's profile.
create or replace function public.complete_owner_setup(requested_settings jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_company_id uuid;
  current_profile public.profiles%rowtype;
  requested_company_name text := nullif(trim(requested_settings ->> 'companyName'), '');
  requested_owner_name text := nullif(trim(requested_settings ->> 'ownerName'), '');
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if requested_company_name is null then raise exception 'Company name is required'; end if;

  select * into current_profile
  from public.profiles
  where id = auth.uid()
  for update;

  if current_profile.id is null then raise exception 'Profile not found'; end if;
  if current_profile.role <> 'owner'::public.user_role then raise exception 'Only an owner can complete company setup'; end if;

  target_company_id := current_profile.company_id;

  if target_company_id is null then
    insert into public.companies (legal_name, display_name, status)
    values (requested_company_name, requested_company_name, 'active')
    returning id into target_company_id;
  else
    update public.companies
    set legal_name = requested_company_name,
        display_name = requested_company_name,
        status = 'active'
    where id = target_company_id;
  end if;

  insert into public.company_settings (
    company_id,
    owner_name,
    company_email,
    company_phone,
    business_address,
    service_area,
    mc_number,
    usdot_number,
    default_invoice_terms,
    default_detention_policy,
    default_communication_preference,
    email_signature,
    primary_color
  )
  values (
    target_company_id,
    coalesce(requested_owner_name, current_profile.full_name),
    nullif(trim(requested_settings ->> 'companyEmail'), ''),
    nullif(trim(requested_settings ->> 'companyPhone'), ''),
    nullif(trim(requested_settings ->> 'businessAddress'), ''),
    nullif(trim(requested_settings ->> 'serviceArea'), ''),
    nullif(trim(requested_settings ->> 'mcNumber'), ''),
    nullif(trim(requested_settings ->> 'usdotNumber'), ''),
    coalesce(nullif(trim(requested_settings ->> 'invoiceTerms'), ''), 'Net 30'),
    coalesce(nullif(trim(requested_settings ->> 'detentionPolicy'), ''), '2 hours free, then billed hourly'),
    coalesce(nullif(trim(requested_settings ->> 'communicationPreference'), ''), 'email'),
    nullif(trim(requested_settings ->> 'emailSignature'), ''),
    coalesce(nullif(trim(requested_settings ->> 'primaryColor'), ''), '#bd1f31')
  )
  on conflict (company_id) do update set
    owner_name = coalesce(excluded.owner_name, public.company_settings.owner_name),
    company_email = coalesce(excluded.company_email, public.company_settings.company_email),
    company_phone = coalesce(excluded.company_phone, public.company_settings.company_phone),
    business_address = coalesce(excluded.business_address, public.company_settings.business_address),
    service_area = coalesce(excluded.service_area, public.company_settings.service_area),
    mc_number = coalesce(excluded.mc_number, public.company_settings.mc_number),
    usdot_number = coalesce(excluded.usdot_number, public.company_settings.usdot_number),
    default_invoice_terms = excluded.default_invoice_terms,
    default_detention_policy = excluded.default_detention_policy,
    default_communication_preference = excluded.default_communication_preference,
    email_signature = coalesce(excluded.email_signature, public.company_settings.email_signature),
    primary_color = excluded.primary_color;

  update public.profiles
  set company_id = target_company_id,
      setup_complete = true
  where id = auth.uid();

  insert into public.audit_logs (company_id, actor_id, action, entity_type, entity_id, changes)
  values (
    target_company_id,
    auth.uid(),
    'company_setup_completed',
    'company',
    target_company_id::text,
    jsonb_build_object('setup_saved', true)
  );

  return target_company_id;
end;
$$;

grant execute on function public.complete_owner_setup(jsonb) to authenticated;

-- Repair the two known administrator profiles and attach Jared to Steve's company.
update public.profiles as profile
set full_name = 'Steve Smith'
from auth.users as auth_user
where profile.id = auth_user.id
  and lower(auth_user.email) = lower('steve@arsenalmediaco.com');

with steve_company as (
  select profile.company_id
  from public.profiles as profile
  join auth.users as auth_user on auth_user.id = profile.id
  where lower(auth_user.email) = lower('steve@arsenalmediaco.com')
    and profile.company_id is not null
  limit 1
), jared_account as (
  select id from auth.users
  where lower(email) = lower('legacyhsoffice@gmail.com')
  limit 1
)
update public.profiles as profile
set full_name = 'Jared Guinn',
    role = 'owner'::public.user_role,
    company_id = steve_company.company_id,
    setup_complete = true
from steve_company, jared_account
where profile.id = jared_account.id;

with steve_company as (
  select profile.company_id
  from public.profiles as profile
  join auth.users as auth_user on auth_user.id = profile.id
  where lower(auth_user.email) = lower('steve@arsenalmediaco.com')
    and profile.company_id is not null
  limit 1
)
update public.company_settings as settings
set owner_name = 'Jared Guinn',
    company_email = coalesce(settings.company_email, 'legacyhsoffice@gmail.com'),
    usdot_number = coalesce(settings.usdot_number, '4514127')
from steve_company
where settings.company_id = steve_company.company_id;
