import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { assignDriverToLoad, listDrivers } from '../lib/drivers'
import type { DriverSummary } from '../lib/drivers'
import { listLoads } from '../lib/operations'
import type { LoadRecord } from '../types'

const sampleDrivers: DriverSummary[] = [
  { id: 'sample-driver-1', full_name: 'Marcus Cole', phone: '(817) 555-0164', is_active: true, setup_complete: true },
  { id: 'sample-driver-2', full_name: 'Daniel Ruiz', phone: '(469) 555-0118', is_active: true, setup_complete: true },
]

const closedStatuses = ['delivered', 'pod_received', 'invoice_sent', 'paid', 'cancelled']

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function appointment(value: string | null) {
  return value ? new Date(value).toLocaleString() : 'Not scheduled'
}

export function DriversPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [drivers, setDrivers] = useState<DriverSummary[]>([])
  const [loads, setLoads] = useState<LoadRecord[]>([])
  const [search, setSearch] = useState('')
  const [savingLoadId, setSavingLoadId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showingSampleData, setShowingSampleData] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const loadData = async () => {
      try {
        if (!user?.companyId || user.demo) {
          if (!active) return
          setDrivers(sampleDrivers)
          setLoads([])
          setShowingSampleData(true)
          return
        }
        const [driverRows, loadRows] = await Promise.all([listDrivers(user.companyId), listLoads(user.companyId)])
        if (!active) return
        setDrivers(driverRows.length ? driverRows : sampleDrivers)
        setLoads(loadRows)
        setShowingSampleData(driverRows.length === 0)
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load driver dispatch.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadData()
    return () => { active = false }
  }, [user])

  const activeDrivers = useMemo(() => drivers.filter((driver) => driver.is_active), [drivers])
  const activeLoads = useMemo(() => loads.filter((load) => !closedStatuses.includes(load.status)), [loads])
  const assignmentCount = useMemo(() => new Map(activeDrivers.map((driver) => [driver.id, activeLoads.filter((load) => load.assigned_driver_id === driver.id).length])), [activeDrivers, activeLoads])
  const unassigned = useMemo(() => activeLoads.filter((load) => !load.assigned_driver_id), [activeLoads])
  const filteredLoads = useMemo(() => {
    const query = search.trim().toLowerCase()
    return activeLoads.filter((load) => !query || [load.load_number, load.pickup_city, load.pickup_state, load.delivery_city, load.delivery_state, load.freight_description, load.customers?.company_name].some((value) => value?.toLowerCase().includes(query)))
  }, [activeLoads, search])

  const assign = async (load: LoadRecord, driverId: string) => {
    if (!user) return
    const driver = activeDrivers.find((item) => item.id === driverId) || null
    setSavingLoadId(load.id)
    setMessage('')
    setError('')
    try {
      if (showingSampleData || user.demo || !user.companyId) {
        setLoads((current) => current.map((item) => item.id === load.id ? { ...item, assigned_driver_id: driver?.id ?? null, status: driver && item.status === 'booked' ? 'driver_assigned' : (!driver && item.status === 'driver_assigned' ? 'booked' : item.status) } : item))
        setMessage(driver ? `${driver.full_name} is assigned to ${load.load_number}. Sample notification preview only.` : `${load.load_number} is now unassigned.`)
      } else {
        const result = await assignDriverToLoad(user.companyId, user.id, load, driver)
        setLoads((current) => current.map((item) => item.id === load.id ? result.load : item))
        if (!driver) setMessage(`${load.load_number} is now unassigned.`)
        else if (result.notified) setMessage(`${driver.full_name} is assigned to ${load.load_number}, and the assignment email was sent to ${result.driverEmail}.`)
        else setMessage(`${driver.full_name} is assigned to ${load.load_number}. ${result.notificationError || 'The assignment email was not sent.'}`)
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update the driver assignment.')
    } finally {
      setSavingLoadId('')
    }
  }

  if (loading) return <div className="driver-dispatch-empty">Loading driver dispatch...</div>

  return (
    <div className="driver-dispatch-page">
      <header className="driver-dispatch-head">
        <div><span>FIELD OPERATIONS</span><h2>Driver Dispatch</h2><p>Match active drivers to booked loads and move accepted work into the field.</p></div>
        <button onClick={() => navigate('/users')}><Icon name="plus" size={16} /> Manage Driver Accounts</button>
      </header>

      {message && <div className="record-alert record-alert--success">{message}</div>}
      {error && <div className="record-alert record-alert--error">{error}</div>}
      {showingSampleData && <div className="sample-data-banner"><Icon name="alert" size={16} /><span><strong>Sample Data — Preview Only</strong> Add driver accounts in User Management to begin live assignment.</span></div>}

      <section className="driver-dispatch-metrics">
        <div><span>Active drivers</span><strong>{activeDrivers.length}</strong></div>
        <div><span>Active loads</span><strong>{activeLoads.length}</strong></div>
        <div><span>Unassigned</span><strong>{unassigned.length}</strong></div>
        <div><span>Assigned today</span><strong>{activeLoads.filter((load) => load.assigned_driver_id).length}</strong></div>
      </section>

      <section className="driver-roster">
        <div className="driver-section-head"><div><span>DRIVER ROSTER</span><h3>Available Team</h3></div><small>{activeDrivers.length} active driver accounts</small></div>
        <div className="driver-roster-grid">
          {activeDrivers.map((driver) => <article key={driver.id}><div className="driver-avatar">{initials(driver.full_name)}</div><div><strong>{driver.full_name}</strong><span>{driver.phone || 'No phone listed'}</span><small>{driver.setup_complete ? 'Portal ready' : 'Account setup pending'}</small></div><b>{assignmentCount.get(driver.id) || 0} active</b></article>)}
          {!activeDrivers.length && <div className="driver-dispatch-empty">No active driver accounts are available.</div>}
        </div>
      </section>

      <section className="driver-load-board">
        <div className="driver-section-head"><div><span>ASSIGNMENT BOARD</span><h3>Active Loads</h3></div><label><Icon name="search" size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search load, customer, or route" /></label></div>
        <div className="driver-load-board__head"><span>Load</span><span>Route & appointment</span><span>Freight</span><span>Status</span><span>Driver assignment</span></div>
        {filteredLoads.map((load) => {
          const driver = activeDrivers.find((item) => item.id === load.assigned_driver_id)
          return <article key={load.id}>
            <button className="driver-load-link" onClick={() => navigate(`/loads/${load.id}`)}><strong>{load.load_number}</strong><small>{load.customers?.company_name || load.pickup_company || 'Legacy load'}</small></button>
            <div><strong>{load.pickup_city}, {load.pickup_state} → {load.delivery_city}, {load.delivery_state}</strong><small>Pickup {appointment(load.pickup_at)}</small></div>
            <div><strong>{load.freight_description}</strong><small>{Number(load.loaded_miles || 0).toLocaleString()} loaded miles</small></div>
            <div><span className={`driver-status driver-status--${load.status}`}>{load.status.replaceAll('_', ' ')}</span></div>
            <div className="driver-assignment-control"><select value={load.assigned_driver_id || ''} disabled={savingLoadId === load.id || showingSampleData && !loads.length} onChange={(event) => assign(load, event.target.value)}><option value="">Unassigned</option>{activeDrivers.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select><small>{savingLoadId === load.id ? 'Saving and notifying driver…' : driver ? `${driver.full_name} has this load` : 'Choose a driver'}</small></div>
          </article>
        })}
        {!filteredLoads.length && <div className="driver-dispatch-empty">No active loads match the current search.</div>}
      </section>
    </div>
  )
}
