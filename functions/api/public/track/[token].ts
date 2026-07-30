import { createAdminClient, jsonResponse, responseFromError } from '../../../_shared/admin'
import type { AdminEnv } from '../../../_shared/admin'

type Context = {
  request: Request
  env: AdminEnv
  params: { token?: string }
}

type TrackingVisibility = 'exact' | 'approximate' | 'city_state' | 'milestones_only'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const publicLoadFields = [
  'id',
  'company_id',
  'load_number',
  'customer_id',
  'assigned_driver_id',
  'status',
  'pickup_company',
  'pickup_city',
  'pickup_state',
  'pickup_at',
  'delivery_company',
  'delivery_city',
  'delivery_state',
  'delivery_at',
  'freight_description',
  'current_eta',
  'customer_visible_notes',
  'tracking_visibility',
  'location_last_updated_at',
  'location_last_latitude',
  'location_last_longitude',
].join(',')

export const onRequestGet = async ({ env, params }: Context): Promise<Response> => {
  try {
    const token = params.token?.trim() || ''
    if (!uuidPattern.test(token)) return jsonResponse({ error: 'This tracking link is invalid.' }, 400)

    const admin = createAdminClient(env)
    const { data: load, error: loadError } = await admin
      .from('loads')
      .select(publicLoadFields)
      .eq('tracking_token', token)
      .maybeSingle()

    if (loadError) throw loadError
    if (!load) return jsonResponse({ error: 'This shipment could not be found.' }, 404)

    const [companyResult, settingsResult, driverResult, historyResult, documentsResult] = await Promise.all([
      admin.from('companies').select('display_name').eq('id', load.company_id).maybeSingle(),
      admin.from('company_settings').select('company_phone, company_email, logo_path').eq('company_id', load.company_id).maybeSingle(),
      load.assigned_driver_id
        ? admin.from('profiles').select('full_name').eq('id', load.assigned_driver_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      admin
        .from('load_status_history')
        .select('status, created_at')
        .eq('load_id', load.id)
        .order('created_at', { ascending: true }),
      admin
        .from('documents')
        .select('id, type, file_name, storage_path, created_at')
        .eq('load_id', load.id)
        .eq('customer_visible', true)
        .order('created_at', { ascending: false }),
    ])

    if (companyResult.error) throw companyResult.error
    if (settingsResult.error) throw settingsResult.error
    if (driverResult.error) throw driverResult.error
    if (historyResult.error) throw historyResult.error
    if (documentsResult.error) throw documentsResult.error

    const documents = await Promise.all((documentsResult.data || []).map(async (document) => {
      const { data, error } = await admin.storage.from('legacy-documents').createSignedUrl(document.storage_path, 900)
      return {
        id: document.id,
        type: document.type,
        fileName: document.file_name,
        createdAt: document.created_at,
        url: error ? null : data.signedUrl,
      }
    }))

    const visibility = load.tracking_visibility as TrackingVisibility
    const exactLatitude = load.location_last_latitude === null ? null : Number(load.location_last_latitude)
    const exactLongitude = load.location_last_longitude === null ? null : Number(load.location_last_longitude)
    const location = visibility === 'exact' && exactLatitude !== null && exactLongitude !== null
      ? { latitude: exactLatitude, longitude: exactLongitude, precision: 'exact' }
      : visibility === 'approximate' && exactLatitude !== null && exactLongitude !== null
        ? { latitude: Number(exactLatitude.toFixed(2)), longitude: Number(exactLongitude.toFixed(2)), precision: 'approximate' }
        : null

    const driverName = driverResult.data?.full_name?.trim()
    const driverFirstName = driverName ? driverName.split(/\s+/)[0] : null

    return jsonResponse({
      company: {
        name: companyResult.data?.display_name || 'Legacy Hotshot',
        phone: settingsResult.data?.company_phone || null,
        email: settingsResult.data?.company_email || null,
      },
      load: {
        loadNumber: load.load_number,
        status: load.status,
        pickup: {
          company: load.pickup_company || null,
          city: load.pickup_city,
          state: load.pickup_state,
          scheduledAt: load.pickup_at,
        },
        delivery: {
          company: load.delivery_company || null,
          city: load.delivery_city,
          state: load.delivery_state,
          scheduledAt: load.delivery_at,
        },
        freightDescription: load.freight_description,
        currentEta: load.current_eta,
        customerNotes: load.customer_visible_notes || null,
        driverFirstName,
        trackingVisibility: visibility,
        lastLocationAt: load.location_last_updated_at,
        location,
      },
      history: historyResult.data || [],
      documents,
      refreshedAt: new Date().toISOString(),
    })
  } catch (error) {
    return responseFromError(error)
  }
}
