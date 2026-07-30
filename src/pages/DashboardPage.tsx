import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { MetricCard } from '../components/MetricCard'
import { StatusPill } from '../components/StatusPill'
import { activeLoads, attentionItems, dashboardMetrics, weeklySchedule } from '../data/demo'

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div className="dashboard-page">
      <section className="welcome-row">
        <div>
          <h2>Good evening, {user?.fullName || 'Jared Guinn'}.</h2>
          <p>Here is what needs your attention across Legacy Hotshot.</p>
        </div>
        <div className="welcome-row__actions">
          <button className="secondary-button" onClick={() => navigate('/communications')}><Icon name="messages" size={17} /> Send Update</button>
          <button className="primary-button" onClick={() => navigate('/loads/new')}><Icon name="plus" size={17} /> Create Load</button>
        </div>
      </section>

      <section className="metrics-grid" aria-label="Business metrics">
        {dashboardMetrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>

      <section className="dashboard-grid dashboard-grid--top">
        <article className="panel attention-panel">
          <div className="panel__header">
            <div>
              <span className="panel__eyebrow">EXCEPTIONS FIRST</span>
              <h3>Attention Needed</h3>
            </div>
            <span className="count-badge">{attentionItems.length}</span>
          </div>
          <div className="attention-list">
            {attentionItems.map((item) => (
              <div className="attention-item" key={item.id}>
                <div className={`attention-item__icon attention-item__icon--${item.severity}`}>
                  <Icon name={item.severity === 'info' ? 'check' : 'alert'} size={18} />
                </div>
                <div className="attention-item__copy">
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </div>
                <button onClick={() => navigate(item.href)}>{item.action}<Icon name="arrow" size={15} /></button>
              </div>
            ))}
          </div>
        </article>

        <article className="panel today-panel">
          <div className="panel__header">
            <div>
              <span className="panel__eyebrow">AT A GLANCE</span>
              <h3>Today’s Route</h3>
            </div>
            <Icon name="route" />
          </div>
          <div className="route-summary">
            <div className="route-stop">
              <span className="route-stop__marker">A</span>
              <div><small>PICKUP</small><strong>Fort Worth, TX</strong><span>8:00 PM · Titan Industrial</span></div>
            </div>
            <div className="route-line"><span /></div>
            <div className="route-stop">
              <span className="route-stop__marker route-stop__marker--destination">B</span>
              <div><small>DELIVERY</small><strong>Midland, TX</strong><span>Tomorrow · 8:00 AM</span></div>
            </div>
          </div>
          <div className="route-stats">
            <div><Icon name="truck" size={18} /><span><strong>318 mi</strong> total route</span></div>
            <div><Icon name="clock" size={18} /><span><strong>4 hr 42 min</strong> drive estimate</span></div>
          </div>
          <button className="secondary-button secondary-button--full" onClick={() => navigate('/loads')}>Open LH-1028 <Icon name="arrow" size={16} /></button>
        </article>
      </section>

      <section className="panel loads-panel">
        <div className="panel__header panel__header--bordered">
          <div>
            <span className="panel__eyebrow">LIVE OPERATIONS</span>
            <h3>Active Loads</h3>
          </div>
          <button className="text-button" onClick={() => navigate('/loads')}>View all loads <Icon name="arrow" size={15} /></button>
        </div>
        <div className="loads-table-wrap">
          <table className="loads-table">
            <thead>
              <tr><th>Load</th><th>Route</th><th>Driver</th><th>Appointment</th><th>Status</th><th>Progress</th><th /></tr>
            </thead>
            <tbody>
              {activeLoads.map((load) => (
                <tr key={load.id}>
                  <td><strong>{load.loadNumber}</strong><span>{load.customer}</span></td>
                  <td><strong>{load.pickup}</strong><span>to {load.delivery}</span></td>
                  <td>{load.driver}</td>
                  <td><strong>{load.appointment}</strong><span>{load.eta}</span></td>
                  <td><StatusPill status={load.status} /></td>
                  <td>
                    <div className="progress-cell"><div className="progress-track"><span style={{ width: `${load.progress}%` }} /></div><small>{load.progress}%</small></div>
                  </td>
                  <td><button className="icon-button" aria-label={`Open ${load.loadNumber}`} onClick={() => navigate('/loads')}><Icon name="arrow" size={17} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="load-cards">
          {activeLoads.map((load) => (
            <button className="load-card" key={load.id} onClick={() => navigate('/loads')}>
              <div><strong>{load.loadNumber}</strong><StatusPill status={load.status} /></div>
              <span className="load-card__customer">{load.customer}</span>
              <p>{load.pickup} <Icon name="arrow" size={14} /> {load.delivery}</p>
              <small>{load.appointment} · {load.driver}</small>
              <div className="progress-track"><span style={{ width: `${load.progress}%` }} /></div>
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard-grid dashboard-grid--bottom">
        <article className="panel schedule-panel">
          <div className="panel__header">
            <div><span className="panel__eyebrow">NEXT FIVE DAYS</span><h3>Load Schedule</h3></div>
          </div>
          <div className="schedule-grid">
            {weeklySchedule.map((day, index) => (
              <div className={`schedule-day ${index === 0 ? 'schedule-day--today' : ''}`} key={day.date}>
                <span>{day.day}</span><strong>{day.date}</strong>
                <div><small>{day.pickups} PU</small><small>{day.deliveries} DEL</small></div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel quick-actions-panel">
          <div className="panel__header"><div><span className="panel__eyebrow">SAVE TIME</span><h3>Quick Actions</h3></div></div>
          <div className="quick-actions">
            <button onClick={() => navigate('/loads/new')}><Icon name="plus" /><span><strong>New Load</strong><small>Create or enter a request</small></span></button>
            <button onClick={() => navigate('/communications')}><Icon name="messages" /><span><strong>Status Update</strong><small>Send a customer update</small></span></button>
            <button onClick={() => navigate('/documents')}><Icon name="documents" /><span><strong>Upload POD</strong><small>Attach delivery paperwork</small></span></button>
            <button onClick={() => navigate('/invoices')}><Icon name="invoices" /><span><strong>New Invoice</strong><small>Bill a completed load</small></span></button>
          </div>
        </article>
      </section>
    </div>
  )
}
