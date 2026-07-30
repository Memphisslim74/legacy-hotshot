import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { demoDriverLoad } from '../data/driverDemo'
import { listDriverLoads } from '../lib/driverOperations'
import type { LoadRecord } from '../types'

const activeStatuses = new Set([
  'booked',
  'driver_assigned',
  'en_route_to_pickup',
  'arrived_at_pickup',
  'loaded',
  'in_transit',
  'delayed',
  'arrived_at_delivery',
])

const statusLabels: Record<string, string> = {
  booked: 'Booked',
  driver_assigned: 'Driver Assigned',
  en_route_to_pickup: 'En Route to Pickup',
  arrived_at_pickup: 'At Pickup',
  loaded: 'Loaded',
  in_transit: 'In Transit',
  delayed: 'Delayed',
  arrived_at_delivery: 'At Delivery',
  delivered: 'Delivered',
  pod_received: 'POD Received',
}

export function DriverPortalPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loads, setLoads] = useState<LoadRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const loadData = async () => {
      try {
        if (!user?.companyId || user.demo) {
          if (active) setLoads([demoDriverLoad])
          return
        }
        const rows = await listDriverLoads(user.companyId, user.id, user.role)
        if (active) setLoads(rows)
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load driver assignments.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()
    return () => { active = false }
  }, [user])

  const activeLoads = useMemo(() => loads.filter((load) => activeStatuses.has(load.status)), [loads])
  const completedLoads = useMemo(() => loads.filter((load) => !activeStatuses.has(load.status)), [loads])

  if (loading) return <div className="panel empty-state">Loading driver assignments...</div>

  return (
    <div className="driver-page">
      <section className="driver-hero">
        <div>
          <span className="eyebrow">MOBILE OPERATIONS</span>
          <h2>{user?.role === 'driver' ? `Welcome, ${user.fullName}` : 'Driver Portal Preview'}</h2>
          <p>{user?.role === 'driver' ? 'Your assigned loads, checklists, documents, and status controls are all in one place.' : 'Open any active load to test the same phone-first workflow an assigned driver will use.'}</p>
        </div>
        <div className="driver-safety-note"><Icon name="alert" size={18} /><span>Operational tools only. This application is not an ELD and does not replace Hours-of-Service compliance.</span></div>
      </section>

      {error && <div className="form-error operations-alert">{error}</div>}

      <section className="driver-summary-grid">
        <article><strong>{activeLoads.length}</strong><span>Active assignments</span></article>
        <article><strong>{loads.filter((load) => load.status === 'delayed').length}</strong><span>Delayed</span></article>
        <article><strong>{completedLoads.length}</strong><span>Completed</span></article>
      </section>

      <section className="driver-load-section">
        <div className="driver-section-heading"><div><span className="eyebrow">TODAY & UPCOMING</span><h3>Assigned Loads</h3></div></div>
        {activeLoads.length === 0 ? (
          <div className="panel empty-state">No active loads are assigned right now.</div>
        ) : (
          <div className="driver-load-list">
            {activeLoads.map((load) => (
              <button className="driver-load-card" key={load.id} onClick={() => navigate(`/driver/loads/${load.id}`)}>
                <div className="driver-load-card__top">
                  <div><span>{load.load_number}</span><strong>{statusLabels[load.status] || load.status.replaceAll('_', ' ')}</strong></div>
                  <Icon name="arrow" size={20} />
                </div>
                <div className="driver-route-line">
                  <div><small>PICKUP</small><strong>{load.pickup_city}, {load.pickup_state}</strong><span>{load.pickup_at ? new Date(load.pickup_at).toLocaleString() : 'Appointment not set'}</span></div>
                  <span className="driver-route-arrow">→</span>
                  <div><small>DELIVERY</small><strong>{load.delivery_city}, {load.delivery_state}</strong><span>{load.delivery_at ? new Date(load.delivery_at).toLocaleString() : 'Appointment not set'}</span></div>
                </div>
                <div className="driver-load-card__footer">
                  <span>{load.freight_description}</span>
                  {user?.role !== 'driver' && <span>Driver: {load.assigned_driver?.full_name || 'Not assigned'}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
