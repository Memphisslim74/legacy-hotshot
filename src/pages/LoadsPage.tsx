import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { demoDriverLoad } from '../data/driverDemo'
import { listLoadRequests, listLoads, updateLoadStatus } from '../lib/operations'
import type { LoadRecord, LoadRequestRecord, LoadStatus } from '../types'

const demoLoads: LoadRecord[] = [
  { ...demoDriverLoad, id: 'load-1', load_number: 'LH-1028' },
  {
    ...demoDriverLoad,
    id: 'load-2',
    load_number: 'LH-1029',
    customer_id: 'demo-customer-2',
    status: 'booked',
    pickup_company: 'High Plains Fabrication',
    pickup_address: '1500 Commerce Drive',
    pickup_city: 'Abilene',
    pickup_state: 'TX',
    pickup_contact: 'Dana Hall',
    pickup_phone: '(325) 555-0116',
    pickup_at: new Date(Date.now() + 172800000).toISOString(),
    pickup_instructions: 'Enter through the south equipment gate.',
    delivery_company: 'Frontier Site Services',
    delivery_address: '880 County Road 12',
    delivery_city: 'Odessa',
    delivery_state: 'TX',
    delivery_contact: 'Luis Ramirez',
    delivery_phone: '(432) 555-0168',
    delivery_at: new Date(Date.now() + 259200000).toISOString(),
    delivery_instructions: 'Call 30 minutes before arrival.',
    freight_description: 'Skid-mounted pump equipment',
    pieces: 1,
    estimated_weight: 9400,
    dimensions: '16 ft × 7 ft × 6 ft',
    equipment_requirements: '40 ft gooseneck',
    securement_requirements: 'Chains, binders, and edge protection',
    customer_rate: 2100,
    estimated_fuel: 310,
    additional_expenses: 0,
    loaded_miles: 265,
    deadhead_miles: 44,
    current_eta: null,
    tracking_token: 'demo-track-2',
    tracking_visibility: 'city_state',
    driver_location_sharing_allowed: true,
    location_last_updated_at: null,
    location_last_latitude: null,
    location_last_longitude: null,
    location_accuracy_meters: null,
    customers: { company_name: 'High Plains Fabrication' },
  },
]

const demoRequests: LoadRequestRecord[] = [
  { id: 'request-1', request_number: 'LHR-1004', requester_company: 'Red River Machinery', requester_name: 'Angela Price', requester_email: 'angela@redrivermachinery.com', requester_phone: '(940) 555-0137', pickup_city: 'Wichita Falls', pickup_state: 'TX', pickup_date: null, delivery_city: 'Lubbock', delivery_state: 'TX', delivery_date: null, freight_description: 'Compact excavator attachment', estimated_weight: null, dimensions: null, status: 'received', missing_fields: ['Weight not provided', 'Dimensions missing', 'Pickup appointment not confirmed'], created_at: new Date().toISOString() },
]

const statusLabels: Record<LoadStatus, string> = {
  request_received: 'Request Received', reviewing: 'Reviewing', quoted: 'Quoted', booked: 'Booked', driver_assigned: 'Driver Assigned', en_route_to_pickup: 'En Route to Pickup', arrived_at_pickup: 'Arrived at Pickup', loaded: 'Loaded', in_transit: 'In Transit', delayed: 'Delayed', arrived_at_delivery: 'Arrived at Delivery', delivered: 'Delivered', pod_received: 'POD Received', invoice_sent: 'Invoice Sent', paid: 'Paid', cancelled: 'Cancelled',
}

const movementStatuses: LoadStatus[] = ['driver_assigned', 'en_route_to_pickup', 'arrived_at_pickup', 'loaded', 'in_transit', 'arrived_at_delivery']

export function LoadsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'loads' | 'requests'>('loads')
  const [loads, setLoads] = useState<LoadRecord[]>([])
  const [requests, setRequests] = useState<LoadRequestRecord[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!user?.companyId || user.demo) {
          setLoads(demoLoads)
          setRequests(demoRequests)
        } else {
          const [loadRows, requestRows] = await Promise.all([listLoads(user.companyId), listLoadRequests(user.companyId)])
          setLoads(loadRows)
          setRequests(requestRows)
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load operations data.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user])

  const visibleLoads = useMemo(() => loads.filter((load) => {
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || [load.load_number, load.pickup_city, load.delivery_city, load.freight_description, load.customers?.company_name].some((value) => value?.toLowerCase().includes(query))
    return matchesSearch && (status === 'all' || load.status === status)
  }), [loads, search, status])

  const visibleRequests = useMemo(() => requests.filter((request) => {
    const query = search.trim().toLowerCase()
    return !query || [request.request_number, request.requester_company, request.requester_name, request.pickup_city, request.delivery_city, request.freight_description].some((value) => value?.toLowerCase().includes(query))
  }), [requests, search])

  const summary = useMemo(() => ({
    all: loads.length,
    moving: loads.filter((load) => movementStatuses.includes(load.status)).length,
    delayed: loads.filter((load) => load.status === 'delayed').length,
    delivered: loads.filter((load) => ['delivered', 'pod_received', 'invoice_sent', 'paid'].includes(load.status)).length,
    requests: requests.length,
  }), [loads, requests])

  const changeStatus = async (load: LoadRecord, next: LoadStatus) => {
    if (!user) return
    const previous = load.status
    setLoads((current) => current.map((item) => item.id === load.id ? { ...item, status: next } : item))
    try {
      if (user.companyId && !user.demo) await updateLoadStatus(user.companyId, user.id, load.id, next)
    } catch (caught) {
      setLoads((current) => current.map((item) => item.id === load.id ? { ...item, status: previous } : item))
      setError(caught instanceof Error ? caught.message : 'Unable to update load status.')
    }
  }

  return (
    <div className="load-operations-page">
      <section className="load-register-head">
        <div>
          <span>DISPATCH REGISTER</span>
          <h2>{tab === 'loads' ? 'Shipment Control' : 'Request Intake'}</h2>
          <p>{tab === 'loads' ? 'Monitor load movement, appointments, driver assignment, and commercial status.' : 'Qualify incoming work before quoting or dispatching it.'}</p>
        </div>
        <button onClick={() => navigate('/loads/new')}><Icon name="plus" size={16} /> Create Load</button>
      </section>

      {error && <div className="load-register-alert">{error}</div>}

      <section className="load-status-strip" aria-label="Load operating summary">
        <button className={tab === 'loads' && status === 'all' ? 'active' : ''} onClick={() => { setTab('loads'); setStatus('all') }}><span>All loads</span><strong>{summary.all}</strong></button>
        <button className={tab === 'loads' && status === 'in_transit' ? 'active' : ''} onClick={() => { setTab('loads'); setStatus('in_transit') }}><span>In movement</span><strong>{summary.moving}</strong></button>
        <button className={tab === 'loads' && status === 'delayed' ? 'active' : ''} onClick={() => { setTab('loads'); setStatus('delayed') }}><span>Delayed</span><strong>{summary.delayed}</strong></button>
        <button className={tab === 'loads' && status === 'delivered' ? 'active' : ''} onClick={() => { setTab('loads'); setStatus('delivered') }}><span>Delivered</span><strong>{summary.delivered}</strong></button>
        <button className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}><span>Requests</span><strong>{summary.requests}</strong></button>
      </section>

      <section className="load-register-toolbar">
        <label><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tab === 'loads' ? 'Search load, customer, city, or freight' : 'Search request, company, route, or freight'} /></label>
        {tab === 'loads' && <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}
        <span>{tab === 'loads' ? `${visibleLoads.length} shipments shown` : `${visibleRequests.length} requests shown`}</span>
      </section>

      {loading ? <div className="load-register-empty">Loading operations...</div> : tab === 'loads' ? (
        <section className="shipment-register">
          <div className="shipment-register__table-wrap">
            <table>
              <thead><tr><th>Load</th><th>Business</th><th>Route</th><th>Pickup appointment</th><th>Driver</th><th>Status</th><th>Rate</th><th /></tr></thead>
              <tbody>{visibleLoads.map((load) => (
                <tr key={load.id}>
                  <td className="shipment-register__id"><strong>{load.load_number}</strong><span>{load.freight_description}</span></td>
                  <td><strong>{load.customers?.company_name || load.pickup_company || 'Unassigned customer'}</strong><span>{load.pickup_company}</span></td>
                  <td className="shipment-register__route"><strong>{load.pickup_city}, {load.pickup_state}</strong><i /><span>{load.delivery_city}, {load.delivery_state}</span></td>
                  <td><strong>{load.pickup_at ? new Date(load.pickup_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Not scheduled'}</strong><span>{load.current_eta ? `ETA ${new Date(load.current_eta).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'No live ETA'}</span></td>
                  <td><strong>{load.driver_id ? 'Assigned driver' : 'Unassigned'}</strong><span>{load.equipment_requirements || 'Equipment pending'}</span></td>
                  <td><select className={`status-select status-select--${load.status}`} value={load.status} onChange={(event) => changeStatus(load, event.target.value as LoadStatus)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td>
                  <td><strong>${Number(load.customer_rate || 0).toLocaleString()}</strong><span>{Number(load.loaded_miles || 0).toLocaleString()} loaded mi</span></td>
                  <td><button onClick={() => navigate(`/loads/${load.id}`)} aria-label={`Open ${load.load_number}`}><Icon name="arrow" size={16} /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {!visibleLoads.length && <div className="load-register-empty">No loads match the current filters.</div>}
        </section>
      ) : (
        <section className="request-intake-queue">
          <div className="request-intake-queue__header"><span>Request</span><span>Requested by</span><span>Route</span><span>Qualification</span><span>Actions</span></div>
          {visibleRequests.map((request) => (
            <article key={request.id}>
              <div><strong>{request.request_number}</strong><span>{request.freight_description}</span></div>
              <div><strong>{request.requester_company || request.requester_name}</strong><span>{request.requester_name} · {request.requester_phone}</span></div>
              <div className="request-intake-route"><strong>{request.pickup_city}, {request.pickup_state}</strong><Icon name="arrow" size={13} /><strong>{request.delivery_city}, {request.delivery_state}</strong><span>{request.pickup_date || 'Pickup pending'} · {request.delivery_date || 'Delivery pending'}</span></div>
              <div className={request.missing_fields.length ? 'request-intake-check request-intake-check--warning' : 'request-intake-check'}><Icon name={request.missing_fields.length ? 'alert' : 'check'} size={15} /><span><strong>{request.missing_fields.length ? `${request.missing_fields.length} missing details` : 'Ready to quote'}</strong><small>{request.missing_fields.join(' · ') || 'Required information is complete.'}</small></span></div>
              <div className="request-intake-actions"><button>Request Info</button><button>Create Quote</button><button onClick={() => navigate('/loads/new')}>Convert</button></div>
            </article>
          ))}
          {!visibleRequests.length && <div className="load-register-empty">No load requests match your search.</div>}
        </section>
      )}
    </div>
  )
}
