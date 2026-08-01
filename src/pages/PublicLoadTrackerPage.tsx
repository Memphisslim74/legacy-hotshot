import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { Icon } from '../components/Icon'
import { formatDriveTime } from '../lib/routing'
import type { LoadStatus } from '../types'

type TrackerDocument = {
  id: string
  type: string
  fileName: string
  createdAt: string
  url: string | null
}

type TrackerResponse = {
  company: { name: string; phone: string | null; email: string | null }
  load: {
    loadNumber: string
    status: LoadStatus
    pickup: { company: string | null; city: string; state: string; scheduledAt: string | null }
    delivery: { company: string | null; city: string; state: string; scheduledAt: string | null }
    freightDescription: string
    currentEta: string | null
    loadedMiles: number
    routeDurationSeconds: number | null
    routeCalculatedAt: string | null
    customerNotes: string | null
    driverFirstName: string | null
    trackingVisibility: 'exact' | 'approximate' | 'city_state' | 'milestones_only'
    lastLocationAt: string | null
    location: { latitude: number; longitude: number; precision: 'exact' | 'approximate' } | null
  }
  history: Array<{ status: LoadStatus; created_at: string }>
  documents: TrackerDocument[]
  refreshedAt: string
}

type TrackerStage = {
  key: string
  label: string
  detail: string
  statuses: LoadStatus[]
}

const stages: TrackerStage[] = [
  { key: 'received', label: 'Request Received', detail: 'Shipment details received', statuses: ['request_received', 'reviewing', 'quoted'] },
  { key: 'booked', label: 'Load Booked', detail: 'Shipment confirmed', statuses: ['booked'] },
  { key: 'assigned', label: 'Driver Assigned', detail: 'Driver and equipment scheduled', statuses: ['driver_assigned'] },
  { key: 'pickup', label: 'En Route to Pickup', detail: 'Heading to the pickup location', statuses: ['en_route_to_pickup', 'arrived_at_pickup'] },
  { key: 'transit', label: 'Loaded / In Transit', detail: 'Freight is moving', statuses: ['loaded', 'in_transit', 'delayed'] },
  { key: 'arrival', label: 'Arrived at Delivery', detail: 'Driver reached the destination', statuses: ['arrived_at_delivery'] },
  { key: 'delivered', label: 'Delivered', detail: 'Delivery completed', statuses: ['delivered'] },
  { key: 'pod', label: 'POD Complete', detail: 'Proof of delivery received', statuses: ['pod_received', 'invoice_sent', 'paid'] },
]

const statusLabel: Record<LoadStatus, string> = {
  request_received: 'Request received', reviewing: 'Under review', quoted: 'Quote prepared', booked: 'Load booked', driver_assigned: 'Driver assigned', en_route_to_pickup: 'En route to pickup', arrived_at_pickup: 'Arrived at pickup', loaded: 'Loaded', in_transit: 'In transit', delayed: 'Delayed', arrived_at_delivery: 'Arrived at delivery', delivered: 'Delivered', pod_received: 'POD received', invoice_sent: 'Invoice sent', paid: 'Paid', cancelled: 'Cancelled',
}

const formatDateTime = (value: string | null) => value
  ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : 'Not scheduled'

const formatDocumentType = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export function PublicLoadTrackerPage() {
  const { token } = useParams()
  const [data, setData] = useState<TrackerResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const loadTracker = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`/api/public/track/${encodeURIComponent(token || '')}`)
        const payload = await response.json() as TrackerResponse & { error?: string }
        if (!response.ok) throw new Error(payload.error || 'Unable to load this shipment.')
        if (active) setData(payload)
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load this shipment.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadTracker()
    return () => { active = false }
  }, [token])

  const currentStageIndex = useMemo(() => {
    if (!data || data.load.status === 'cancelled') return -1
    const direct = stages.findIndex((stage) => stage.statuses.includes(data.load.status))
    if (direct >= 0) return direct
    return 0
  }, [data])

  const stageTimes = useMemo(() => {
    const times = new Map<string, string>()
    data?.history.forEach((entry) => {
      const stage = stages.find((item) => item.statuses.includes(entry.status))
      if (stage && !times.has(stage.key)) times.set(stage.key, entry.created_at)
    })
    return times
  }, [data])

  if (loading) {
    return <main className="tracker-page tracker-state-page"><BrandMark /><div className="tracker-loader"><span /><span /><span /></div><h1>Loading shipment status</h1><p>Getting the latest update from Legacy Hotshot.</p></main>
  }

  if (error || !data) {
    return <main className="tracker-page tracker-state-page"><BrandMark /><div className="tracker-state-icon"><Icon name="alert" size={28} /></div><h1>Tracking link unavailable</h1><p>{error || 'This shipment could not be found.'}</p><small>Contact Legacy Hotshot for a new tracking link.</small></main>
  }

  const currentStage = currentStageIndex >= 0 ? stages[currentStageIndex] : null
  const mapUrl = data.load.location ? `https://www.google.com/maps?q=${data.load.location.latitude},${data.load.location.longitude}` : null

  return (
    <main className="tracker-page">
      <header className="tracker-header">
        <BrandMark />
        <div className="tracker-header__support"><span>Shipment support</span>{data.company.phone && <a href={`tel:${data.company.phone}`}>{data.company.phone}</a>}{!data.company.phone && data.company.email && <a href={`mailto:${data.company.email}`}>{data.company.email}</a>}</div>
      </header>

      <section className="tracker-hero">
        <div className="tracker-hero__copy"><span className="tracker-kicker">LIVE SHIPMENT TRACKER</span><div className="tracker-title-row"><h1>{data.load.loadNumber}</h1><span className={`tracker-current-status tracker-current-status--${data.load.status === 'delayed' || data.load.status === 'cancelled' ? 'alert' : 'active'}`}>{statusLabel[data.load.status]}</span></div><p>{data.load.freightDescription}</p></div>
        <div className="tracker-eta-card"><span>Current estimated delivery</span><strong>{formatDateTime(data.load.currentEta || data.load.delivery.scheduledAt)}</strong><small>Updated {formatDateTime(data.refreshedAt)}</small></div>
      </section>

      {data.load.status === 'cancelled' ? (
        <section className="tracker-cancelled"><Icon name="alert" size={23} /><div><strong>This shipment has been cancelled.</strong><span>Contact Legacy Hotshot for additional information.</span></div></section>
      ) : (
        <section className="tracker-progress-panel" aria-label="Shipment progress">
          <div className="tracker-progress-heading"><div><span>Current stage</span><strong>{currentStage?.label}</strong></div><small>{currentStageIndex + 1} of {stages.length} milestones</small></div>
          <ol className="tracker-steps">{stages.map((stage, index) => { const complete = index < currentStageIndex; const current = index === currentStageIndex; return <li className={`${complete ? 'complete' : ''} ${current ? 'current' : ''}`} key={stage.key}><div className="tracker-step-marker">{complete ? <Icon name="check" size={15} /> : index + 1}</div><div className="tracker-step-copy"><strong>{stage.label}</strong><span>{stage.detail}</span>{stageTimes.get(stage.key) && <small>{formatDateTime(stageTimes.get(stage.key) || null)}</small>}</div></li> })}</ol>
        </section>
      )}

      <section className="tracker-route-grid">
        <article className="tracker-route-card"><div className="tracker-route-icon tracker-route-icon--pickup">A</div><div><span>Pickup</span><h2>{data.load.pickup.city}, {data.load.pickup.state}</h2><p>{data.load.pickup.company || 'Pickup location'}</p><strong>{formatDateTime(data.load.pickup.scheduledAt)}</strong></div></article>
        <div className="tracker-route-line"><Icon name="truck" size={22} /></div>
        <article className="tracker-route-card"><div className="tracker-route-icon tracker-route-icon--delivery">B</div><div><span>Delivery</span><h2>{data.load.delivery.city}, {data.load.delivery.state}</h2><p>{data.load.delivery.company || 'Delivery location'}</p><strong>{formatDateTime(data.load.delivery.scheduledAt)}</strong></div></article>
      </section>

      <section className="tracker-detail-grid">
        <article className="tracker-info-card"><div className="tracker-card-heading"><Icon name="route" size={20} /><div><span>Route estimate</span><strong>{Number(data.load.loadedMiles || 0).toLocaleString()} loaded miles</strong></div></div><p>{formatDriveTime(data.load.routeDurationSeconds)} estimated drive time. Route calculated {data.load.routeCalculatedAt ? formatDateTime(data.load.routeCalculatedAt) : 'when the load was booked'}.</p></article>
        <article className="tracker-info-card"><div className="tracker-card-heading"><Icon name="drivers" size={20} /><div><span>Assigned driver</span><strong>{data.load.driverFirstName || 'Assignment pending'}</strong></div></div><p>{data.load.driverFirstName ? `${data.load.driverFirstName} is assigned to this shipment.` : 'A driver will appear here after assignment.'}</p></article>
        <article className="tracker-info-card"><div className="tracker-card-heading"><Icon name="route" size={20} /><div><span>Latest location</span><strong>{data.load.lastLocationAt ? formatDateTime(data.load.lastLocationAt) : 'Not available yet'}</strong></div></div>{mapUrl ? <a className="tracker-map-link" href={mapUrl} target="_blank" rel="noreferrer">Open {data.load.location?.precision} location <Icon name="arrow" size={15} /></a> : <p>Location visibility is set to {data.load.trackingVisibility.replaceAll('_', ' ')}.</p>}</article>
        <article className="tracker-info-card tracker-info-card--wide"><div className="tracker-card-heading"><Icon name="messages" size={20} /><div><span>Latest note</span><strong>Shipment update</strong></div></div><p>{data.load.customerNotes || 'No additional customer update has been posted.'}</p></article>
      </section>

      {data.documents.length > 0 && <section className="tracker-documents"><div className="tracker-section-heading"><div><span>CUSTOMER DOCUMENTS</span><h2>Shared files</h2></div><small>{data.documents.length} available</small></div><div className="tracker-document-list">{data.documents.map((document) => <a className={document.url ? '' : 'disabled'} href={document.url || undefined} target="_blank" rel="noreferrer" key={document.id}><Icon name="documents" size={20} /><div><strong>{document.fileName}</strong><span>{formatDocumentType(document.type)} · {formatDateTime(document.createdAt)}</span></div><Icon name="arrow" size={17} /></a>)}</div></section>}

      <footer className="tracker-footer"><BrandMark compact /><div><strong>Handled by Legacy Hotshot</strong><span>Professional hotshot transportation and responsive shipment communication.</span></div></footer>
    </main>
  )
}
