import { supabase } from './supabase'
import type {
  DriverChecklistItem,
  DriverTimeEvent,
  DriverTimeEventType,
  LoadRecord,
  LocationSession,
  TrackingVisibility,
  UserRole,
} from '../types'

const requireClient = () => {
  if (!supabase) throw new Error('Supabase is not connected.')
  return supabase
}

export async function listDriverLoads(companyId: string, userId: string, role: UserRole): Promise<LoadRecord[]> {
  let query = requireClient()
    .from('loads')
    .select('*, customers(company_name), assigned_driver:profiles!loads_assigned_driver_id_fkey(full_name)')
    .eq('company_id', companyId)
    .order('pickup_at', { ascending: true, nullsFirst: false })

  if (role === 'driver') query = query.eq('assigned_driver_id', userId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as LoadRecord[]
}

export async function listDriverChecklist(loadId: string): Promise<DriverChecklistItem[]> {
  const { data, error } = await requireClient()
    .from('load_checklist_items')
    .select('*')
    .eq('load_id', loadId)
    .order('phase')
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as DriverChecklistItem[]
}

export async function setChecklistItem(values: {
  itemId: string
  userId: string
  completed: boolean
  notes?: string
}) {
  const { error } = await requireClient()
    .from('load_checklist_items')
    .update({
      completed_at: values.completed ? new Date().toISOString() : null,
      completed_by: values.completed ? values.userId : null,
      notes: values.notes?.trim() || null,
    })
    .eq('id', values.itemId)
  if (error) throw error
}

export async function listDriverTimeEvents(loadId: string): Promise<DriverTimeEvent[]> {
  const { data, error } = await requireClient()
    .from('driver_time_events')
    .select('*')
    .eq('load_id', loadId)
    .order('occurred_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as DriverTimeEvent[]
}

export async function addDriverTimeEvent(values: {
  companyId: string
  loadId: string
  userId: string
  eventType: DriverTimeEventType
  notes?: string
  latitude?: number
  longitude?: number
}): Promise<DriverTimeEvent> {
  const { data, error } = await requireClient()
    .from('driver_time_events')
    .insert({
      company_id: values.companyId,
      load_id: values.loadId,
      driver_id: values.userId,
      event_type: values.eventType,
      notes: values.notes?.trim() || null,
      latitude: values.latitude ?? null,
      longitude: values.longitude ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as DriverTimeEvent
}

export async function getActiveLocationSession(loadId: string, userId: string): Promise<LocationSession | null> {
  const { data, error } = await requireClient()
    .from('location_sharing_sessions')
    .select('*')
    .eq('load_id', loadId)
    .eq('driver_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  if (error) throw error
  return data as LocationSession | null
}

export async function startLocationSession(values: {
  companyId: string
  loadId: string
  userId: string
  visibility: TrackingVisibility
}): Promise<LocationSession> {
  const existing = await getActiveLocationSession(values.loadId, values.userId)
  if (existing) return existing

  const { data, error } = await requireClient()
    .from('location_sharing_sessions')
    .insert({
      company_id: values.companyId,
      load_id: values.loadId,
      driver_id: values.userId,
      visibility: values.visibility,
      status: 'active',
    })
    .select('*')
    .single()
  if (error) throw error
  return data as LocationSession
}

export async function stopLocationSession(sessionId: string) {
  const { error } = await requireClient()
    .from('location_sharing_sessions')
    .update({ status: 'stopped', ended_at: new Date().toISOString() })
    .eq('id', sessionId)
  if (error) throw error
}

export async function recordDriverLocation(values: {
  loadId: string
  sessionId: string
  latitude: number
  longitude: number
  accuracy: number
}) {
  const { error } = await requireClient().rpc('record_driver_location', {
    requested_load_id: values.loadId,
    requested_session_id: values.sessionId,
    requested_latitude: values.latitude,
    requested_longitude: values.longitude,
    requested_accuracy: values.accuracy,
  })
  if (error) throw error
}

export async function updateLoadTrackingPreferences(values: {
  loadId: string
  visibility: TrackingVisibility
  allowed: boolean
}) {
  const { error } = await requireClient()
    .from('loads')
    .update({
      tracking_visibility: values.visibility,
      driver_location_sharing_allowed: values.allowed,
    })
    .eq('id', values.loadId)
  if (error) throw error
}
