import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { listLoads, updateLoadStatus } from '../lib/operations'
import type { LoadRecord, LoadStatus } from '../types'

const statusLabels: Record<LoadStatus, string> = {
  request_received: 'Request Received', reviewing: 'Reviewing', quoted: 'Quoted', booked: 'Booked', driver_assigned: 'Driver Assigned', en_route_to_pickup: 'En Route to Pickup', arrived_at_pickup: 'Arrived at Pickup', loaded: 'Loaded', in_transit: 'In Transit', delayed: 'Delayed', arrived_at_delivery: 'Arrived at Delivery', delivered: 'Delivered', pod_received: 'POD Received', invoice_sent: 'Invoice Sent', paid: 'Paid', cancelled: 'Cancelled',
}

export function LoadDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [load, setLoad] = useState<LoadRecord | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!user?.companyId || user.demo) {
          setLoad({ id: id || 'demo', load_number: 'LH-1028', customer_id: 'demo-customer-1', status: 'in_transit', pickup_company: 'Titan Industrial', pickup_address: '4100 Railhead Rd', pickup_city: 'Fort Worth', pickup_state: 'TX', pickup_at: new Date().toISOString(), delivery_company: 'Permian Equipment', delivery_address: '2200 Industrial Ave', delivery_city: 'Midland', delivery_state: 'TX', delivery_at: new Date(Date.now()+86400000).toISOString(), freight_description: 'Fabricated steel assembly', estimated_weight: 12800, customer_rate: 2850, driver_pay: 0, estimated_fuel: 420, additional_expenses: 85, loaded_miles: 318, deadhead_miles: 22, current_eta: new Date(Date.now()+7200000).toISOString(), tracking_token: 'demo-track-1', created_at: new Date().toISOString(), customers: { company_name: 'Titan Industrial' } })
        } else {
          const rows = await listLoads(user.companyId)
          setLoad(rows.find((item) => item.id === id) || null)
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

  if (error && !load) return <div className="form-error operations-alert">{error}</div>
  if (!load) return <div className="panel empty-state">Loading shipment...</div>

  const expenses = Number(load.driver_pay || 0) + Number(load.estimated_fuel || 0) + Number(load.additional_expenses || 0)
  const profit = Number(load.customer_rate || 0) - expenses
  const totalMiles = Number(load.loaded_miles || 0) + Number(load.deadhead_miles || 0)
  const rpm = totalMiles ? Number(load.customer_rate || 0) / totalMiles : 0

  return (
    <div className="operations-page load-detail-page">
      <div className="page-command-row"><div><button className="back-link" onClick={() => navigate('/loads')}>← Loads</button><span className="eyebrow">{load.customers?.company_name || 'LEGACY LOAD'}</span><h2>{load.load_number}</h2><p>{load.freight_description}</p></div><div className="load-detail-actions"><button className="secondary-button" onClick={() => navigate('/communications')}><Icon name="messages" size={17} /> Send Update</button><button className="primary-button" onClick={() => navigate('/documents')}><Icon name="documents" size={17} /> Add Document</button></div></div>
      {error && <div className="form-error operations-alert">{error}</div>}

      <section className="panel load-status-bar"><div><span>Current status</span><select value={load.status} disabled={saving} onChange={(e) => changeStatus(e.target.value as LoadStatus)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><span>Current ETA</span><strong>{load.current_eta ? new Date(load.current_eta).toLocaleString() : 'Not set'}</strong></div><div><span>Customer tracking</span><strong>/track/{load.tracking_token.slice(0, 8)}…</strong></div></section>

      <section className="load-detail-grid">
        <article className="panel load-route-panel"><div className="panel__header panel__header--bordered"><div><span className="panel__eyebrow">SHIPMENT ROUTE</span><h3>Pickup & Delivery</h3></div></div><div className="load-route-detail">
          <div className="load-route-stop"><span>A</span><div><small>PICKUP</small><h3>{load.pickup_company || `${load.pickup_city} pickup`}</h3><p>{load.pickup_address}<br />{load.pickup_city}, {load.pickup_state}</p><strong>{load.pickup_at ? new Date(load.pickup_at).toLocaleString() : 'Appointment not set'}</strong></div></div>
          <div className="load-route-connector" />
          <div className="load-route-stop load-route-stop--delivery"><span>B</span><div><small>DELIVERY</small><h3>{load.delivery_company || `${load.delivery_city} delivery`}</h3><p>{load.delivery_address}<br />{load.delivery_city}, {load.delivery_state}</p><strong>{load.delivery_at ? new Date(load.delivery_at).toLocaleString() : 'Appointment not set'}</strong></div></div>
        </div></article>

        <article className="panel profitability-panel"><div className="panel__header panel__header--bordered"><div><span className="panel__eyebrow">LOAD ECONOMICS</span><h3>Profitability</h3></div></div><dl><div><dt>Customer rate</dt><dd>${Number(load.customer_rate || 0).toLocaleString()}</dd></div><div><dt>Driver pay</dt><dd>−${Number(load.driver_pay || 0).toLocaleString()}</dd></div><div><dt>Estimated fuel</dt><dd>−${Number(load.estimated_fuel || 0).toLocaleString()}</dd></div><div><dt>Other expenses</dt><dd>−${Number(load.additional_expenses || 0).toLocaleString()}</dd></div><div className="profit-total"><dt>Estimated profit</dt><dd>${profit.toLocaleString()}</dd></div></dl><div className="profit-metrics"><div><strong>{totalMiles.toLocaleString()}</strong><span>Total miles</span></div><div><strong>${rpm.toFixed(2)}</strong><span>Revenue / mile</span></div><div><strong>{load.customer_rate ? `${Math.round((profit / load.customer_rate) * 100)}%` : '0%'}</strong><span>Margin</span></div></div></article>
      </section>

      <section className="panel freight-summary"><div className="panel__header panel__header--bordered"><div><span className="panel__eyebrow">FREIGHT</span><h3>Shipment Details</h3></div></div><dl><div><dt>Description</dt><dd>{load.freight_description}</dd></div><div><dt>Estimated weight</dt><dd>{load.estimated_weight ? `${Number(load.estimated_weight).toLocaleString()} lb` : 'Not provided'}</dd></div><div><dt>Loaded miles</dt><dd>{Number(load.loaded_miles || 0).toLocaleString()}</dd></div><div><dt>Deadhead miles</dt><dd>{Number(load.deadhead_miles || 0).toLocaleString()}</dd></div></dl></section>
    </div>
  )
}
