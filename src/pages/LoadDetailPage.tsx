import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { demoDriverLoad } from '../data/driverDemo'
import { listLoads, updateLoadStatus } from '../lib/operations'
import type { LoadRecord, LoadStatus } from '../types'

const statusLabels: Record<LoadStatus, string> = {
  request_received: 'Request Received', reviewing: 'Reviewing', quoted: 'Quoted', booked: 'Booked', driver_assigned: 'Driver Assigned', en_route_to_pickup: 'En Route to Pickup', arrived_at_pickup: 'Arrived at Pickup', loaded: 'Loaded', in_transit: 'In Transit', delayed: 'Delayed', arrived_at_delivery: 'Arrived at Delivery', delivered: 'Delivered', pod_received: 'POD Received', invoice_sent: 'Invoice Sent', paid: 'Paid', cancelled: 'Cancelled',
}

function formatAddress(address: string, city: string, state: string) {
  return [address, city, state].filter(Boolean).join(', ')
}

function googleDirections(destination: string, origin?: string) {
  const params = new URLSearchParams({ api: '1', destination, travelmode: 'driving' })
  if (origin) params.set('origin', origin)
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

function appleDirections(destination: string, origin?: string) {
  const params = new URLSearchParams({ daddr: destination, dirflg: 'd' })
  if (origin) params.set('saddr', origin)
  return `https://maps.apple.com/?${params.toString()}`
}

function sampleLoadForId(id?: string): LoadRecord {
  if (id === 'load-2') {
    return {
      ...demoDriverLoad,
      id: 'load-2',
      load_number: 'LH-1029',
      status: 'booked',
      pickup_company: 'High Plains Fabrication',
      pickup_address: '1500 Commerce Drive',
      pickup_city: 'Abilene',
      pickup_state: 'TX',
      delivery_company: 'Frontier Site Services',
      delivery_address: '880 County Road 12',
      delivery_city: 'Odessa',
      delivery_state: 'TX',
      freight_description: 'Skid-mounted pump equipment',
      customer_rate: 2100,
      estimated_fuel: 310,
      loaded_miles: 265,
      deadhead_miles: 44,
      tracking_token: 'demo-track-2',
      customers: { company_name: 'High Plains Fabrication' },
    }
  }
  return { ...demoDriverLoad, id: id || 'load-1', load_number: 'LH-1028' }
}

export function LoadDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [load, setLoad] = useState<LoadRecord | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [trackerCopied, setTrackerCopied] = useState(false)
  const [showingSampleData, setShowingSampleData] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!user?.companyId || user.demo) {
          setLoad(sampleLoadForId(id))
          setShowingSampleData(true)
        } else {
          const rows = await listLoads(user.companyId)
          const selected = rows.find((item) => item.id === id) || null
          if (selected) {
            setLoad(selected)
            setShowingSampleData(false)
          } else if (id?.startsWith('load-')) {
            setLoad(sampleLoadForId(id))
            setShowingSampleData(true)
          } else {
            setLoad(null)
          }
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load this shipment.')
      }
    }
    loadData()
  }, [id, user])

  const changeStatus = async (status: LoadStatus) => {
    if (!load || !user) return
    const previous = load.status
    setLoad({ ...load, status })
    if (showingSampleData) return
    setSaving(true)
    try {
      if (user.companyId && !user.demo) await updateLoadStatus(user.companyId, user.id, load.id, status)
    } catch (caught) {
      setLoad({ ...load, status: previous })
      setError(caught instanceof Error ? caught.message : 'Unable to update status.')
    } finally {
      setSaving(false)
    }
  }

  const trackerPath = load ? `/track/${load.tracking_token}` : ''
  const trackerUrl = load && typeof window !== 'undefined' ? `${window.location.origin}${trackerPath}` : trackerPath

  const copyTrackerLink = async () => {
    if (!load) return
    try {
      await navigator.clipboard.writeText(trackerUrl)
      setTrackerCopied(true)
      window.setTimeout(() => setTrackerCopied(false), 2400)
    } catch {
      setError('Unable to copy the tracker link. Open the tracker and copy the address from your browser.')
    }
  }

  if (error && !load) return <div className="record-alert record-alert--error">{error}</div>
  if (!load) return <div className="record-empty">Loading shipment...</div>

  const expenses = Number(load.driver_pay || 0) + Number(load.estimated_fuel || 0) + Number(load.additional_expenses || 0)
  const profit = Number(load.customer_rate || 0) - expenses
  const totalMiles = Number(load.loaded_miles || 0) + Number(load.deadhead_miles || 0)
  const rpm = totalMiles ? Number(load.customer_rate || 0) / totalMiles : 0
  const margin = load.customer_rate ? Math.round((profit / load.customer_rate) * 100) : 0
  const pickupAddress = formatAddress(load.pickup_address, load.pickup_city, load.pickup_state)
  const deliveryAddress = formatAddress(load.delivery_address, load.delivery_city, load.delivery_state)

  return (
    <div className="shipment-control-page">
      <header className="shipment-control-head">
        <div>
          <button className="shipment-back" onClick={() => navigate('/loads')}>← Shipment Register</button>
          <span>{load.customers?.company_name || 'LEGACY LOAD'}</span>
          <h2>{load.load_number}</h2>
          <p>{load.freight_description}</p>
        </div>
        <div className="shipment-command-actions">
          <button onClick={copyTrackerLink}><Icon name={trackerCopied ? 'check' : 'route'} size={16} />{trackerCopied ? 'Copied' : 'Copy Tracker'}</button>
          <a href={trackerPath} target="_blank" rel="noreferrer"><Icon name="arrow" size={16} />Open Tracker</a>
          <button onClick={() => navigate('/communications')}><Icon name="messages" size={16} />Send Update</button>
          <button className="primary" onClick={() => navigate('/documents')}><Icon name="documents" size={16} />Add Document</button>
        </div>
      </header>

      {error && <div className="record-alert record-alert--error">{error}</div>}
      {showingSampleData && <div className="sample-data-banner"><Icon name="alert" size={16} /><span><strong>Sample Data — Preview Only</strong> This load is not stored in Supabase. Status changes remain local.</span></div>}

      <section className="shipment-status-strip">
        <div><span>Operating status</span><select value={load.status} disabled={saving} onChange={(event) => changeStatus(event.target.value as LoadStatus)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div><span>Assigned driver</span><strong>{load.assigned_driver?.full_name || (load.assigned_driver_id ? 'Assigned driver' : 'Unassigned')}</strong></div>
        <div><span>Current ETA</span><strong>{load.current_eta ? new Date(load.current_eta).toLocaleString() : 'Not set'}</strong></div>
        <div><span>Tracker visibility</span><strong>{load.tracking_visibility.replaceAll('_', ' ')}</strong></div>
      </section>

      <section className="shipment-control-grid">
        <main className="shipment-control-main">
          <section className="shipment-route-workspace">
            <div className="shipment-section-head"><div><span>ROUTE CONTROL</span><h3>Pickup and Delivery</h3></div><div className="shipment-full-route"><a href={googleDirections(deliveryAddress, pickupAddress)} target="_blank" rel="noreferrer">Google full route</a><a href={appleDirections(deliveryAddress, pickupAddress)} target="_blank" rel="noreferrer">Apple full route</a></div></div>

            <article className="shipment-stop-row">
              <div className="shipment-stop-marker">A</div>
              <div className="shipment-stop-identity"><span>PICKUP</span><h4>{load.pickup_company || `${load.pickup_city} pickup`}</h4><p>{load.pickup_address}<br />{load.pickup_city}, {load.pickup_state}</p></div>
              <div><span>Appointment</span><strong>{load.pickup_at ? new Date(load.pickup_at).toLocaleString() : 'Not scheduled'}</strong></div>
              <div><span>Contact</span><strong>{load.pickup_contact || 'Not provided'}</strong><small>{load.pickup_phone || ''}</small></div>
              <div className="shipment-map-links"><a href={googleDirections(pickupAddress)} target="_blank" rel="noreferrer">Google</a><a href={appleDirections(pickupAddress)} target="_blank" rel="noreferrer">Apple</a></div>
            </article>

            <article className="shipment-stop-row shipment-stop-row--delivery">
              <div className="shipment-stop-marker">B</div>
              <div className="shipment-stop-identity"><span>DELIVERY</span><h4>{load.delivery_company || `${load.delivery_city} delivery`}</h4><p>{load.delivery_address}<br />{load.delivery_city}, {load.delivery_state}</p></div>
              <div><span>Appointment</span><strong>{load.delivery_at ? new Date(load.delivery_at).toLocaleString() : 'Not scheduled'}</strong></div>
              <div><span>Contact</span><strong>{load.delivery_contact || 'Not provided'}</strong><small>{load.delivery_phone || ''}</small></div>
              <div className="shipment-map-links"><a href={googleDirections(deliveryAddress)} target="_blank" rel="noreferrer">Google</a><a href={appleDirections(deliveryAddress)} target="_blank" rel="noreferrer">Apple</a></div>
            </article>
          </section>

          <section className="shipment-detail-register">
            <div className="shipment-section-head"><div><span>FREIGHT PROFILE</span><h3>Shipment Details</h3></div></div>
            <dl>
              <div><dt>Description</dt><dd>{load.freight_description}</dd></div>
              <div><dt>Pieces</dt><dd>{load.pieces ?? 'Not provided'}</dd></div>
              <div><dt>Estimated weight</dt><dd>{load.estimated_weight ? `${Number(load.estimated_weight).toLocaleString()} lb` : 'Not provided'}</dd></div>
              <div><dt>Dimensions</dt><dd>{load.dimensions || 'Not provided'}</dd></div>
              <div><dt>Equipment</dt><dd>{load.equipment_requirements || 'Not specified'}</dd></div>
              <div><dt>Securement</dt><dd>{load.securement_requirements || 'Not specified'}</dd></div>
              <div><dt>Loaded miles</dt><dd>{Number(load.loaded_miles || 0).toLocaleString()}</dd></div>
              <div><dt>Deadhead miles</dt><dd>{Number(load.deadhead_miles || 0).toLocaleString()}</dd></div>
            </dl>
          </section>
        </main>

        <aside className="shipment-control-aside">
          <section className="shipment-economics">
            <div className="shipment-section-head"><div><span>LOAD ECONOMICS</span><h3>Commercial Summary</h3></div></div>
            <dl>
              <div><dt>Customer rate</dt><dd>${Number(load.customer_rate || 0).toLocaleString()}</dd></div>
              <div><dt>Driver pay</dt><dd>−${Number(load.driver_pay || 0).toLocaleString()}</dd></div>
              <div><dt>Estimated fuel</dt><dd>−${Number(load.estimated_fuel || 0).toLocaleString()}</dd></div>
              <div><dt>Other expenses</dt><dd>−${Number(load.additional_expenses || 0).toLocaleString()}</dd></div>
              <div className="shipment-profit"><dt>Estimated profit</dt><dd>${profit.toLocaleString()}</dd></div>
            </dl>
            <div className="shipment-economics-metrics"><div><strong>${rpm.toFixed(2)}</strong><span>Revenue / mile</span></div><div><strong>{margin}%</strong><span>Margin</span></div><div><strong>{totalMiles}</strong><span>Total miles</span></div></div>
          </section>

          <section className="shipment-tracker-control">
            <div className="shipment-section-head"><div><span>CUSTOMER VISIBILITY</span><h3>Public Tracker</h3></div></div>
            <p>The customer sees status milestones and only the location detail allowed by this load’s visibility setting.</p>
            <button onClick={copyTrackerLink}>{trackerCopied ? 'Tracker link copied' : 'Copy public tracker link'}</button>
            <a href={trackerPath} target="_blank" rel="noreferrer">Preview customer view</a>
          </section>
        </aside>
      </section>
    </div>
  )
}
