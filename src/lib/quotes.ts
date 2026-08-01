import { supabase } from './supabase'

export type QuoteRecord = {
  id: string
  quote_number: string
  load_request_id: string
  estimated_mileage: number | null
  base_rate: number
  fuel_surcharge: number
  tarping_charge: number
  additional_services: number
  total_amount: number
  detention_terms: string | null
  payment_terms: string
  expires_at: string | null
  notes: string | null
  status: 'draft' | 'sent' | 'approved' | 'declined' | 'expired' | 'converted'
  public_token: string
  sent_at?: string | null
  accepted_by_name?: string | null
  accepted_at?: string | null
  accepted_quote_amount?: number | null
  accepted_quote_version?: number | null
  quote_version?: number
  created_at: string
  load_requests?: {
    request_number: string
    requester_company: string | null
    requester_name: string
    requester_email: string
    pickup_city: string
    pickup_state: string
    delivery_city: string
    delivery_state: string
    freight_description: string
  } | null
}

const requireClient = () => {
  if (!supabase) throw new Error('Supabase is not connected.')
  return supabase
}

export async function listQuotes(companyId: string): Promise<QuoteRecord[]> {
  const { data, error } = await requireClient().from('quotes')
    .select('*, load_requests(request_number, requester_company, requester_name, requester_email, pickup_city, pickup_state, delivery_city, delivery_state, freight_description)')
    .eq('company_id', companyId).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as QuoteRecord[]
}

export async function createQuote(companyId: string, userId: string, values: {
  loadRequestId: string
  estimatedMileage: string
  baseRate: string
  fuelSurcharge: string
  tarpingCharge: string
  additionalServices: string
  detentionTerms: string
  paymentTerms: string
  expiresAt: string
  notes: string
}) {
  const quoteNumber = `LHQ-${Date.now().toString().slice(-6)}`
  const { data, error } = await requireClient().from('quotes').insert({
    company_id: companyId,
    load_request_id: values.loadRequestId,
    quote_number: quoteNumber,
    estimated_mileage: numberOrNull(values.estimatedMileage),
    base_rate: numberOrZero(values.baseRate),
    fuel_surcharge: numberOrZero(values.fuelSurcharge),
    tarping_charge: numberOrZero(values.tarpingCharge),
    additional_services: numberOrZero(values.additionalServices),
    detention_terms: values.detentionTerms.trim() || null,
    payment_terms: values.paymentTerms,
    expires_at: values.expiresAt ? `${values.expiresAt}T23:59:59` : null,
    notes: values.notes.trim() || null,
    created_by: userId,
  }).select('*, load_requests(request_number, requester_company, requester_name, requester_email, pickup_city, pickup_state, delivery_city, delivery_state, freight_description)').single()
  if (error) throw error
  await requireClient().from('load_requests').update({ status: 'quoted' }).eq('id', values.loadRequestId)
  return data as QuoteRecord
}

export async function updateQuoteStatus(quoteId: string, status: QuoteRecord['status']) {
  const { error } = await requireClient().from('quotes').update({ status }).eq('id', quoteId)
  if (error) throw error
}

export async function sendQuoteEmail(quoteId: string) {
  const { data: sessionData, error: sessionError } = await requireClient().auth.getSession()
  if (sessionError) throw sessionError
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('Your session has expired. Sign in again before sending the quote.')

  const response = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}/send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  })
  const payload = await response.json() as { sent?: boolean; recipient?: string; quoteUrl?: string; error?: string }
  if (!response.ok) throw new Error(payload.error || 'Unable to send the quote email.')
  return payload
}

function numberOrNull(value: string) {
  const parsed = Number(value)
  return value.trim() && Number.isFinite(parsed) ? parsed : null
}

function numberOrZero(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}
