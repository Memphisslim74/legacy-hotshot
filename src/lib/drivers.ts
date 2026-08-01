import { supabase } from './supabase'
import type { LoadRecord } from '../types'

export type DriverSummary = {
  id: string
  full_name: string
  phone: string | null
  is_active: boolean
  setup_complete: boolean
}

export type DriverAssignmentResult = {
  load: LoadRecord
  notified: boolean
  driverEmail: string | null
  notificationError: string | null
}

const requireClient = () => {
  if (!supabase) throw new Error('Supabase is not connected.')
  return supabase
}

export async function listDrivers(companyId: string): Promise<DriverSummary[]> {
  const { data, error } = await requireClient()
    .from('profiles')
    .select('id, full_name, phone, is_active, setup_complete')
    .eq('company_id', companyId)
    .eq('role', 'driver')
    .order('full_name')
  if (error) throw error
  return (data ?? []) as DriverSummary[]
}

export async function assignDriverToLoad(
  _companyId: string,
  _changedBy: string,
  load: LoadRecord,
  driver: DriverSummary | null,
): Promise<DriverAssignmentResult> {
  if (driver && !driver.is_active) throw new Error('This driver account is inactive and cannot be assigned.')

  const { data: sessionData, error: sessionError } = await requireClient().auth.getSession()
  if (sessionError) throw sessionError
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('Your session has expired. Sign in again before assigning a driver.')

  const response = await fetch(`/api/loads/${encodeURIComponent(load.id)}/assign-driver`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ driverId: driver?.id ?? null }),
  })

  const payload = await response.json() as DriverAssignmentResult & { error?: string }
  if (!response.ok) throw new Error(payload.error || 'Unable to update the driver assignment.')
  return payload
}
