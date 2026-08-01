import { createAdminClient, jsonResponse, responseFromError } from '../../../_shared/admin'
import type { AdminEnv } from '../../../_shared/admin'

type Context = { request: Request; env: AdminEnv; params: { token?: string } }

type QuoteRow = {
  id: string
  company_id: string
  quote_number: string
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
  status: string
  public_token: string
  sent_at: string | null
  accepted_by_name: string | null
  accepted_at: string | null
  accepted_quote_amount: number | null
  accepted_quote_version: number | null
  quote_version: number
  load_requests: {
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

const select = 'id, company_id, quote_number, estimated_mileage, base_rate, fuel_surcharge, tarping_charge, additional_services, total_amount, detention_terms, payment_terms, expires_at, notes, status, public_token, sent_at, accepted_by_name, accepted_at, accepted_quote_amount, accepted_quote_version, quote_version, load_requests(requester_company, requester_name, requester_email, pickup_city, pickup_state, delivery_city, delivery_state, freight_description)'

function publicPayload(quote: QuoteRow) {
  return {
    quoteNumber: quote.quote_number,
    customerCompany: quote.load_requests?.requester_company,
    customerName: quote.load_requests?.requester_name,
    pickupCity: quote.load_requests?.pickup_city,
    pickupState: quote.load_requests?.pickup_state,
    deliveryCity: quote.load_requests?.delivery_city,
    deliveryState: quote.load_requests?.delivery_state,
    freightDescription: quote.load_requests?.freight_description,
    estimatedMileage: quote.estimated_mileage,
    baseRate: quote.base_rate,
    fuelSurcharge: quote.fuel_surcharge,
    tarpingCharge: quote.tarping_charge,
    additionalServices: quote.additional_services,
    totalAmount: quote.total_amount,
    detentionTerms: quote.detention_terms,
    paymentTerms: quote.payment_terms,
    expiresAt: quote.expires_at,
    notes: quote.notes,
    status: quote.status,
    acceptedByName: quote.accepted_by_name,
    acceptedAt: quote.accepted_at,
    acceptedQuoteAmount: quote.accepted_quote_amount,
    acceptedQuoteVersion: quote.accepted_quote_version,
    quoteVersion: quote.quote_version,
  }
}

async function getQuote(env: AdminEnv, token: string) {
  const admin = createAdminClient(env)
  const { data, error } = await admin.from('quotes').select(select).eq('public_token', token).single()
  if (error || !data) throw new Response(JSON.stringify({ error: 'Quote not found.' }), { status: 404 })
  return { admin, quote: data as unknown as QuoteRow }
}

export const onRequestGet = async ({ env, params }: Context): Promise<Response> => {
  try {
    const token = params.token?.trim()
    if (!token) return jsonResponse({ error: 'Quote token is required.' }, 400)
    const { quote } = await getQuote(env, token)
    return jsonResponse(publicPayload(quote))
  } catch (error) {
    return responseFromError(error)
  }
}

export const onRequestPost = async ({ request, env, params }: Context): Promise<Response> => {
  try {
    const token = params.token?.trim()
    if (!token) return jsonResponse({ error: 'Quote token is required.' }, 400)
    const body = await request.json() as { acceptedByName?: string }
    const acceptedByName = body.acceptedByName?.trim()
    if (!acceptedByName || acceptedByName.length < 2) return jsonResponse({ error: 'Enter your full name to accept this quote.' }, 400)
    if (acceptedByName.length > 120) return jsonResponse({ error: 'The approval name is too long.' }, 400)

    const { admin, quote } = await getQuote(env, token)
    if (quote.status === 'approved' || quote.accepted_at) return jsonResponse(publicPayload(quote))
    if (quote.status === 'declined' || quote.status === 'expired' || quote.status === 'converted') return jsonResponse({ error: `This quote can no longer be accepted because it is ${quote.status}.` }, 409)
    if (quote.expires_at && new Date(quote.expires_at).getTime() < Date.now()) return jsonResponse({ error: 'This quote has expired. Please contact Legacy Hotshot for updated pricing.' }, 409)

    const acceptedAt = new Date().toISOString()
    const forwarded = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || ''
    const userAgent = request.headers.get('User-Agent') || ''
    const { data, error } = await admin.from('quotes').update({
      status: 'approved',
      accepted_by_name: acceptedByName,
      accepted_at: acceptedAt,
      accepted_quote_amount: quote.total_amount,
      accepted_quote_version: quote.quote_version,
      acceptance_ip: forwarded.slice(0, 255) || null,
      acceptance_user_agent: userAgent.slice(0, 1000) || null,
    }).eq('id', quote.id).is('accepted_at', null).select(select).single()

    if (error || !data) {
      const latest = await getQuote(env, token)
      if (latest.quote.accepted_at) return jsonResponse(publicPayload(latest.quote))
      throw error || new Error('Unable to accept this quote.')
    }

    return jsonResponse(publicPayload(data as unknown as QuoteRow))
  } catch (error) {
    return responseFromError(error)
  }
}
