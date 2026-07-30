-- Legacy Hotshot Command Center
-- Stage 1 follow-up: persist all first-time setup fields in one secure RPC.

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
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if requested_company_name is null then
    raise exception 'Company name is required';
  end if;

  select *
  into current_profile
  from public.profiles
  where id = auth.uid()
  for update;

  if current_profile.id is null then
    raise exception 'Profile not found';
  end if;

  if current_profile.role <> 'owner'::public.user_role then
    raise exception 'Only an owner can complete company setup';
  end if;

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
    coalesce(nullif(trim(requested_settings ->> 'primaryColor'), ''), '#47657d')
  )
  on conflict (company_id) do update set
    owner_name = excluded.owner_name,
    company_email = excluded.company_email,
    company_phone = excluded.company_phone,
    business_address = excluded.business_address,
    service_area = excluded.service_area,
    mc_number = excluded.mc_number,
    usdot_number = excluded.usdot_number,
    default_invoice_terms = excluded.default_invoice_terms,
    default_detention_policy = excluded.default_detention_policy,
    default_communication_preference = excluded.default_communication_preference,
    email_signature = excluded.email_signature,
    primary_color = excluded.primary_color;

  update public.profiles
  set company_id = target_company_id,
      full_name = coalesce(requested_owner_name, full_name),
      setup_complete = true
  where id = auth.uid();

  insert into public.audit_logs (
    company_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    changes
  )
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
