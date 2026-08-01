import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { StatusPill } from '../components/StatusPill'
import { activeLoads as sampleActiveLoads, attentionItems as sampleAttentionItems, dashboardMetrics as sampleDashboardMetrics, weeklySchedule as sampleWeeklySchedule } from '../data/demo'
import { listLoads } from '../lib/operations'
import { formatDriveTime } from '../lib/routing'
import type { LoadRecord, LoadStatus } from '../types'

const terminalStatuses: LoadStatus[] = ['delivered', 'pod_received', 'invoice_sent', 'paid', 'cancelled']
const movingStatuses: LoadStatus[] = ['driver_assigned', 'en_route_to_pickup', 'arrived_at_pickup', 'loaded', 'in_transit', 'delayed', 'arrived_at_delivery']

const statusLabels: Record<LoadStatus, string> = {
  request_received: 'Request Received', reviewing: 'Reviewing', quoted: 'Quoted', booked: 'Booked', driver_assigned: 'Driver Assigned', en_route_to_pickup: 'En Route to Pickup', arrived_at_pickup: 'Arrived at Pickup', loaded: 'Loaded', in_transit: 'In Transit', delayed: 'Delayed', arrived_at_delivery: 'Arrived at Delivery', delivered: 'Delivered', pod_received: 'POD Received', invoice_sent: 'Invoice Sent', paid: 'Paid', cancelled: 'Cancelled',
}

const progressByStatus: Record<LoadStatus, number> = {
  request_received: 2, reviewing: 5, quoted: 8, booked: 10, driver_assigned: 16, en_route_to_pickup: 24, arrived_at_pickup: 34, loaded: 46, in_transit: 68, delayed: 60, arrived_at_delivery: 84, delivered: 94, pod_received: 97, invoice_sent: 98, paid: 100, cancelled: 0,
}

function formatLocation(city: string, state: string) {
  return [city, state].filter(Boolean).join(', ')
}

function formatAppointment(value: string | null) {
  if (!value) return 'Not scheduled'
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function startOfDay(value: Date) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function sameDay(value: string | null, date: Date) {
  if (!value) return false
  const item = new Date(value)
  return item.getFullYear() === date.getFullYear() && item.getMonth() === date.getMonth() && item.getDate() === date.getDate()
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loads, setLoads] = useState<LoadRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showingSampleData, setShowingSampleData] = useState(false)
  const openLoad = (loadId: string) => navigate(`/loads/${loadId}`)

  useEffect(() => {
    let active = true
    const loadDashboard = async () => {
      try {
        if (!user?.companyId || user.demo) {
          if (active) setShowingSampleData(true)
          return
        }
        const rows = await listLoads(user.companyId)
        if (!active) return
        setLoads(rows)
        setShowingSampleData(rows.length === 0)
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load dashboard operations.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadDashboard()
    if (!user?.companyId || user.demo) setLoading(false)
    return () => { active = false }
  }, [user])

  const activeRows = useMemo(() => loads
    .filter((load) => !terminalStatuses.includes(load.status))
    .sort((a, b) => new Date(a.pickup_at || a.created_at || 0).getTime() - new Date(b.pickup_at || b.created_at || 0).getTime())
    .slice(0, 8), [loads])

  const activeBoard = useMemo(() => showingSampleData
    ? sampleActiveLoads
    : activeRows.map((load) => ({
      id: load.id,
      loadNumber: load.load_number,
      customer: load.customers?.company_name || load.pickup_company || 'Unassigned business',
      pickup: formatLocation(load.pickup_city, load.pickup_state),
      delivery: formatLocation(load.delivery_city, load.delivery_state),
      appointment: formatAppointment(load.pickup_at),
      eta: load.current_eta ? `ETA ${formatAppointment(load.current_eta)}` : `${Number(load.loaded_miles || 0).toLocaleString()} loaded mi · ${formatDriveTime(load.route_duration_seconds)}`,
      driver: load.assigned_driver?.full_name || (load.assigned_driver_id ? 'Assigned driver' : 'Unassigned'),
      status: statusLabels[load.status],
      progress: progressByStatus[load.status],
    })), [activeRows, showingSampleData])

  const weeklySchedule = useMemo(() => {
    if (showingSampleData) return sampleWeeklySchedule
    const today = startOfDay(new Date())
    return Array.from({ length: 5 }, (_, index) => {
      const date = new Date(today)
      date.setDate(today.getDate() + index)
      const movements = loads.flatMap((load) => {
        const rows: Array<{ loadId: string; loadNumber: string; type: 'Pickup' | 'Delivery'; time: string; status: string }> = []
        if (sameDay(load.pickup_at, date)) rows.push({ loadId: load.id, loadNumber: load.load_number, type: 'Pickup', time: load.pickup_at ? new Date(load.pickup_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'TBD', status: statusLabels[load.status] })
        if (sameDay(load.delivery_at, date)) rows.push({ loadId: load.id, loadNumber: load.load_number, type: 'Delivery', time: load.delivery_at ? new Date(load.delivery_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'TBD', status: statusLabels[load.status] })
        return rows
      }).sort((a, b) => a.time.localeCompare(b.time))
      return {
        day: date.toLocaleDateString([], { weekday: 'short' }),
        date: date.toLocaleDateString([], { day: '2-digit' }),
        pickups: movements.filter((movement) => movement.type === 'Pickup').length,
        deliveries: movements.filter((movement) => movement.type === 'Delivery').length,
        movements,
      }
    })
  }, [loads, showingSampleData])

  const attentionItems = useMemo(() => {
    if (showingSampleData) return sampleAttentionItems
    const now = Date.now()
    const items = loads.flatMap((load) => {
      const results: Array<{ id: string; severity: 'critical' | 'warning' | 'info'; title: string; detail: string; href: string }> = []
      const pickupTime = load.pickup_at ? new Date(load.pickup_at).getTime() : null
      if (load.status === 'delayed') results.push({ id: `${load.id}-delay`, severity: 'critical', title: 'Load is delayed', detail: `${load.load_number} · ${formatLocation(load.pickup_city, load.pickup_state)} → ${formatLocation(load.delivery_city, load.delivery_state)}`, href: `/loads/${load.id}` })
      if (pickupTime && pickupTime >= now && pickupTime - now <= 2 * 60 * 60 * 1000) results.push({ id: `${load.id}-pickup`, severity: 'warning', title: 'Pickup window is approaching', detail: `${load.load_number} · ${formatAppointment(load.pickup_at)}`, href: `/loads/${load.id}` })
      if (!load.assigned_driver_id && !terminalStatuses.includes(load.status)) results.push({ id: `${load.id}-driver`, severity: 'info', title: 'Driver assignment needed', detail: `${load.load_number} · ${formatLocation(load.pickup_city, load.pickup_state)}`, href: `/loads/${load.id}` })
      return results
    })
    return items.slice(0, 6)
  }, [loads, showingSampleData])

  const nextMovement = useMemo(() => {
    if (showingSampleData) return null
    const now = Date.now()
    return loads
      .flatMap((load) => [
        load.pickup_at ? { load, type: 'Pickup' as const, at: load.pickup_at, location: formatLocation(load.pickup_city, load.pickup_state), company: load.pickup_company } : null,
        load.delivery_at ? { load, type: 'Delivery' as const, at: load.delivery_at, location: formatLocation(load.delivery_city, load.delivery_state), company: load.delivery_company } : null,
      ])
      .filter((item): item is NonNullable<typeof item> => Boolean(item) && new Date(item.at).getTime() >= now)
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())[0] || null
  }, [loads, showingSampleData])

  const movingCount = showingSampleData ? 3 : loads.filter((load) => movingStatuses.includes(load.status)).length
  const deliveredToday = showingSampleData ? 1 : loads.filter((load) => ['delivered', 'pod_received'].includes(load.status) && sameDay(load.delivery_at, new Date())).length
  const dashboardMetrics = showingSampleData ? sampleDashboardMetrics : [
    { label: 'Active loads', value: String(activeRows.length), note: `${deliveredToday} delivering today`, trend: 'neutral' },
    { label: 'Needs attention', value: String(attentionItems.length), note: `${movingCount} currently moving`, trend: attentionItems.length ? 'warning' : 'positive' },
    { label: 'Scheduled today', value: String(weeklySchedule[0]?.pickups + weeklySchedule[0]?.deliveries || 0), note: 'Pickups and deliveries', trend: 'neutral' },
    { label: 'Completed loads', value: String(loads.filter((load) => ['delivered', 'pod_received', 'invoice_sent', 'paid'].includes(load.status)).length), note: 'All completed records', trend: 'positive' },
  ]

  const summaryText = loading
    ? 'Loading current operations...'
    : `${movingCount} load${movingCount === 1 ? '' : 's'} moving, ${weeklySchedule[0]?.pickups || 0} pickup${weeklySchedule[0]?.pickups === 1 ? '' : 's'} today, and ${attentionItems.length} item${attentionItems.length === 1 ? '' : 's'} needing review.`

  return (
    <div className="dispatch-overview">
      {error && <div className="form-error operations-alert">{error}</div>}
      {showingSampleData && <div className="sample-data-banner"><Icon name="alert" size={16} /><span><strong>Sample Data — Preview Only</strong> Dashboard records are display-only until real loads are created.</span></div>}

      <section className="dispatch-intro">
        <div><span className="dispatch-intro__label">SHIFT SUMMARY</span><h2>Good evening, {user?.fullName || 'Jared Guinn'}.</h2><p>{summaryText}</p></div>
        <div className="dispatch-intro__actions"><button className="dispatch-action dispatch-action--secondary" onClick={() => navigate('/communications')}><Icon name="messages" size={16} /> Send Update</button><button className="dispatch-action dispatch-action--primary" onClick={() => navigate('/loads/new')}><Icon name="plus" size={16} /> Create Load</button></div>
      </section>

      <section className="ops-kpi-strip" aria-label="Current operating metrics">
        {dashboardMetrics.map((metric, index) => <button key={metric.label} className={`ops-kpi ops-kpi--${metric.trend}`} onClick={() => navigate(index < 3 ? '/loads' : '/reports')}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.note}</small></button>)}
      </section>

      <section className="dispatch-layout">
        <article className="dispatch-board">
          <header className="dispatch-section-head"><div><span>LIVE LOAD BOARD</span><h3>Active Shipments</h3></div><div className="dispatch-board__filters"><button className="active">Moving</button><button onClick={() => navigate('/loads')}>Today</button><button onClick={() => navigate('/loads')}>All Loads</button></div></header>
          <div className="dispatch-table-wrap"><table className="dispatch-table"><thead><tr><th>Load</th><th>Route</th><th>Schedule</th><th>Driver</th><th>Status</th><th>Movement</th><th /></tr></thead><tbody>{activeBoard.map((load) => <tr key={load.id} className="dispatch-table__clickable-row" onClick={() => openLoad(load.id)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openLoad(load.id) }}><td className="dispatch-load-id"><strong>{load.loadNumber}</strong><span>{load.customer}</span></td><td className="dispatch-route-cell"><strong>{load.pickup}</strong><i /><span>{load.delivery}</span></td><td><strong>{load.appointment}</strong><span>{load.eta}</span></td><td><strong>{load.driver}</strong><span>{load.driver === 'Unassigned' ? 'Needs assignment' : 'Assigned'}</span></td><td><StatusPill status={load.status} /></td><td><div className="dispatch-progress"><span style={{ width: `${load.progress}%` }} /></div><small>{load.progress}% complete</small></td><td><button className="dispatch-row-action" onClick={(event) => { event.stopPropagation(); openLoad(load.id) }}><Icon name="arrow" size={16} /></button></td></tr>)}</tbody></table></div>
          <div className="dispatch-mobile-loads">{activeBoard.map((load) => <button key={load.id} onClick={() => openLoad(load.id)}><div><strong>{load.loadNumber}</strong><StatusPill status={load.status} /></div><span>{load.customer}</span><p>{load.pickup} <Icon name="arrow" size={13} /> {load.delivery}</p><small>{load.appointment} · {load.driver}</small><div className="dispatch-progress"><span style={{ width: `${load.progress}%` }} /></div></button>)}</div>
          {!activeBoard.length && <div className="load-register-empty">No active loads. Create a load to begin dispatching.</div>}
        </article>

        <aside className="dispatch-sidecar">
          <section className="exception-queue"><header className="dispatch-section-head dispatch-section-head--compact"><div><span>EXCEPTION QUEUE</span><h3>Needs Attention</h3></div><strong className="exception-count">{attentionItems.length}</strong></header><div className="exception-list">{attentionItems.map((item) => <button key={item.id} className={`exception-row exception-row--${item.severity}`} onClick={() => navigate(item.href)}><i /><span><strong>{item.title}</strong><small>{item.detail}</small></span><Icon name="arrow" size={14} /></button>)}{!attentionItems.length && <div className="load-register-empty">No immediate exceptions.</div>}</div></section>

          <section className="route-brief">
            <header className="dispatch-section-head dispatch-section-head--compact"><div><span>NEXT MOVEMENT</span><h3>{nextMovement?.load.load_number || (showingSampleData ? 'LH-1028' : 'No upcoming movement')}</h3></div><Icon name="route" size={19} /></header>
            {nextMovement ? <><div className="route-brief__stops"><div><b>{nextMovement.type === 'Pickup' ? 'A' : 'B'}</b><span><small>{nextMovement.type.toUpperCase()} · {formatAppointment(nextMovement.at)}</small><strong>{nextMovement.location}</strong><em>{nextMovement.company || 'Company not entered'}</em></span></div></div><dl className="route-brief__facts"><div><dt>Distance</dt><dd>{Number(nextMovement.load.loaded_miles || 0).toLocaleString()} mi</dd></div><div><dt>Drive</dt><dd>{formatDriveTime(nextMovement.load.route_duration_seconds)}</dd></div><div><dt>Status</dt><dd>{statusLabels[nextMovement.load.status]}</dd></div></dl><button onClick={() => openLoad(nextMovement.load.id)}>Open shipment details <Icon name="arrow" size={15} /></button></> : showingSampleData ? <><div className="route-brief__stops"><div><b>A</b><span><small>PICKUP · 8:00 PM</small><strong>Fort Worth, TX</strong><em>Titan Industrial</em></span></div><i /><div><b>B</b><span><small>DELIVERY · TOMORROW</small><strong>Midland, TX</strong><em>8:00 AM appointment</em></span></div></div><dl className="route-brief__facts"><div><dt>Distance</dt><dd>318 mi</dd></div><div><dt>Drive</dt><dd>4 hr 42 min</dd></div><div><dt>Pickup ETA</dt><dd>7:38 PM</dd></div></dl><button onClick={() => openLoad('load-1028')}>Open shipment details <Icon name="arrow" size={15} /></button></> : <p>No future pickup or delivery appointments are currently scheduled.</p>}
          </section>
        </aside>
      </section>

      <section className="capacity-board">
        <header className="dispatch-section-head"><div><span>FIVE-DAY CAPACITY</span><h3>Pickup & Delivery Schedule</h3></div><button onClick={() => navigate('/loads')}>Open all loads <Icon name="arrow" size={14} /></button></header>
        <div className="capacity-timeline">{weeklySchedule.map((day, index) => { const total = day.pickups + day.deliveries; return <div className={`capacity-day ${index === 0 ? 'capacity-day--today' : ''}`} key={`${day.day}-${day.date}`}><div><span>{day.day}</span><strong>{day.date}</strong></div><div className="capacity-day__counts"><span><b>{day.pickups}</b> pickups</span><span><b>{day.deliveries}</b> deliveries</span></div><div className="capacity-meter"><span style={{ width: `${Math.min(100, total * 24)}%` }} /></div><small>{total === 0 ? 'Open capacity' : `${total} scheduled movement${total === 1 ? '' : 's'}`}</small>{day.movements.length > 0 && <div className="capacity-day__loads">{day.movements.map((movement) => <button key={`${movement.loadId}-${movement.type}`} onClick={() => openLoad(movement.loadId)}><span><strong>{movement.loadNumber}</strong><small>{movement.type} · {movement.time}</small></span><em>{movement.status}</em><Icon name="arrow" size={13} /></button>)}</div>}</div> })}</div>
      </section>
    </div>
  )
}
