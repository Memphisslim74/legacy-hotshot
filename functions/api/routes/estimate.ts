import { jsonResponse, requireCompanyUser, responseFromError } from '../../_shared/admin'
import type { AdminEnv } from '../../_shared/admin'

type Context = { request: Request; env: AdminEnv }

type RouteRequest = {
  origin: string
  destination: string
}

type GoogleRouteResponse = {
  routes?: Array<{
    distanceMeters?: number
    duration?: string
  }>
  error?: { message?: string }
}

const parseDurationSeconds = (value?: string) => {
  const match = value?.match(/^(\d+(?:\.\d+)?)s$/)
  return match ? Math.round(Number(match[1])) : null
}

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  try {
    await requireCompanyUser(request, env)
    if (!env.GOOGLE_MAPS_ROUTES_API_KEY) return jsonResponse({ error: 'Google Routes is not configured.' }, 503)

    const body = await request.json() as RouteRequest
    const origin = body.origin?.trim()
    const destination = body.destination?.trim()
    if (!origin || !destination) return jsonResponse({ error: 'Pickup and delivery addresses are required.' }, 400)

    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': env.GOOGLE_MAPS_ROUTES_API_KEY,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
      },
      body: JSON.stringify({
        origin: { address: origin },
        destination: { address: destination },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_UNAWARE',
        units: 'IMPERIAL',
      }),
    })

    const payload = await response.json() as GoogleRouteResponse
    if (!response.ok) return jsonResponse({ error: payload.error?.message || 'Unable to calculate this route.' }, response.status)

    const route = payload.routes?.[0]
    const distanceMeters = route?.distanceMeters ?? null
    const durationSeconds = parseDurationSeconds(route?.duration)
    if (distanceMeters === null || durationSeconds === null) return jsonResponse({ error: 'No drivable route was returned.' }, 422)

    return jsonResponse({
      distanceMeters,
      durationSeconds,
      loadedMiles: Math.round((distanceMeters / 1609.344) * 10) / 10,
      provider: 'google_routes',
      calculatedAt: new Date().toISOString(),
    })
  } catch (error) {
    return responseFromError(error)
  }
}
