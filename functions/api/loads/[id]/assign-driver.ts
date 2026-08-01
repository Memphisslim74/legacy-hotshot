import { jsonResponse, requireCompanyUser, responseFromError } from '../../../_shared/admin'
import type { AdminEnv } from '../../../_shared/admin'

type Context = { request: Request; env: AdminEnv; params: { id?: string } }
type AssignmentBody = { driverId?: string | null }

type LoadRow = {
  id: string
  company_id: string
  load_number: string
  status: string
  pickup_city: string
  pickup_state: string
  pickup_at: string | null
  delivery_city: string
  delivery_state: string
  delivery_at: string | null
  freight_description: string
  loaded_miles: number | null
}

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] || character))

export async function onRequestPost(context: Context) {
  try {
    const loadId = context.params.id?.trim()
    if (!loadId) return jsonResponse({ error: 'Load ID is required.' }, 400)

    const { admin, profile } = await requireCompanyUser(context.request, context.env)
    if (!['owner', 'dispatcher'].includes(profile.role)) return jsonResponse({ error: 'Only owners and dispatchers can assign drivers.' }, 403)

    const body = await context.request.json().catch(() => ({})) as AssignmentBody
    const driverId = typeof body.driverId === 'string' && body.driverId.trim() ? body.driverId.trim() : null

    const { data: loadData, error: loadError } = await admin.from('loads')
      .select('id, company_id, load_number, status, pickup_city, pickup_state, pickup_at, delivery_city, delivery_state, delivery_at, freight_description, loaded_miles')
      .eq('id', loadId)
      .eq('company_id', profile.company_id)
      .single()
    if (loadError || !loadData) return jsonResponse({ error: 'Load not found for this company.' }, 404)
    const load = loadData as LoadRow

    let driver: { id: string; full_name: string; phone: string | null; is_active: boolean } | null = null
    let driverEmail: string | null = null
    if (driverId) {
      const { data: driverData, error: driverError } = await admin.from('profiles')
        .select('id, full_name, phone, is_active')
        .eq('id', driverId)
        .eq('company_id', profile.company_id)
        .eq('role', 'driver')
        .single()
      if (driverError || !driverData) return jsonResponse({ error: 'Driver not found for this company.' }, 404)
      if (!driverData.is_active) return jsonResponse({ error: 'This driver account is inactive and cannot be assigned.' }, 409)
      driver = driverData
      const { data: authData } = await admin.auth.admin.getUserById(driver.id)
      driverEmail = authData.user?.email || null
    }

    const nextStatus = driver
      ? (load.status === 'booked' ? 'driver_assigned' : load.status)
      : (load.status === 'driver_assigned' ? 'booked' : load.status)

    const { data: updated, error: updateError } = await admin.from('loads')
      .update({ assigned_driver_id: driver?.id ?? null, status: nextStatus })
      .eq('id', load.id)
      .eq('company_id', profile.company_id)
      .select('*')
      .single()
    if (updateError) throw updateError

    const note = driver ? `${driver.full_name} assigned to ${load.load_number}` : `Driver assignment removed from ${load.load_number}`
    const { error: historyError } = await admin.from('load_status_history').insert({
      company_id: profile.company_id,
      load_id: load.id,
      status: nextStatus,
      note,
      changed_by: profile.id,
    })
    if (historyError) throw historyError

    let notified = false
    let notificationError: string | null = null
    if (driver && driverEmail && context.env.RESEND_API_KEY && context.env.RESEND_FROM_EMAIL) {
      const appUrl = (context.env.APP_URL || 'https://legacy-hotshot.pages.dev').replace(/\/$/, '')
      const driverUrl = `${appUrl}/driver/loads/${encodeURIComponent(load.id)}`
      const fromName = context.env.RESEND_FROM_NAME || 'Legacy Hotshot'
      const pickup = `${load.pickup_city}, ${load.pickup_state}`
      const delivery = `${load.delivery_city}, ${load.delivery_state}`
      const pickupTime = load.pickup_at ? new Date(load.pickup_at).toLocaleString('en-US') : 'Appointment pending'
      const deliveryTime = load.delivery_at ? new Date(load.delivery_at).toLocaleString('en-US') : 'Appointment pending'
      const html = `<!doctype html><html><body style="margin:0;background:#f3f5f7;font-family:Arial,sans-serif;color:#172735"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:34px 16px"><table role="presentation" width="620" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border-radius:18px;overflow:hidden"><tr><td style="background:#172735;padding:28px 34px"><div style="font-size:12px;letter-spacing:2px;color:#d7a23a;font-weight:700">LEGACY HOTSHOT</div><div style="font-size:28px;color:#fff;font-weight:800;margin-top:7px">New load assignment</div></td></tr><tr><td style="padding:34px"><p style="font-size:17px;margin:0 0 20px">${escapeHtml(driver.full_name)}, you have been assigned to <strong>${escapeHtml(load.load_number)}</strong>.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fa;border:1px solid #e3e8ed;border-radius:12px"><tr><td style="padding:17px"><div style="font-size:11px;color:#6b7782">PICKUP</div><strong>${escapeHtml(pickup)}</strong><div style="margin-top:5px;color:#5e6a74">${escapeHtml(pickupTime)}</div></td><td style="padding:17px"><div style="font-size:11px;color:#6b7782">DELIVERY</div><strong>${escapeHtml(delivery)}</strong><div style="margin-top:5px;color:#5e6a74">${escapeHtml(deliveryTime)}</div></td></tr><tr><td colspan="2" style="padding:0 17px 17px"><div style="font-size:11px;color:#6b7782">FREIGHT</div><strong>${escapeHtml(load.freight_description)}</strong><div style="margin-top:5px;color:#5e6a74">${Number(load.loaded_miles || 0).toLocaleString()} loaded miles</div></td></tr></table><div style="margin-top:26px"><a href="${driverUrl}" style="display:inline-block;background:#d39a2c;color:#172735;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:8px">Open Driver Workflow</a></div><p style="margin:24px 0 0;color:#6a7680;font-size:13px">Open the assignment before departure to review addresses, contacts, instructions, and required documents.</p></td></tr></table></td></tr></table></body></html>`
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${context.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `${fromName} <${context.env.RESEND_FROM_EMAIL}>`, to: [driverEmail], subject: `New assignment: ${load.load_number} · ${pickup} to ${delivery}`, html }),
      })
      notified = response.ok
      if (!response.ok) notificationError = 'The load was assigned, but the driver email could not be sent.'
    } else if (driver) {
      notificationError = driverEmail ? 'The load was assigned, but email delivery is not configured.' : 'The load was assigned, but the driver account has no email address.'
    }

    return jsonResponse({
      load: { ...updated, assigned_driver: driver ? { id: driver.id, full_name: driver.full_name, phone: driver.phone } : null },
      notified,
      driverEmail,
      notificationError,
    })
  } catch (error) {
    return responseFromError(error)
  }
}
