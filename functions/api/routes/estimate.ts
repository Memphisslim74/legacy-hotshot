import { jsonResponse, requireCompanyUser, responseFromError } from '../../_shared/admin'
import type { AdminEnv } from '../../_shared/admin'

type Context = { request: Request; env: AdminEnv }

type RouteRequest = {
  origin: string
  destination: string
}

type GeocodeResponse = {
  features?: Array<{
    geometry?: { coordinates?: [number, number] }
  }>
  error?: { message?: string }
}

type DirectionsResponse = {
  routes?: Array<{
    summary?: {
      distance?: number
      duration?: number
    }
  }>
  error?: { message?: string }
}

async function geocodeAddress(address: string, apiKey: string) {
  const url = new URL('https://api.openrouteservice.org/geocode/search')
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('text', address)
  url.searchParams.set('size', '1')
  url.searchParams.set('boundary.country', 'US')

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })
  const payload = await response.json() as GeocodeResponse
  if (!response.ok) throw new Error(payload.error?.message || `Unable to locate ${address}.`)

  const coordinates = payload.features?.[0]?.geometry?.coordinates
  if (!coordinates || coordinates.length !== 2) throw new Error(`No matching location was found for ${address}.`)
  return coordinates
}

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  try {
    await requireCompanyUser(request, env)
    const apiKey = env.OPENROUTESERVICE_API_KEY
    if (!apiKey) return jsonResponse({ error: 'Route calculations are not configured.' }, 503)

    const body = await request.json() as RouteRequest
    const origin = body.origin?.trim()
    const destination = body.destination?.trim()
    if (!origin || !destination) return jsonResponse({ error: 'Pickup and delivery addresses are required.' }, 400)

    const [originCoordinates, destinationCoordinates] = await Promise.all([
      geocodeAddress(origin, apiKey),
      geocodeAddress(destination, apiKey),
    ])

    const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-hgv', {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        coordinates: [originCoordinates, destinationCoordinates],
        instructions: false,
        preference: 'recommended',
        units: 'mi',
      }),
    })

    const payload = await response.json() as DirectionsResponse
    if (!response.ok) return jsonResponse({ error: payload.error?.message || 'Unable to calculate this route.' }, response.status)

    const summary = payload.routes?.[0]?.summary
    const distanceMeters = summary?.distance ?? null
    const durationSeconds = summary?.duration ?? null
    if (distanceMeters === null || durationSeconds === null) return jsonResponse({ error: 'No drivable route was returned.' }, 422)

    return jsonResponse({
      distanceMeters: Math.round(distanceMeters),
      durationSeconds: Math.round(durationSeconds),
      loadedMiles: Math.round((distanceMeters / 1609.344) * 10) / 10,
      provider: 'openrouteservice',
      calculatedAt: new Date().toISOString(),
    })
  } catch (error) {
    return responseFromError(error)
  }
}
