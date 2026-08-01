import { supabase } from './supabase'

export type RouteEstimate = {
  distanceMeters: number
  durationSeconds: number
  loadedMiles: number
  provider: string
  calculatedAt: string
}

export async function estimateRoute(origin: string, destination: string): Promise<RouteEstimate> {
  if (!supabase) throw new Error('Supabase is not connected.')
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Your session has expired. Sign in again.')

  const response = await fetch('/api/routes/estimate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ origin, destination }),
  })
  const payload = await response.json() as RouteEstimate & { error?: string }
  if (!response.ok) throw new Error(payload.error || 'Unable to calculate this route.')
  return payload
}

export function formatDriveTime(seconds: number | null | undefined) {
  if (!seconds) return 'Not calculated'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  if (!hours) return `${minutes} min`
  return `${hours} hr ${minutes} min`
}
