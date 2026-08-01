import { createAdminClient, jsonResponse, responseFromError } from '../../../_shared/admin'
import type { AdminEnv } from '../../../_shared/admin'

type Context = { request: Request; env: AdminEnv; params: { token?: string } }
type AdminClient = ReturnType<typeof createAdminClient>
type RequestRow = Record<string, unknown>

type QuoteRow = {
  id: string
  company_id: string
  load_request_id: string
  created_by: string
  converted_load_id: string | null
  approval_notification_sent_at: string | null
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
  load_requests: RequestRow | RequestRow[] | null
}

const select = 'id, company_id, load_request_id, created_by, converted_load_id, approval_notification_sent_at, quote_number, estimated_mileage, base_rate, fuel_surcharge, tarping_charge, additional_services, total_amount, detention_terms, payment_terms, expires_at, notes, status, public_token, sent_at, accepted_by_name, accepted_at, accepted_quote_amount, accepted_quote_version, quote_version, load_requests(*)'
const metersPerMile = 1609.344

function requestFor(quote: QuoteRow): RequestRow {
  if (Array.isArray(quote.load_requests)) return quote.load_requests[0] || {}
  return quote.load_requests || {}
}

function text(row: RequestRow, key: string, fallback = '') {
  const value = row[key]
  return typeof value === 'string' ? value.trim() : fallback
}

function numberValue(row: RequestRow, key: string) {
  const value = row[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

function appointment(row: RequestRow, dateKey: string, timeKey: string) {
  const date = text(row, dateKey)
  if (!date) return null
  const timeValue = text(row, timeKey)
  const match = timeValue.match(/\b(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
  if (!match) return `${date}T12:00:00`
  let hour = Number(match[1])
  const meridiem = match[3]?.toUpperCase()
  if (meridiem === 'PM' && hour < 12) hour += 12
  if (meridiem === 'AM' && hour === 12) hour = 0
  return `${date}T${String(hour).padStart(2, '0')}:${match[2]}:00`
}

function publicPayload(quote: QuoteRow, loadNumber?: string | null) {
  const request = requestFor(quote)
  return {
    quoteNumber: quote.quote_number,
    customerCompany: text(request, 'requester_company') || null,
    customerName: text(request, 'requester_name'),
    pickupCity: text(request, 'pickup_city'),
    pickupState: text(request, 'pickup_state'),
    deliveryCity: text(request, 'delivery_city'),
    deliveryState: text(request, 'delivery_state'),
    freightDescription: text(request, 'freight_description'),
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
    bookedLoadId: quote.converted_load_id,
    bookedLoadNumber: loadNumber || null,
  }
}

async function getQuote(env: AdminEnv, token: string) {
  const admin = createAdminClient(env)
  const { data, error } = await admin.from('quotes').select(select).eq('public_token', token).single()
  if (error || !data) throw new Response(JSON.stringify({ error: 'Quote not found.' }), { status: 404 })
  return { admin, quote: data as unknown as QuoteRow }
}

async function findCustomer(admin: AdminClient, quote: QuoteRow) {
  const request = requestFor(quote)
  const companyName = text(request, 'requester_company')
  const email = text(request, 'requester_email')
  let query = admin.from('customers').select('id').eq('company_id', quote.company_id)
  if (email) query = query.eq('email', email)
  else if (companyName) query = query.eq('company_name', companyName)
  else return null
  const { data } = await query.limit(1).maybeSingle()
  return data?.id || null
}

async function existingLoad(admin: AdminClient, quoteId: string) {
  const { data } = await admin.from('loads').select('id, load_number').eq('quote_id', quoteId).maybeSingle()
  return data as { id: string; load_number: string } | null
}

async function ensureBookedLoad(admin: AdminClient, quote: QuoteRow) {
  const alreadyCreated = await existingLoad(admin, quote.id)
  if (alreadyCreated) {
    if (quote.converted_load_id !== alreadyCreated.id) {
      await admin.from('quotes').update({ converted_load_id: alreadyCreated.id }).eq('id', quote.id)
      quote.converted_load_id = alreadyCreated.id
    }
    return alreadyCreated
  }

  const request = requestFor(quote)
  const customerId = await findCustomer(admin, quote)
  const pickupAt = appointment(request, 'pickup_date', 'pickup_time_window')
  const deliveryAt = appointment(request, 'delivery_date', 'delivery_time_window')
  const loadedMiles = Number(quote.estimated_mileage || 0)
  const loadNumber = `LH-${quote.quote_number.replace(/\D/g, '').slice(-6) || Date.now().toString().slice(-6)}`

  const { data, error } = await admin.from('loads').insert({
    company_id: quote.company_id,
    quote_id: quote.id,
    load_request_id: quote.load_request_id,
    load_number: loadNumber,
    customer_id: customerId,
    status: 'booked',
    pickup_company: text(request, 'pickup_company') || text(request, 'requester_company') || null,
    pickup_address: text(request, 'pickup_address'),
    pickup_city: text(request, 'pickup_city'),
    pickup_state: text(request, 'pickup_state').toUpperCase(),
    pickup_contact: text(request, 'pickup_contact') || text(request, 'requester_name') || null,
    pickup_phone: text(request, 'pickup_phone') || text(request, 'requester_phone') || null,
    pickup_at: pickupAt,
    pickup_instructions: text(request, 'pickup_instructions') || null,
    delivery_company: text(request, 'delivery_company') || null,
    delivery_address: text(request, 'delivery_address'),
    delivery_city: text(request, 'delivery_city'),
    delivery_state: text(request, 'delivery_state').toUpperCase(),
    delivery_contact: text(request, 'delivery_contact') || null,
    delivery_phone: text(request, 'delivery_phone') || null,
    delivery_at: deliveryAt,
    delivery_instructions: text(request, 'delivery_instructions') || null,
    freight_description: text(request, 'freight_description'),
    pieces: numberValue(request, 'pieces'),
    estimated_weight: numberValue(request, 'estimated_weight'),
    dimensions: text(request, 'dimensions') || null,
    equipment_requirements: text(request, 'equipment_requirements') || null,
    securement_requirements: text(request, 'securement_requirements') || null,
    customer_rate: quote.total_amount,
    loaded_miles: loadedMiles,
    route_distance_meters: loadedMiles > 0 ? Math.round(loadedMiles * metersPerMile) : null,
    route_provider: loadedMiles > 0 ? 'accepted_quote' : null,
    route_calculated_at: loadedMiles > 0 ? quote.accepted_at : null,
    current_eta: deliveryAt,
    created_by: quote.created_by,
  }).select('id, load_number').single()

  if (error) {
    const duplicate = await existingLoad(admin, quote.id)
    if (duplicate) return duplicate
    throw error
  }

  await Promise.all([
    admin.from('load_status_history').insert({
      company_id: quote.company_id,
      load_id: data.id,
      status: 'booked',
      note: `Automatically booked from accepted quote ${quote.quote_number}`,
      changed_by: quote.created_by,
    }),
    admin.from('load_requests').update({ status: 'converted' }).eq('id', quote.load_request_id),
    admin.from('quotes').update({ converted_load_id: data.id }).eq('id', quote.id),
  ])
  quote.converted_load_id = data.id
  return data as { id: string; load_number: string }
}

async function notificationRecipients(admin: AdminClient, quote: QuoteRow, env: AdminEnv) {
  const recipients = new Set<string>()
  if (env.QUOTE_APPROVAL_NOTIFY_EMAIL?.trim()) recipients.add(env.QUOTE_APPROVAL_NOTIFY_EMAIL.trim())

  const { data: profiles } = await admin.from('profiles')
    .select('id')
    .eq('company_id', quote.company_id)
    .eq('is_active', true)
    .in('role', ['owner', 'dispatcher'])

  for (const profile of profiles || []) {
    const { data } = await admin.auth.admin.getUserById(profile.id)
    if (data.user?.email) recipients.add(data.user.email)
  }
  return [...recipients]
}

async function sendApprovalNotification(admin: AdminClient, quote: QuoteRow, load: { id: string; load_number: string }, env: AdminEnv) {
  if (quote.approval_notification_sent_at || !env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) return
  const recipients = await notificationRecipients(admin, quote, env)
  if (!recipients.length) return

  const request = requestFor(quote)
  const appUrl = (env.APP_URL || 'https://legacy-hotshot.pages.dev').replace(/\/$/, '')
  const loadUrl = `${appUrl}/loads/${encodeURIComponent(load.id)}`
  const customer = text(request, 'requester_company') || text(request, 'requester_name') || 'Customer'
  const route = `${text(request, 'pickup_city')}, ${text(request, 'pickup_state')} → ${text(request, 'delivery_city')}, ${text(request, 'delivery_state')}`
  const acceptedAt = quote.accepted_at ? new Date(quote.accepted_at).toLocaleString('en-US') : 'Just now'
  const fromName = env.RESEND_FROM_NAME || 'Legacy Hotshot'
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(quote.total_amount)
  const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] || character))

  const html = `<!doctype html><html><body style="margin:0;background:#f3f5f7;font-family:Arial,sans-serif;color:#1a2530"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:34px 16px"><table role="presentation" width="620" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border-radius:18px;overflow:hidden"><tr><td style="background:#152535;padding:28px 34px"><div style="font-size:12px;letter-spacing:2px;color:#d7a23a;font-weight:700">LEGACY HOTSHOT</div><div style="font-size:28px;color:#fff;font-weight:800;margin-top:7px">Quote approved</div></td></tr><tr><td style="padding:34px"><p style="font-size:17px;margin:0 0 20px"><strong>${escapeHtml(customer)}</strong> accepted quote ${escapeHtml(quote.quote_number)}.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fa;border:1px solid #e3e8ed;border-radius:12px"><tr><td style="padding:18px"><div style="font-size:12px;color:#6b7782">APPROVED BY</div><strong>${escapeHtml(quote.accepted_by_name || 'Customer')}</strong></td><td style="padding:18px"><div style="font-size:12px;color:#6b7782">AMOUNT</div><strong>${money}</strong></td></tr><tr><td style="padding:18px"><div style="font-size:12px;color:#6b7782">ROUTE</div><strong>${escapeHtml(route)}</strong></td><td style="padding:18px"><div style="font-size:12px;color:#6b7782">ACCEPTED</div><strong>${escapeHtml(acceptedAt)}</strong></td></tr></table><p style="margin:22px 0">Booked load <strong>${escapeHtml(load.load_number)}</strong> was created automatically and is ready for scheduling and driver assignment.</p><a href="${loadUrl}" style="display:inline-block;background:#d7a23a;color:#152535;text-decoration:none;font-weight:800;padding:14px 20px;border-radius:8px">Open Booked Load</a></td></tr></table></td></tr></table></body></html>`

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${fromName} <${env.RESEND_FROM_EMAIL}>`,
      to: recipients,
      subject: `${quote.quote_number} approved · ${load.load_number} booked`,
      html,
    }),
  })

  if (response.ok) {
    const sentAt = new Date().toISOString()
    await admin.from('quotes').update({ approval_notification_sent_at: sentAt }).eq('id', quote.id).is('approval_notification_sent_at', null)
    quote.approval_notification_sent_at = sentAt
  }
}

async function completeApprovalHandoff(admin: AdminClient, quote: QuoteRow, env: AdminEnv) {
  const load = await ensureBookedLoad(admin, quote)
  await sendApprovalNotification(admin, quote, load, env)
  return load
}

export const onRequestGet = async ({ env, params }: Context): Promise<Response> => {
  try {
    const token = params.token?.trim()
    if (!token) return jsonResponse({ error: 'Quote token is required.' }, 400)
    const { admin, quote } = await getQuote(env, token)
    let loadNumber: string | null = null
    if (quote.accepted_at) {
      try { loadNumber = (await completeApprovalHandoff(admin, quote, env)).load_number } catch (error) { console.error('Quote approval handoff retry failed', error) }
    }
    return jsonResponse(publicPayload(quote, loadNumber))
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
    if (quote.status === 'declined' || quote.status === 'expired') return jsonResponse({ error: `This quote can no longer be accepted because it is ${quote.status}.` }, 409)
    if (quote.expires_at && new Date(quote.expires_at).getTime() < Date.now()) return jsonResponse({ error: 'This quote has expired. Please contact Legacy Hotshot for updated pricing.' }, 409)

    if (!quote.accepted_at) {
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
        if (!latest.quote.accepted_at) throw error || new Error('Unable to accept this quote.')
        Object.assign(quote, latest.quote)
      } else {
        Object.assign(quote, data as unknown as QuoteRow)
      }
    }

    let loadNumber: string | null = null
    try {
      loadNumber = (await completeApprovalHandoff(admin, quote, env)).load_number
    } catch (error) {
      console.error('Quote accepted but automatic booking handoff failed', error)
    }

    return jsonResponse(publicPayload(quote, loadNumber))
  } catch (error) {
    return responseFromError(error)
  }
}
