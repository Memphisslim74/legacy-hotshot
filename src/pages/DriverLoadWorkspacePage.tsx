import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { demoDriverLoad } from '../data/driverDemo'
import { listDriverLoads } from '../lib/driverOperations'
import { formatDriveTime } from '../lib/routing'
import type { LoadRecord } from '../types'
import { DriverLoadPage } from './DriverLoadPage'

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

export function DriverLoadWorkspacePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [load, setLoad] = useState<LoadRecord | null>(null)
  const [showingSampleData, setShowingSampleData] = useState(false)

  useEffect(() => {
    let active = true
    const loadRoute = async () => {
      try {
        if (!user?.companyId || user.demo) {
          if (!active) return
          setLoad({ ...demoDriverLoad, id: id || demoDriverLoad.id })
          setShowingSampleData(true)
          return
        }
        const rows = await listDriverLoads(user.companyId, user.id, user.role)
        if (!active) return
        const selected = rows.find((item) => item.id === id) || null
        setLoad(selected)
        setShowingSampleData(false)
      } catch {
        if (active) setLoad(null)
      }
    }
    loadRoute()
    return () => { active = false }
  }, [id, user])

  const pickup = load ? formatAddress(load.pickup_address, load.pickup_city, load.pickup_state) : ''
  const delivery = load ? formatAddress(load.delivery_address, load.delivery_city, load.delivery_state) : ''

  return (
    <div className="driver-load-shell-v2">
      {load && <section className="driver-route-command">
        <div className="driver-route-command__identity"><span>ROUTE COMMAND</span><strong>{load.load_number}</strong><small>{load.pickup_city}, {load.pickup_state} → {load.delivery_city}, {load.delivery_state}</small></div>
        <div className="driver-route-command__group"><span>Loaded miles</span><strong>{load.loaded_miles ? load.loaded_miles.toLocaleString() : 'Not calculated'}</strong><small>{load.route_provider === 'manual' ? 'Manual estimate' : 'Saved route estimate'}</small></div>
        <div className="driver-route-command__group"><span>Drive time</span><strong>{formatDriveTime(load.route_duration_seconds)}</strong><small>Estimated driving time</small></div>
        <div className="driver-route-command__group"><span>Pickup</span><a href={googleDirections(pickup)} target="_blank" rel="noreferrer"><Icon name="route" size={15} /> Google</a><a href={appleDirections(pickup)} target="_blank" rel="noreferrer"><Icon name="route" size={15} /> Apple</a></div>
        <div className="driver-route-command__group"><span>Delivery</span><a href={googleDirections(delivery)} target="_blank" rel="noreferrer"><Icon name="route" size={15} /> Google</a><a href={appleDirections(delivery)} target="_blank" rel="noreferrer"><Icon name="route" size={15} /> Apple</a></div>
        <div className="driver-route-command__group driver-route-command__group--full"><span>Full route</span><a href={googleDirections(delivery, pickup)} target="_blank" rel="noreferrer"><Icon name="arrow" size={15} /> Google Route</a><a href={appleDirections(delivery, pickup)} target="_blank" rel="noreferrer"><Icon name="arrow" size={15} /> Apple Route</a></div>
      </section>}
      {showingSampleData && <div className="sample-data-banner"><Icon name="alert" size={16} /><span><strong>Sample Data — Preview Only</strong> This driver route is not stored in Supabase.</span></div>}
      <DriverLoadPage />
    </div>
  )
}
