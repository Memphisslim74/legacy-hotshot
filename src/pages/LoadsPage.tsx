import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { listLoadRequests, listLoads, updateLoadStatus } from '../lib/operations'
import type { LoadRecord, LoadRequestRecord, LoadStatus } from '../types'

const demoLoads: LoadRecord[] = [
  { id: 'load-1', load_number: 'LH-1028', customer_id: 'demo-customer-1', status: 'in_transit', pickup_company: 'Titan Industrial', pickup_address: '4100 Railhead Rd', pickup_city: 'Fort Worth', pickup_state: 'TX', pickup_at: new Date().toISOString(), delivery_company: 'Permian Equipment', delivery_address: '2200 Industrial Ave', delivery_city: 'Midland', delivery_state: 'TX', delivery_at: new Date(Date.now()+86400000).toISOString(), freight_description: 'Fabricated steel assembly', estimated_weight: 12800, customer_rate: 2850, driver_pay: 0, estimated_fuel: 420, additional_expenses: 0, loaded_miles: 318, deadhead_miles: 22, current_eta: new Date(Date.now()+7200000).toISOString(), tracking_token: 'demo-track-1', created_at: new Date().toISOString(), customers: { company_name: 'Titan Industrial' } },
  { id: 'load-2', load_number: 'LH-1029', customer_id: 'demo-customer-2', status: 'booked', pickup_company: 'High Plains Fabrication', pickup_address: '1500 Commerce Dr', pickup_city: 'Abilene', pickup_state: 'TX', pickup_at: new Date(Date.now()+172800000).toISOString(), delivery_company: 'Frontier Site Services', delivery_address: '880 County Road 12', delivery_city: 'Odessa', delivery_state: 'TX', delivery_at: new Date(Date.now()+259200000).toISOString(), freight_description: 'Skid-mounted pump equipment', estimated_weight: 9400, customer_rate: 2100, driver_pay: 0, estimated_fuel: 310, additional_expenses: 0, loaded_miles: 265, deadhead_miles: 44, current_eta: null, tracking_token: 'demo-track-2', created_at: new Date().toISOString(), customers: { company_name: 'High Plains Fabrication' } },
]

const demoRequests: LoadRequestRecord[] = [
  { id: 'request-1', request_number: 'LHR-1004', requester_company: 'Red River Machinery', requester_name: 'Angela Price', requester_email: 'angela@redrivermachinery.com', requester_phone: '(940) 555-0137', pickup_city: 'Wichita Falls', pickup_state: 'TX', pickup_date: null, delivery_city: 'Lubbock', delivery_state: 'TX', delivery_date: null, freight_description: 'Compact excavator attachment', estimated_weight: null, dimensions: null, status: 'received', missing_fields: ['Weight not provided', 'Dimensions missing', 'Pickup appointment not confirmed'], created_at: new Date().toISOString() },
]

const statusLabels: Record<LoadStatus, string> = {
  request_received: 'Request Received', reviewing: 'Reviewing', quoted: 'Quoted', booked: 'Booked', driver_assigned: 'Driver Assigned', en_route_to_pickup: 'En Route to Pickup', arrived_at_pickup: 'Arrived at Pickup', loaded: 'Loaded', in_transit: 'In Transit', delayed: 'Delayed', arrived_at_delivery: 'Arrived at Delivery', delivered: 'Delivered', pod_received: 'POD Received', invoice_sent: 'Invoice Sent', paid: 'Paid', cancelled: 'Cancelled',
}

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
    <div className="operations-page">
      <div className="page-command-row">
        <div><span className="eyebrow">LIVE OPERATIONS</span><h2>Loads</h2><p>Manage active work, incoming requests, routes, and delivery progress.</p></div>
        <button className="primary-button" onClick={() => navigate('/loads/new')}><Icon name="plus" size={17} /> New Load</button>
      </div>

      {error && <div className="form-error operations-alert">{error}</div>}

      <div className="operations-tabs">
        <button className={tab === 'loads' ? 'active' : ''} onClick={() => setTab('loads')}>Active Loads <span>{loads.length}</span></button>
        <button className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>Load Requests <span>{requests.length}</span></button>
      </div>

      <section className="panel operations-toolbar">
        <label className="operations-search"><Icon name="search" size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search load, customer, city, or freight" /></label>
        {tab === 'loads' && <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}
      </section>

      {loading ? <div className="panel empty-state">Loading operations...</div> : tab === 'loads' ? (
        <section className="panel operations-table-card">
          <div className="responsive-table-wrap">
            <table className="operations-table">
              <thead><tr><th>Load</th><th>Customer</th><th>Route</th><th>Pickup</th><th>Status</th><th>Rate</th><th /></tr></thead>
              <tbody>{visibleLoads.map((load) => (
                <tr key={load.id}>
                  <td><strong>{load.load_number}</strong><span>{load.freight_description}</span></td>
                  <td>{load.customers?.company_name || load.pickup_company || 'Unassigned customer'}</td>
                  <td><strong>{load.pickup_city}, {load.pickup_state}</strong><span>to {load.delivery_city}, {load.delivery_state}</span></td>
                  <td>{load.pickup_at ? new Date(load.pickup_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Not scheduled'}</td>
                  <td><select className={`status-select status-select--${load.status}`} value={load.status} onChange={(e) => changeStatus(load, e.target.value as LoadStatus)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td>
                  <td>${Number(load.customer_rate || 0).toLocaleString()}</td>
                  <td><button className="icon-button" onClick={() => navigate(`/loads/${load.id}`)} aria-label={`Open ${load.load_number}`}><Icon name="arrow" size={17} /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {!visibleLoads.length && <div className="empty-state">No loads match the current filters.</div>}
        </section>
      ) : (
        <section className="request-card-list">
          {visibleRequests.map((request) => (
            <article className="panel request-card" key={request.id}>
              <div className="request-card__main"><div><span className="request-number">{request.request_number}</span><h3>{request.requester_company || request.requester_name}</h3><p>{request.freight_description}</p></div><span className={`request-status request-status--${request.status}`}>{request.status}</span></div>
              <div className="request-route"><div><small>PICKUP</small><strong>{request.pickup_city}, {request.pickup_state}</strong><span>{request.pickup_date || 'Date pending'}</span></div><Icon name="arrow" /><div><small>DELIVERY</small><strong>{request.delivery_city}, {request.delivery_state}</strong><span>{request.delivery_date || 'Date pending'}</span></div></div>
              {request.missing_fields.length > 0 && <div className="missing-fields"><Icon name="alert" size={17} /><div><strong>Legacy Load Checklist</strong><span>{request.missing_fields.join(' · ')}</span></div></div>}
              <div className="request-card__actions"><button className="secondary-button">Request Information</button><button className="secondary-button">Create Quote</button><button className="primary-button" onClick={() => navigate('/loads/new')}>Convert to Load</button></div>
            </article>
          ))}
          {!visibleRequests.length && <div className="panel empty-state">No load requests match your search.</div>}
        </section>
      )}
    </div>
  )
}
