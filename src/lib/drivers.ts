import { supabase } from './supabase'
import type { LoadRecord } from '../types'

export type DriverSummary = {
  id: string
  full_name: string
  phone: string | null
  is_active: boolean
  setup_complete: boolean
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
  companyId: string,
  changedBy: string,
  load: LoadRecord,
  driver: DriverSummary | null,
) {
  if (driver && !driver.is_active) throw new Error('This driver account is inactive and cannot be assigned.')

  const nextStatus: LoadRecord['status'] = driver
    ? (load.status === 'booked' ? 'driver_assigned' : load.status)
    : (load.status === 'driver_assigned' ? 'booked' : load.status)

  const { data, error } = await requireClient()
    .from('loads')
    .update({ assigned_driver_id: driver?.id ?? null, status: nextStatus })
    .eq('id', load.id)
    .eq('company_id', companyId)
    .select('*')
    .single()
  if (error) throw error

  const note = driver
    ? `${driver.full_name} assigned to ${load.load_number}`
    : `Driver assignment removed from ${load.load_number}`

  const { error: historyError } = await requireClient().from('load_status_history').insert({
    company_id: companyId,
    load_id: load.id,
    status: nextStatus,
    note,
    changed_by: changedBy,
  })
  if (historyError) throw historyError

  return data as LoadRecord
}
