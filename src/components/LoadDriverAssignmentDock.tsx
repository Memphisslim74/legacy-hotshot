import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { assignDriverToLoad, listDrivers } from '../lib/drivers'
import type { DriverSummary } from '../lib/drivers'
import { listLoads } from '../lib/operations'
import type { LoadRecord } from '../types'

export function LoadDriverAssignmentDock() {
  const location = useLocation()
  const { user } = useAuth()
  const match = location.pathname.match(/^\/loads\/([^/]+)$/)
  const loadId = match?.[1] || ''
  const [load, setLoad] = useState<LoadRecord | null>(null)
  const [drivers, setDrivers] = useState<DriverSummary[]>([])
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const loadData = async () => {
      if (!loadId || !user?.companyId || user.demo || user.role === 'driver') {
        if (active) { setLoad(null); setDrivers([]) }
        return
      }
      try {
        const [loadRows, driverRows] = await Promise.all([
          listLoads(user.companyId),
          listDrivers(user.companyId),
        ])
        if (!active) return
        setLoad(loadRows.find((item) => item.id === loadId) || null)
        setDrivers(driverRows.filter((item) => item.is_active))
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load driver assignment controls.')
      }
    }
    loadData()
    return () => { active = false }
  }, [loadId, user])

  const assignedDriver = useMemo(
    () => drivers.find((driver) => driver.id === load?.assigned_driver_id) || null,
    [drivers, load?.assigned_driver_id],
  )

  if (!loadId || !user || user.role === 'driver' || !load) return null

  const assign = async (driverId: string) => {
    const driver = drivers.find((item) => item.id === driverId) || null
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const result = await assignDriverToLoad(user.companyId || '', user.id, load, driver)
      setLoad(result.load)
      if (!driver) setMessage(`${load.load_number} is now unassigned.`)
      else if (result.notified) setMessage(`${driver.full_name} was assigned and notified by email.`)
      else setMessage(`${driver.full_name} was assigned. ${result.notificationError || 'The email was not sent.'}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update the driver assignment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside className={`load-assignment-dock ${expanded ? 'is-expanded' : ''}`} aria-label="Driver assignment">
      <button className="load-assignment-dock__toggle" onClick={() => setExpanded((current) => !current)}>
        <span><small>DRIVER ASSIGNMENT</small><strong>{assignedDriver?.full_name || 'Unassigned'}</strong></span>
        <b>{expanded ? 'Close' : 'Manage'}</b>
      </button>
      {expanded && (
        <div className="load-assignment-dock__body">
          <p>Assign or reassign this load. The selected driver receives the branded load email automatically.</p>
          <label>
            Assigned driver
            <select value={load.assigned_driver_id || ''} disabled={saving} onChange={(event) => assign(event.target.value)}>
              <option value="">Unassigned</option>
              {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.full_name}</option>)}
            </select>
          </label>
          <div className="load-assignment-dock__meta">
            <span>Load</span><strong>{load.load_number}</strong>
            <span>Status</span><strong>{load.status.replaceAll('_', ' ')}</strong>
          </div>
          {saving && <div className="load-assignment-dock__notice">Saving assignment and sending notification…</div>}
          {message && <div className="load-assignment-dock__notice success">{message}</div>}
          {error && <div className="load-assignment-dock__notice error">{error}</div>}
        </div>
      )}
    </aside>
  )
}
