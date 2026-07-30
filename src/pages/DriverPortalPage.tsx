import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { demoDriverLoad } from '../data/driverDemo'
import { listDriverLoads } from '../lib/driverOperations'
import type { LoadRecord } from '../types'

const activeStatuses = new Set(['booked', 'driver_assigned', 'en_route_to_pickup', 'arrived_at_pickup', 'loaded', 'in_transit', 'delayed', 'arrived_at_delivery'])
const statusLabels: Record<string, string> = {
  booked: 'Booked', driver_assigned: 'Driver Assigned', en_route_to_pickup: 'En Route to Pickup', arrived_at_pickup: 'At Pickup', loaded: 'Loaded', in_transit: 'In Transit', delayed: 'Delayed', arrived_at_delivery: 'At Delivery', delivered: 'Delivered', pod_received: 'POD Received',
}

const demoAssignments: LoadRecord[] = [
  demoDriverLoad,
  {
    ...demoDriverLoad,
    id: 'driver-demo-upcoming',
    load_number: 'LH-1029',
    status: 'booked',
    pickup_company: 'High Plains Fabrication',
    pickup_address: '1500 Commerce Drive',
    pickup_city: 'Abilene',
    pickup_state: 'TX',
    pickup_at: new Date(Date.now() + 86400000).toISOString(),
    delivery_company: 'Frontier Site Services',
    delivery_address: '880 County Road 12',
    delivery_city: 'Odessa',
    delivery_state: 'TX',
    delivery_at: new Date(Date.now() + 172800000).toISOString(),
    freight_description: 'Skid-mounted pump equipment',
    tracking_token: 'demo-track-2',
  },
]

export function DriverPortalPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loads, setLoads] = useState<LoadRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showingSampleData, setShowingSampleData] = useState(false)

  useEffect(() => {
    let active = true
    const loadData = async () => {
      try {
        if (!user?.companyId || user.demo) {
          if (active) { setLoads(demoAssignments); setShowingSampleData(true) }
          return
        }
        const rows = await listDriverLoads(user.companyId, user.id, user.role)
        if (active) {
          setLoads(rows.length ? rows : demoAssignments)
          setShowingSampleData(rows.length === 0)
        }
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
  const currentLoad = activeLoads.find((load) => ['en_route_to_pickup', 'arrived_at_pickup', 'loaded', 'in_transit', 'delayed', 'arrived_at_delivery'].includes(load.status)) || activeLoads[0]
  const upcomingLoads = activeLoads.filter((load) => load.id !== currentLoad?.id)

  if (loading) return <div className="driver-board-state">Loading driver assignments...</div>

  return (
    <div className="driver-assignment-board">
      <header className="driver-board-header">
        <div><span>MOBILE OPERATIONS</span><h2>{user?.role === 'driver' ? `Good day, ${user.fullName}` : 'Driver workflow preview'}</h2><p>Current trip, upcoming assignments, field documents, and status controls in one phone-first workspace.</p></div>
        <div className="driver-board-safety"><Icon name="alert" size={18} /><span>Operational support only. This application is not an ELD.</span></div>
      </header>

      {error && <div className="form-error operations-alert">{error}</div>}
      {showingSampleData && <div className="sample-data-banner"><Icon name="alert" size={16} /><span><strong>Sample Data — Preview Only</strong> These assignments are display examples and are not stored in Supabase.</span></div>}

      <section className="driver-board-strip">
        <div><span>Active</span><strong>{activeLoads.length}</strong></div>
        <div><span>Delayed</span><strong>{loads.filter((load) => load.status === 'delayed').length}</strong></div>
        <div><span>Completed</span><strong>{completedLoads.length}</strong></div>
        <div><span>Location sharing</span><strong>{currentLoad?.driver_location_sharing_allowed ? 'Available' : 'Off'}</strong></div>
      </section>

      {currentLoad ? (
        <section className="driver-current-trip">
          <div className="driver-current-trip__head"><div><span>CURRENT ASSIGNMENT</span><strong>{currentLoad.load_number}</strong></div><em className={`driver-trip-status driver-trip-status--${currentLoad.status}`}>{statusLabels[currentLoad.status] || currentLoad.status.replaceAll('_', ' ')}</em></div>
          <div className="driver-current-route">
            <div><small>PICKUP</small><strong>{currentLoad.pickup_city}, {currentLoad.pickup_state}</strong><span>{currentLoad.pickup_company || 'Pickup location'}</span><time>{currentLoad.pickup_at ? new Date(currentLoad.pickup_at).toLocaleString() : 'Appointment pending'}</time></div>
            <i><Icon name="truck" size={22} /></i>
            <div><small>DELIVERY</small><strong>{currentLoad.delivery_city}, {currentLoad.delivery_state}</strong><span>{currentLoad.delivery_company || 'Delivery location'}</span><time>{currentLoad.delivery_at ? new Date(currentLoad.delivery_at).toLocaleString() : 'Appointment pending'}</time></div>
          </div>
          <div className="driver-current-freight"><span>Freight</span><strong>{currentLoad.freight_description}</strong><small>{currentLoad.equipment_requirements || 'Equipment requirements pending'}</small></div>
          <button onClick={() => navigate(`/driver/loads/${currentLoad.id}`)}>Open field workflow <Icon name="arrow" size={17} /></button>
        </section>
      ) : <div className="driver-board-state">No active assignment right now.</div>}

      <section className="driver-upcoming-board">
        <div className="driver-upcoming-board__head"><div><span>NEXT UP</span><h3>Upcoming assignments</h3></div><small>{upcomingLoads.length} scheduled</small></div>
        <div className="driver-upcoming-list">
          {upcomingLoads.map((load) => <button key={load.id} onClick={() => navigate(`/driver/loads/${load.id}`)}><span><strong>{load.load_number}</strong><small>{statusLabels[load.status] || load.status.replaceAll('_', ' ')}</small></span><span><strong>{load.pickup_city}, {load.pickup_state} → {load.delivery_city}, {load.delivery_state}</strong><small>{load.pickup_at ? new Date(load.pickup_at).toLocaleString() : 'Pickup pending'}</small></span><Icon name="arrow" size={17} /></button>)}
          {!upcomingLoads.length && <div className="driver-board-state">No additional assignments are scheduled.</div>}
        </div>
      </section>
    </div>
  )
}
