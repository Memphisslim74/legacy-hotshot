import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { demoChecklist, demoDriverLoad, demoTimeEvents } from '../data/driverDemo'
import {
  addDriverTimeEvent,
  getActiveLocationSession,
  listDriverChecklist,
  listDriverLoads,
  listDriverTimeEvents,
  recordDriverLocation,
  setChecklistItem,
  startLocationSession,
  stopLocationSession,
} from '../lib/driverOperations'
import { uploadLegacyDocument } from '../lib/documents'
import { updateLoadStatus } from '../lib/operations'
import type {
  DriverChecklistItem,
  DriverChecklistPhase,
  DriverTimeEvent,
  DriverTimeEventType,
  LoadRecord,
  LoadStatus,
  LocationSession,
} from '../types'

const statusActions: Array<{ status: LoadStatus; label: string; event?: DriverTimeEventType }> = [
  { status: 'en_route_to_pickup', label: 'Start Trip', event: 'en_route_to_pickup' },
  { status: 'arrived_at_pickup', label: 'Arrived at Pickup', event: 'arrived_at_pickup' },
  { status: 'loaded', label: 'Pickup Complete', event: 'departed_pickup' },
  { status: 'in_transit', label: 'In Transit' },
  { status: 'arrived_at_delivery', label: 'Arrived at Delivery', event: 'arrived_at_delivery' },
  { status: 'delivered', label: 'Mark Delivered', event: 'departed_delivery' },
]

const timeActions: Array<{ event: DriverTimeEventType; label: string }> = [
  { event: 'started_work', label: 'Started Work' },
  { event: 'fuel_stop', label: 'Fuel Stop' },
  { event: 'break', label: 'Break' },
  { event: 'finished_work', label: 'Finished Work' },
]

const timeLabels: Record<DriverTimeEventType, string> = {
  started_work: 'Started work',
  en_route_to_pickup: 'En route to pickup',
  arrived_at_pickup: 'Arrived at pickup',
  departed_pickup: 'Departed pickup',
  fuel_stop: 'Fuel stop',
  break: 'Break',
  arrived_at_delivery: 'Arrived at delivery',
  departed_delivery: 'Departed delivery',
  finished_work: 'Finished work',
}

const photoTypes = [
  { value: 'freight_photo', label: 'Freight photo' },
  { value: 'securement_photo', label: 'Securement photo' },
  { value: 'bill_of_lading', label: 'Bill of lading' },
  { value: 'proof_of_delivery', label: 'Proof of delivery' },
  { value: 'receipt', label: 'Receipt' },
] as const

function mapsUrl(address: string, city: string, state: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${address}, ${city}, ${state}`)}`
}

export function DriverLoadPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [load, setLoad] = useState<LoadRecord | null>(null)
  const [checklist, setChecklist] = useState<DriverChecklistItem[]>([])
  const [timeEvents, setTimeEvents] = useState<DriverTimeEvent[]>([])
  const [activeSession, setActiveSession] = useState<LocationSession | null>(null)
  const [activePhase, setActivePhase] = useState<DriverChecklistPhase>('pickup')
  const [photoType, setPhotoType] = useState<(typeof photoTypes)[number]['value']>('freight_photo')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const watchIdRef = useRef<number | null>(null)
  const lastLocationSentRef = useRef(0)

  useEffect(() => {
    let active = true

    const loadData = async () => {
      try {
        if (!user?.companyId || user.demo) {
          if (!active) return
          setLoad(demoDriverLoad)
          setChecklist(demoChecklist)
          setTimeEvents(demoTimeEvents)
          return
        }

        const loads = await listDriverLoads(user.companyId, user.id, user.role)
        const selected = loads.find((item) => item.id === id) || null
        if (!selected) throw new Error('This load is not available to your account.')

        const [items, events, session] = await Promise.all([
          listDriverChecklist(selected.id),
          listDriverTimeEvents(selected.id),
          getActiveLocationSession(selected.id, user.id),
        ])
        if (!active) return
        setLoad(selected)
        setChecklist(items)
        setTimeEvents(events)
        setActiveSession(session)
        if (['arrived_at_delivery', 'delivered', 'pod_received'].includes(selected.status)) setActivePhase('delivery')
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to open this load.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()
    return () => {
      active = false
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [id, user])

  const phaseItems = useMemo(() => checklist.filter((item) => item.phase === activePhase), [checklist, activePhase])
  const phaseCompleted = phaseItems.filter((item) => item.completed_at).length
  const requiredRemaining = phaseItems.filter((item) => item.required && !item.completed_at).length

  const clearNotices = () => {
    setError('')
    setMessage('')
  }

  const toggleChecklist = async (item: DriverChecklistItem) => {
    if (!user) return
    clearNotices()
    const completed = !item.completed_at
    const completedAt = completed ? new Date().toISOString() : null
    setChecklist((current) => current.map((row) => row.id === item.id ? { ...row, completed_at: completedAt, completed_by: completed ? user.id : null } : row))
    try {
      if (!user.demo) await setChecklistItem({ itemId: item.id, userId: user.id, completed })
    } catch (caught) {
      setChecklist((current) => current.map((row) => row.id === item.id ? item : row))
      setError(caught instanceof Error ? caught.message : 'Unable to update the checklist.')
    }
  }

  const addTimeEvent = async (eventType: DriverTimeEventType, note?: string) => {
    if (!user || !load) return
    clearNotices()
    setSaving(true)
    const optimistic: DriverTimeEvent = {
      id: `pending-${Date.now()}`,
      load_id: load.id,
      driver_id: user.id,
      event_type: eventType,
      occurred_at: new Date().toISOString(),
      notes: note || null,
      latitude: null,
      longitude: null,
    }
    setTimeEvents((current) => [optimistic, ...current])
    try {
      if (!user.demo && user.companyId) {
        const saved = await addDriverTimeEvent({ companyId: user.companyId, loadId: load.id, userId: user.id, eventType, notes: note })
        setTimeEvents((current) => current.map((row) => row.id === optimistic.id ? saved : row))
      }
      setMessage(`${timeLabels[eventType]} recorded.`)
    } catch (caught) {
      setTimeEvents((current) => current.filter((row) => row.id !== optimistic.id))
      setError(caught instanceof Error ? caught.message : 'Unable to record the time event.')
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (action: (typeof statusActions)[number]) => {
    if (!user || !load) return
    clearNotices()
    const previous = load.status
    setLoad({ ...load, status: action.status })
    setSaving(true)
    try {
      if (!user.demo && user.companyId) await updateLoadStatus(user.companyId, user.id, load.id, action.status, `Driver update: ${action.label}`)
      if (action.event) await addTimeEvent(action.event)
      if (action.status === 'arrived_at_delivery') setActivePhase('delivery')
      setMessage(`Load status updated to ${action.label}.`)
    } catch (caught) {
      setLoad({ ...load, status: previous })
      setError(caught instanceof Error ? caught.message : 'Unable to update load status.')
    } finally {
      setSaving(false)
    }
  }

  const uploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user || !load) return
    clearNotices()
    setUploading(true)
    try {
      if (!user.demo && user.companyId) {
        await uploadLegacyDocument({
          companyId: user.companyId,
          userId: user.id,
          loadId: load.id,
          customerId: load.customer_id || undefined,
          type: photoType,
          customerVisible: photoType === 'proof_of_delivery',
          file,
        })
      }
      setMessage(`${file.name} uploaded as ${photoTypes.find((type) => type.value === photoType)?.label}.`)
      event.target.value = ''
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to upload the file.')
    } finally {
      setUploading(false)
    }
  }

  const beginLocationWatch = async () => {
    if (!user || !load) return
    clearNotices()
    if (!load.driver_location_sharing_allowed) {
      setError('Location sharing is disabled for this load by Legacy Hotshot.')
      return
    }
    if (!navigator.geolocation) {
      setError('This device does not support browser location sharing.')
      return
    }

    try {
      const session = user.demo
        ? { id: 'demo-location-session', load_id: load.id, driver_id: user.id, status: 'active' as const, visibility: load.tracking_visibility, started_at: new Date().toISOString(), ended_at: null, last_location_at: null }
        : await startLocationSession({ companyId: user.companyId || '', loadId: load.id, userId: user.id, visibility: load.tracking_visibility })

      setActiveSession(session)
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const now = Date.now()
          if (now - lastLocationSentRef.current < 60_000) return
          lastLocationSentRef.current = now
          const { latitude, longitude, accuracy } = position.coords
          setLoad((current) => current ? {
            ...current,
            location_last_updated_at: new Date().toISOString(),
            location_last_latitude: latitude,
            location_last_longitude: longitude,
            location_accuracy_meters: accuracy,
          } : current)
          if (!user.demo) {
            recordDriverLocation({ loadId: load.id, sessionId: session.id, latitude, longitude, accuracy }).catch((caught) => {
              setError(caught instanceof Error ? caught.message : 'A location update could not be saved.')
            })
          }
        },
        (locationError) => setError(`Location sharing could not start: ${locationError.message}`),
        { enableHighAccuracy: true, maximumAge: 30_000, timeout: 20_000 },
      )
      setMessage('Location sharing is active. Keep this page open while driving.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to start location sharing.')
    }
  }

  const endLocationWatch = async () => {
    if (!activeSession) return
    clearNotices()
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    try {
      if (!user?.demo) await stopLocationSession(activeSession.id)
      setActiveSession(null)
      setMessage('Location sharing stopped.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to stop location sharing.')
    }
  }

  if (loading) return <div className="panel empty-state">Loading driver load...</div>
  if (!load) return <div className="form-error operations-alert">{error || 'Load not found.'}</div>

  return (
    <div className="driver-page driver-load-workspace">
      <button className="back-link" onClick={() => navigate('/driver')}>← Driver Home</button>

      <section className="driver-load-header">
        <div><span className="eyebrow">{load.load_number}</span><h2>{load.pickup_city}, {load.pickup_state} → {load.delivery_city}, {load.delivery_state}</h2><p>{load.freight_description}</p></div>
        <div className={`driver-live-indicator ${activeSession ? 'driver-live-indicator--active' : ''}`}><span />{activeSession ? 'Location Sharing Active' : 'Location Sharing Off'}</div>
      </section>

      {message && <div className="form-success operations-alert">{message}</div>}
      {error && <div className="form-error operations-alert">{error}</div>}

      <section className="driver-status-actions">
        {statusActions.map((action) => <button key={action.status} disabled={saving || load.status === action.status} onClick={() => changeStatus(action)} className={load.status === action.status ? 'current' : ''}>{action.label}</button>)}
      </section>

      <section className="driver-destination-grid">
        <article className="driver-destination-card">
          <span className="driver-stop-badge">A</span><small>PICKUP</small><h3>{load.pickup_company || 'Pickup'}</h3><p>{load.pickup_address}<br />{load.pickup_city}, {load.pickup_state}</p><strong>{load.pickup_at ? new Date(load.pickup_at).toLocaleString() : 'Appointment not set'}</strong>
          {load.pickup_contact && <p>{load.pickup_contact}{load.pickup_phone ? ` · ${load.pickup_phone}` : ''}</p>}
          {load.pickup_instructions && <div className="driver-instructions">{load.pickup_instructions}</div>}
          <a className="primary-button driver-nav-button" href={mapsUrl(load.pickup_address, load.pickup_city, load.pickup_state)} target="_blank" rel="noreferrer"><Icon name="route" size={18} /> Navigate to Pickup</a>
        </article>
        <article className="driver-destination-card driver-destination-card--delivery">
          <span className="driver-stop-badge">B</span><small>DELIVERY</small><h3>{load.delivery_company || 'Delivery'}</h3><p>{load.delivery_address}<br />{load.delivery_city}, {load.delivery_state}</p><strong>{load.delivery_at ? new Date(load.delivery_at).toLocaleString() : 'Appointment not set'}</strong>
          {load.delivery_contact && <p>{load.delivery_contact}{load.delivery_phone ? ` · ${load.delivery_phone}` : ''}</p>}
          {load.delivery_instructions && <div className="driver-instructions">{load.delivery_instructions}</div>}
          <a className="primary-button driver-nav-button" href={mapsUrl(load.delivery_address, load.delivery_city, load.delivery_state)} target="_blank" rel="noreferrer"><Icon name="route" size={18} /> Navigate to Delivery</a>
        </article>
      </section>

      <section className="driver-work-grid">
        <article className="panel driver-checklist-panel">
          <div className="driver-panel-heading"><div><span className="eyebrow">LOAD CHECKLIST</span><h3>{activePhase === 'pickup' ? 'Pickup' : 'Delivery'} Checklist</h3></div><strong>{phaseCompleted}/{phaseItems.length}</strong></div>
          <div className="driver-tab-row"><button className={activePhase === 'pickup' ? 'active' : ''} onClick={() => setActivePhase('pickup')}>Pickup</button><button className={activePhase === 'delivery' ? 'active' : ''} onClick={() => setActivePhase('delivery')}>Delivery</button></div>
          <div className="driver-checklist-progress"><span style={{ width: `${phaseItems.length ? (phaseCompleted / phaseItems.length) * 100 : 0}%` }} /></div>
          {requiredRemaining > 0 && <p className="driver-required-note">{requiredRemaining} required item{requiredRemaining === 1 ? '' : 's'} remaining.</p>}
          <div className="driver-checklist-list">
            {phaseItems.map((item) => <button key={item.id} onClick={() => toggleChecklist(item)} className={item.completed_at ? 'complete' : ''}><span className="driver-check-box">{item.completed_at ? '✓' : ''}</span><span><strong>{item.label}</strong>{!item.required && <small>Optional</small>}</span></button>)}
          </div>
        </article>

        <article className="panel driver-tools-panel">
          <div className="driver-panel-heading"><div><span className="eyebrow">FIELD TOOLS</span><h3>Photos & Documents</h3></div><Icon name="documents" /></div>
          <label>Document type<select value={photoType} onChange={(event) => setPhotoType(event.target.value as (typeof photoTypes)[number]['value'])}>{photoTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
          <label className="driver-camera-button"><Icon name="plus" size={20} />{uploading ? 'Uploading...' : 'Take Photo or Choose File'}<input type="file" accept="image/*,application/pdf" capture="environment" disabled={uploading} onChange={uploadPhoto} /></label>

          <div className="driver-location-card">
            <div><span className="eyebrow">OPTIONAL GPS</span><h3>Location Sharing</h3><p>Requires your permission and stops when you choose. Customer visibility is currently <strong>{load.tracking_visibility.replaceAll('_', ' ')}</strong>.</p></div>
            {activeSession ? <button className="danger-button" onClick={endLocationWatch}>Stop Sharing</button> : <button className="primary-button" onClick={beginLocationWatch} disabled={!load.driver_location_sharing_allowed}><Icon name="route" size={18} /> Start Sharing</button>}
            {load.location_last_updated_at && <small>Last update: {new Date(load.location_last_updated_at).toLocaleTimeString()}</small>}
          </div>
        </article>
      </section>

      <section className="panel driver-time-panel">
        <div className="driver-panel-heading"><div><span className="eyebrow">OPERATIONAL TIME LOG — NOT AN ELD</span><h3>Time Events</h3></div><Icon name="clock" /></div>
        <div className="driver-time-actions">{timeActions.map((action) => <button key={action.event} disabled={saving} onClick={() => addTimeEvent(action.event)}>{action.label}</button>)}</div>
        <div className="driver-time-history">
          {timeEvents.length === 0 ? <p>No time events recorded.</p> : timeEvents.map((event) => <div key={event.id}><span>{new Date(event.occurred_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span><strong>{timeLabels[event.event_type]}</strong>{event.notes && <small>{event.notes}</small>}</div>)}
        </div>
      </section>
    </div>
  )
}
