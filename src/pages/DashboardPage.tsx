import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { StatusPill } from '../components/StatusPill'
import { activeLoads, attentionItems, dashboardMetrics, weeklySchedule } from '../data/demo'

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const openLoad = (loadId: string) => navigate(`/loads/${loadId}`)

  return (
    <div className="dispatch-overview">
      <section className="dispatch-intro">
        <div>
          <span className="dispatch-intro__label">SHIFT SUMMARY</span>
          <h2>Good evening, {user?.fullName || 'Jared Guinn'}.</h2>
          <p>Three loads are moving, one pickup window is approaching, and four items need review.</p>
        </div>
        <div className="dispatch-intro__actions">
          <button className="dispatch-action dispatch-action--secondary" onClick={() => navigate('/communications')}><Icon name="messages" size={16} /> Send Update</button>
          <button className="dispatch-action dispatch-action--primary" onClick={() => navigate('/loads/new')}><Icon name="plus" size={16} /> Create Load</button>
        </div>
      </section>

      <section className="ops-kpi-strip" aria-label="Current operating metrics">
        {dashboardMetrics.map((metric, index) => (
          <button key={metric.label} className={`ops-kpi ops-kpi--${metric.trend}`} onClick={() => navigate(index < 2 ? '/loads' : '/invoices')}>
            <span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.note}</small>
          </button>
        ))}
      </section>

      <section className="dispatch-layout">
        <article className="dispatch-board">
          <header className="dispatch-section-head">
            <div><span>LIVE LOAD BOARD</span><h3>Active Shipments</h3></div>
            <div className="dispatch-board__filters" aria-label="Load filters">
              <button className="active">Moving</button><button>Today</button><button onClick={() => navigate('/loads')}>All Loads</button>
            </div>
          </header>

          <div className="dispatch-table-wrap">
            <table className="dispatch-table">
              <thead><tr><th>Load</th><th>Route</th><th>Schedule</th><th>Driver</th><th>Status</th><th>Movement</th><th /></tr></thead>
              <tbody>
                {activeLoads.map((load) => (
                  <tr key={load.id} className="dispatch-table__clickable-row" onClick={() => openLoad(load.id)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openLoad(load.id) }}>
                    <td className="dispatch-load-id"><strong>{load.loadNumber}</strong><span>{load.customer}</span></td>
                    <td className="dispatch-route-cell"><strong>{load.pickup}</strong><i /><span>{load.delivery}</span></td>
                    <td><strong>{load.appointment}</strong><span>{load.eta}</span></td>
                    <td><strong>{load.driver}</strong><span>Assigned</span></td>
                    <td><StatusPill status={load.status} /></td>
                    <td><div className="dispatch-progress"><span style={{ width: `${load.progress}%` }} /></div><small>{load.progress}% complete</small></td>
                    <td><button className="dispatch-row-action" aria-label={`Open ${load.loadNumber}`} onClick={(event) => { event.stopPropagation(); openLoad(load.id) }}><Icon name="arrow" size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="dispatch-mobile-loads">
            {activeLoads.map((load) => (
              <button key={load.id} onClick={() => openLoad(load.id)}>
                <div><strong>{load.loadNumber}</strong><StatusPill status={load.status} /></div>
                <span>{load.customer}</span><p>{load.pickup} <Icon name="arrow" size={13} /> {load.delivery}</p>
                <small>{load.appointment} · {load.driver}</small><div className="dispatch-progress"><span style={{ width: `${load.progress}%` }} /></div>
              </button>
            ))}
          </div>
        </article>

        <aside className="dispatch-sidecar">
          <section className="exception-queue">
            <header className="dispatch-section-head dispatch-section-head--compact"><div><span>EXCEPTION QUEUE</span><h3>Needs Attention</h3></div><strong className="exception-count">{attentionItems.length}</strong></header>
            <div className="exception-list">
              {attentionItems.map((item) => <button key={item.id} className={`exception-row exception-row--${item.severity}`} onClick={() => navigate(item.href)}><i /><span><strong>{item.title}</strong><small>{item.detail}</small></span><Icon name="arrow" size={14} /></button>)}
            </div>
          </section>

          <section className="route-brief">
            <header className="dispatch-section-head dispatch-section-head--compact"><div><span>NEXT MOVEMENT</span><h3>LH-1028</h3></div><Icon name="route" size={19} /></header>
            <div className="route-brief__stops">
              <div><b>A</b><span><small>PICKUP · 8:00 PM</small><strong>Fort Worth, TX</strong><em>Titan Industrial</em></span></div><i /><div><b>B</b><span><small>DELIVERY · TOMORROW</small><strong>Midland, TX</strong><em>8:00 AM appointment</em></span></div>
            </div>
            <dl className="route-brief__facts"><div><dt>Distance</dt><dd>318 mi</dd></div><div><dt>Drive</dt><dd>4 hr 42 min</dd></div><div><dt>Pickup ETA</dt><dd>7:38 PM</dd></div></dl>
            <button onClick={() => openLoad('load-1028')}>Open shipment details <Icon name="arrow" size={15} /></button>
          </section>
        </aside>
      </section>

      <section className="capacity-board">
        <header className="dispatch-section-head"><div><span>FIVE-DAY CAPACITY</span><h3>Pickup & Delivery Schedule</h3></div><button onClick={() => navigate('/loads')}>Open all loads <Icon name="arrow" size={14} /></button></header>
        <div className="capacity-timeline">
          {weeklySchedule.map((day, index) => {
            const total = day.pickups + day.deliveries
            return (
              <div className={`capacity-day ${index === 0 ? 'capacity-day--today' : ''}`} key={day.date}>
                <div><span>{day.day}</span><strong>{day.date}</strong></div>
                <div className="capacity-day__counts"><span><b>{day.pickups}</b> pickups</span><span><b>{day.deliveries}</b> deliveries</span></div>
                <div className="capacity-meter"><span style={{ width: `${Math.min(100, total * 24)}%` }} /></div>
                <small>{total === 0 ? 'Open capacity' : `${total} scheduled movement${total === 1 ? '' : 's'}`}</small>
                {day.movements.length > 0 && <div className="capacity-day__loads" aria-label={`${day.day} scheduled loads`}>
                  {day.movements.map((movement) => (
                    <button key={`${movement.loadId}-${movement.type}`} onClick={() => openLoad(movement.loadId)} aria-label={`Open ${movement.loadNumber} details`}>
                      <span><strong>{movement.loadNumber}</strong><small>{movement.type} · {movement.time}</small></span><em>{movement.status}</em><Icon name="arrow" size={13} />
                    </button>
                  ))}
                </div>}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
