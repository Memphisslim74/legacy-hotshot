import { supabase } from './supabase'
import type { BusinessRelationshipType, Customer, DocumentRecord, LoadRecord, LoadRequestInput, LoadRequestRecord } from '../types'
import type { RouteEstimate } from './routing'

const requireClient = () => {
  if (!supabase) throw new Error('Supabase is not connected.')
  return supabase
}

export type BusinessRelationshipInput = {
  companyName: string
  relationshipTypes: BusinessRelationshipType[]
  relationshipStatus: 'active' | 'inactive' | 'on_hold'
  preferredPartner: boolean
  primaryContact: string
  email: string
  phone: string
  websiteUrl: string
  city: string
  state: string
  paymentTerms: string
  communicationPreference: string
  vendorCategory: string
  notes: string
}

export async function listCustomers(companyId: string): Promise<Customer[]> {
  const { data, error } = await requireClient()
    .from('customers')
    .select('*, business_contacts(*)')
    .eq('company_id', companyId)
    .order('company_name')
  if (error) throw error
  return (data ?? []) as Customer[]
}

export async function createCustomer(companyId: string, userId: string, values: BusinessRelationshipInput) {
  const { data, error } = await requireClient().from('customers').insert({
    company_id: companyId,
    company_name: values.companyName.trim(),
    relationship_types: values.relationshipTypes,
    relationship_status: values.relationshipStatus,
    preferred_partner: values.preferredPartner,
    primary_contact: values.primaryContact.trim() || null,
    email: values.email.trim() || null,
    phone: values.phone.trim() || null,
    website_url: values.websiteUrl.trim() || null,
    city: values.city.trim() || null,
    state: values.state.trim().toUpperCase() || null,
    payment_terms: values.paymentTerms,
    communication_preference: values.communicationPreference,
    vendor_category: values.vendorCategory.trim() || null,
    notes: values.notes.trim() || null,
    created_by: userId,
  }).select('*').single()
  if (error) throw error

  if (values.primaryContact.trim()) {
    const { error: contactError } = await requireClient().from('business_contacts').insert({
      company_id: companyId,
      customer_id: data.id,
      full_name: values.primaryContact.trim(),
      email: values.email.trim() || null,
      phone: values.phone.trim() || null,
      contact_role: 'primary',
      is_primary: true,
      created_by: userId,
    })
    if (contactError) throw contactError
  }

  return { ...data, business_contacts: [] } as Customer
}

export async function updateCustomer(companyId: string, customerId: string, values: BusinessRelationshipInput) {
  const { data, error } = await requireClient().from('customers').update({
    company_name: values.companyName.trim(),
    relationship_types: values.relationshipTypes,
    relationship_status: values.relationshipStatus,
    preferred_partner: values.preferredPartner,
    primary_contact: values.primaryContact.trim() || null,
    email: values.email.trim() || null,
    phone: values.phone.trim() || null,
    website_url: values.websiteUrl.trim() || null,
    city: values.city.trim() || null,
    state: values.state.trim().toUpperCase() || null,
    payment_terms: values.paymentTerms,
    communication_preference: values.communicationPreference,
    vendor_category: values.vendorCategory.trim() || null,
    notes: values.notes.trim() || null,
  }).eq('id', customerId).eq('company_id', companyId).select('*').single()
  if (error) throw error
  return data as Customer
}

export async function listLoadRequests(companyId: string): Promise<LoadRequestRecord[]> {
  const { data, error } = await requireClient().from('load_requests').select('*').eq('company_id', companyId).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as LoadRequestRecord[]
}

export async function listLoads(companyId: string): Promise<LoadRecord[]> {
  const { data, error } = await requireClient().from('loads')
    .select('*, customers(company_name)').eq('company_id', companyId).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as LoadRecord[]
}

export async function listDocuments(companyId: string): Promise<DocumentRecord[]> {
  const { data, error } = await requireClient().from('documents')
    .select('*, loads(load_number), customers(company_name)').eq('company_id', companyId).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as DocumentRecord[]
}

export async function submitPublicLoadRequest(values: LoadRequestInput) {
  const { data, error } = await requireClient().rpc('submit_public_load_request', {
    requested_company_slug: 'legacy-hotshot',
    requested_payload: values,
  })
  if (error) throw error
  const result = Array.isArray(data) ? data[0] : data
  return result as { request_number: string; public_token: string }
}

export async function createBookedLoad(
  companyId: string,
  userId: string,
  values: LoadRequestInput,
  customerId?: string,
  route?: RouteEstimate | null,
) {
  const suffix = Date.now().toString().slice(-6)
  const pickupAt = values.pickupDate ? `${values.pickupDate}T${normalizeTime(values.pickupTimeWindow)}` : null
  const deliveryAt = values.deliveryDate ? `${values.deliveryDate}T${normalizeTime(values.deliveryTimeWindow)}` : null
  const { data, error } = await requireClient().from('loads').insert({
    company_id: companyId,
    load_number: `LH-${suffix}`,
    customer_id: customerId || null,
    status: 'booked',
    pickup_company: values.pickupCompany.trim() || null,
    pickup_address: values.pickupAddress.trim(),
    pickup_city: values.pickupCity.trim(),
    pickup_state: values.pickupState.trim().toUpperCase(),
    pickup_contact: values.pickupContact.trim() || null,
    pickup_phone: values.pickupPhone.trim() || null,
    pickup_at: pickupAt,
    pickup_instructions: values.pickupInstructions.trim() || null,
    delivery_company: values.deliveryCompany.trim() || null,
    delivery_address: values.deliveryAddress.trim(),
    delivery_city: values.deliveryCity.trim(),
    delivery_state: values.deliveryState.trim().toUpperCase(),
    delivery_contact: values.deliveryContact.trim() || null,
    delivery_phone: values.deliveryPhone.trim() || null,
    delivery_at: deliveryAt,
    delivery_instructions: values.deliveryInstructions.trim() || null,
    freight_description: values.freightDescription.trim(),
    pieces: numberOrNull(values.pieces),
    estimated_weight: numberOrNull(values.estimatedWeight),
    dimensions: values.dimensions.trim() || null,
    equipment_requirements: values.equipmentRequirements.trim() || null,
    securement_requirements: values.securementRequirements.trim() || null,
    loaded_miles: route?.loadedMiles ?? 0,
    route_distance_meters: route?.distanceMeters ?? null,
    route_duration_seconds: route?.durationSeconds ?? null,
    route_calculated_at: route?.calculatedAt ?? null,
    route_provider: route?.provider ?? null,
    current_eta: deliveryAt,
    created_by: userId,
  }).select('*').single()
  if (error) throw error
  await requireClient().from('load_status_history').insert({
    company_id: companyId,
    load_id: data.id,
    status: 'booked',
    note: 'Load created in Legacy Command Center',
    changed_by: userId,
  })
  return data as LoadRecord
}

export async function updateLoadStatus(companyId: string, userId: string, loadId: string, status: LoadRecord['status'], note?: string) {
  const { error } = await requireClient().from('loads').update({ status }).eq('id', loadId)
  if (error) throw error
  const { error: historyError } = await requireClient().from('load_status_history').insert({
    company_id: companyId, load_id: loadId, status, note: note || null, changed_by: userId,
  })
  if (historyError) throw historyError
}

function numberOrNull(value: string) {
  const parsed = Number(value)
  return value.trim() && Number.isFinite(parsed) ? parsed : null
}

function normalizeTime(value: string) {
  const match = value.match(/\b(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
  if (!match) return '12:00:00'
  let hour = Number(match[1])
  const minute = match[2]
  const meridiem = match[3]?.toUpperCase()
  if (meridiem === 'PM' && hour < 12) hour += 12
  if (meridiem === 'AM' && hour === 12) hour = 0
  return `${String(hour).padStart(2, '0')}:${minute}:00`
}
