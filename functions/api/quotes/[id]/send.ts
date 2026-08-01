import { jsonResponse, requireCompanyUser, responseFromError } from '../../../_shared/admin'
import type { AdminEnv } from '../../../_shared/admin'

type Context = { request: Request; env: AdminEnv; params: { id?: string } }

type QuoteRow = {
  id: string
  company_id: string
  quote_number: string
  total_amount: number
  expires_at: string | null
  public_token: string
  status: string
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

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char))

export const onRequestPost = async ({ request, env, params }: Context): Promise<Response> => {
  try {
    const { admin, profile } = await requireCompanyUser(request, env)
    const quoteId = params.id?.trim()
    if (!quoteId) return jsonResponse({ error: 'Quote ID is required.' }, 400)
    if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) return jsonResponse({ error: 'Quote email delivery is not configured.' }, 503)

    const { data, error } = await admin.from('quotes')
      .select('id, company_id, quote_number, total_amount, expires_at, public_token, status, load_requests(requester_company, requester_name, requester_email, pickup_city, pickup_state, delivery_city, delivery_state, freight_description)')
      .eq('id', quoteId).eq('company_id', profile.company_id).single()
    if (error || !data) return jsonResponse({ error: 'Quote not found.' }, 404)
    const quote = data as unknown as QuoteRow
    const recipient = quote.load_requests?.requester_email?.trim()
    if (!recipient) return jsonResponse({ error: 'The load request does not have a recipient email address.' }, 400)

    const appUrl = (env.APP_URL || 'https://legacy-hotshot.pages.dev').replace(/\/$/, '')
    const quoteUrl = `${appUrl}/quote/${encodeURIComponent(quote.public_token)}`
    const customerName = quote.load_requests?.requester_name || 'Customer'
    const company = quote.load_requests?.requester_company || customerName
    const route = `${quote.load_requests?.pickup_city || 'Pickup'}, ${quote.load_requests?.pickup_state || ''} to ${quote.load_requests?.delivery_city || 'Delivery'}, ${quote.load_requests?.delivery_state || ''}`
    const expires = quote.expires_at ? new Date(quote.expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'No expiration date'
    const fromName = env.RESEND_FROM_NAME || 'Legacy Hotshot'

    const html = `<!doctype html><html><body style="margin:0;background:#f3f5f7;font-family:Arial,sans-serif;color:#1a2530"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:34px 16px"><table role="presentation" width="620" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 35px rgba(15,32,46,.12)"><tr><td style="background:#152535;padding:28px 34px"><div style="font-size:12px;letter-spacing:2px;color:#d7a23a;font-weight:700">LEGACY HOTSHOT</div><div style="font-size:28px;color:#ffffff;font-weight:800;margin-top:7px">Your transportation quote is ready</div></td></tr><tr><td style="padding:34px"><p style="margin:0 0 18px;font-size:17px">Hello ${escapeHtml(customerName)},</p><p style="margin:0 0 24px;line-height:1.6;color:#4b5965">We prepared quote <strong>${escapeHtml(quote.quote_number)}</strong> for ${escapeHtml(company)}. Review the shipment details and accept the quote securely online.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fa;border:1px solid #e3e8ed;border-radius:12px"><tr><td style="padding:18px"><div style="font-size:12px;color:#6b7782;text-transform:uppercase;letter-spacing:1px">Route</div><div style="font-weight:700;margin-top:5px">${escapeHtml(route)}</div></td><td style="padding:18px;text-align:right"><div style="font-size:12px;color:#6b7782;text-transform:uppercase;letter-spacing:1px">Quote total</div><div style="font-size:24px;font-weight:800;color:#152535;margin-top:5px">${money(quote.total_amount)}</div></td></tr></table><p style="color:#68747f;font-size:13px;margin:16px 0 26px">Valid through ${escapeHtml(expires)}.</p><table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="padding-right:10px"><a href="${quoteUrl}" style="display:inline-block;background:#152535;color:#fff;text-decoration:none;font-weight:700;padding:14px 20px;border-radius:8px">View Quote</a></td><td><a href="${quoteUrl}#accept" style="display:inline-block;background:#d7a23a;color:#152535;text-decoration:none;font-weight:800;padding:14px 20px;border-radius:8px">Accept Quote</a></td></tr></table><p style="font-size:12px;color:#7a858e;line-height:1.5;margin:28px 0 0">Acceptance requires the recipient to type their name. The approval date, quote amount, and quote version are recorded with the quote.</p></td></tr><tr><td style="background:#eef1f4;padding:20px 34px;color:#69757f;font-size:12px">Legacy Hotshot · Professional hotshot transportation</td></tr></table></td></tr></table></body></html>`

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${fromName} <${env.RESEND_FROM_EMAIL}>`, to: [recipient], subject: `${quote.quote_number} · Legacy Hotshot Quote`, html }),
    })
    const payload = await response.json() as { id?: string; message?: string }
    if (!response.ok) return jsonResponse({ error: payload.message || 'Unable to send the quote email.' }, response.status)

    await admin.from('quotes').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', quote.id)
    return jsonResponse({ sent: true, emailId: payload.id, recipient, quoteUrl })
  } catch (error) {
    return responseFromError(error)
  }
}
