import { supabase } from './supabase'

export type CompanySettingsRecord = {
  company_id: string
  legal_name: string
  display_name: string
  owner_name: string | null
  company_email: string | null
  company_phone: string | null
  after_hours_phone: string | null
  business_address: string | null
  mailing_address: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  service_area: string | null
  mc_number: string | null
  usdot_number: string | null
  website_url: string | null
  facebook_url: string | null
  billing_email: string | null
  default_invoice_terms: string
  default_detention_policy: string
  default_communication_preference: string
  email_signature: string | null
  primary_color: string
  secondary_color: string
  dispatch_notes: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
}

export type CompanySettingsInput = Omit<CompanySettingsRecord, 'company_id'>

const requireClient = () => {
  if (!supabase) throw new Error('Supabase is not connected.')
  return supabase
}

export async function getCompanySettings(companyId: string): Promise<CompanySettingsRecord> {
  const client = requireClient()
  const { data: company, error: companyError } = await client
    .from('companies')
    .select('id, legal_name, display_name')
    .eq('id', companyId)
    .single()
  if (companyError) throw companyError

  const { data: settings, error: settingsError } = await client
    .from('company_settings')
    .select('*')
    .eq('company_id', companyId)
    .single()
  if (settingsError) throw settingsError

  return {
    company_id: company.id,
    legal_name: company.legal_name,
    display_name: company.display_name,
    owner_name: settings.owner_name,
    company_email: settings.company_email,
    company_phone: settings.company_phone,
    after_hours_phone: settings.after_hours_phone,
    business_address: settings.business_address,
    mailing_address: settings.mailing_address,
    city: settings.city,
    state: settings.state,
    postal_code: settings.postal_code,
    service_area: settings.service_area,
    mc_number: settings.mc_number,
    usdot_number: settings.usdot_number,
    website_url: settings.website_url,
    facebook_url: settings.facebook_url,
    billing_email: settings.billing_email,
    default_invoice_terms: settings.default_invoice_terms,
    default_detention_policy: settings.default_detention_policy,
    default_communication_preference: settings.default_communication_preference,
    email_signature: settings.email_signature,
    primary_color: settings.primary_color,
    secondary_color: settings.secondary_color,
    dispatch_notes: settings.dispatch_notes,
    emergency_contact_name: settings.emergency_contact_name,
    emergency_contact_phone: settings.emergency_contact_phone,
  }
}

export async function saveCompanySettings(companyId: string, values: CompanySettingsInput) {
  const client = requireClient()
  const { error: companyError } = await client
    .from('companies')
    .update({ legal_name: values.legal_name.trim(), display_name: values.display_name.trim() })
    .eq('id', companyId)
  if (companyError) throw companyError

  const { error: settingsError } = await client
    .from('company_settings')
    .update({
      owner_name: clean(values.owner_name),
      company_email: clean(values.company_email),
      company_phone: clean(values.company_phone),
      after_hours_phone: clean(values.after_hours_phone),
      business_address: clean(values.business_address),
      mailing_address: clean(values.mailing_address),
      city: clean(values.city),
      state: clean(values.state)?.toUpperCase() ?? null,
      postal_code: clean(values.postal_code),
      service_area: clean(values.service_area),
      mc_number: clean(values.mc_number),
      usdot_number: clean(values.usdot_number),
      website_url: clean(values.website_url),
      facebook_url: clean(values.facebook_url),
      billing_email: clean(values.billing_email),
      default_invoice_terms: values.default_invoice_terms,
      default_detention_policy: values.default_detention_policy.trim(),
      default_communication_preference: values.default_communication_preference,
      email_signature: clean(values.email_signature),
      primary_color: values.primary_color,
      secondary_color: values.secondary_color,
      dispatch_notes: clean(values.dispatch_notes),
      emergency_contact_name: clean(values.emergency_contact_name),
      emergency_contact_phone: clean(values.emergency_contact_phone),
    })
    .eq('company_id', companyId)
  if (settingsError) throw settingsError
}

function clean(value: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}
