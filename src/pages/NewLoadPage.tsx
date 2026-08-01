import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { LoadRequestForm, emptyLoadRequest } from '../components/LoadRequestForm'
import { Icon } from '../components/Icon'
import { createBookedLoad, createCustomer, listCustomers, submitPublicLoadRequest } from '../lib/operations'
import { estimateRoute, formatDriveTime } from '../lib/routing'
import type { BusinessRelationshipInput } from '../lib/operations'
import type { Customer, LoadRequestInput } from '../types'
import type { RouteEstimate } from '../lib/routing'

const intakeSections = [
  { label: 'Business', detail: 'Select or create the relationship' },
  { label: 'Pickup', detail: 'Origin, appointment, instructions' },
  { label: 'Delivery', detail: 'Destination and receiving details' },
  { label: 'Freight', detail: 'Equipment, weight, dimensions' },
  { label: 'Review', detail: 'Route, mileage, and booking' },
]

const emptyBusiness: BusinessRelationshipInput = {
  companyName: '', relationshipTypes: ['customer'], relationshipStatus: 'active', preferredPartner: false,
  primaryContact: '', email: '', phone: '', websiteUrl: '', city: '', state: '', paymentTerms: 'Net 30',
  communicationPreference: 'email', vendorCategory: '', notes: '',
}

const completeAddress = (values: LoadRequestInput, type: 'pickup' | 'delivery') => {
  const parts = type === 'pickup'
    ? [values.pickupAddress, values.pickupCity, values.pickupState, values.pickupPostalCode]
    : [values.deliveryAddress, values.deliveryCity, values.deliveryState, values.deliveryPostalCode]
  return parts.map((part) => part.trim()).filter(Boolean).join(', ')
}

function relationshipPrefill(business: Customer, base: Partial<LoadRequestInput>): Partial<LoadRequestInput> {
  const requester = {
    ...base,
    requesterCompany: business.company_name,
    requesterName: business.primary_contact || base.requesterName || '',
    requesterEmail: business.email || base.requesterEmail || '',
    requesterPhone: business.phone || '',
  }

  const isReceiver = business.relationship_types.includes('receiver')
    && !business.relationship_types.some((role) => ['customer', 'broker', 'shipper', 'vendor'].includes(role))

  if (isReceiver) {
    return {
      ...requester,
      deliveryCompany: business.company_name,
      deliveryAddress: business.address_line_1 || '',
      deliveryCity: business.city || '',
      deliveryState: business.state || '',
      deliveryPostalCode: business.postal_code || '',
      deliveryContact: business.primary_contact || '',
      deliveryPhone: business.phone || '',
    }
  }

  return {
    ...requester,
    pickupCompany: business.company_name,
    pickupAddress: business.address_line_1 || '',
    pickupCity: business.city || '',
    pickupState: business.state || '',
    pickupPostalCode: business.postal_code || '',
    pickupContact: business.primary_contact || '',
    pickupPhone: business.phone || '',
  }
}

export function NewLoadPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [businesses, setBusinesses] = useState<Customer[]>([])
  const [businessMode, setBusinessMode] = useState<'existing' | 'new'>('existing')
  const [selectedBusinessId, setSelectedBusinessId] = useState(searchParams.get('businessId') || '')
  const [newBusiness, setNewBusiness] = useState<BusinessRelationshipInput>(emptyBusiness)
  const [formValues, setFormValues] = useState<LoadRequestInput>({ ...emptyLoadRequest, requesterName: user?.fullName || '', requesterEmail: user?.email || '' })
  const [route, setRoute] = useState<RouteEstimate | null>(null)
  const [routeMode, setRouteMode] = useState<'automatic' | 'manual'>('automatic')
  const [manualMiles, setManualMiles] = useState('')
  const [manualHours, setManualHours] = useState('')
  const [manualMinutes, setManualMinutes] = useState('')
  const [calculatingRoute, setCalculatingRoute] = useState(false)
  const [routeError, setRouteError] = useState('')

  useEffect(() => {
    const loadBusinesses = async () => {
      if (!user?.companyId || user.demo) return
      try {
        setBusinesses(await listCustomers(user.companyId))
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load businesses.')
      }
    }
    loadBusinesses()
  }, [user])

  const selectedBusiness = useMemo(
    () => businesses.find((business) => business.id === selectedBusinessId) || null,
    [businesses, selectedBusinessId],
  )

  const initialValues = useMemo<Partial<LoadRequestInput>>(() => {
    const base = { requesterName: user?.fullName || 'Jared Guinn', requesterEmail: user?.email || '' }
    if (businessMode === 'new') {
      return {
        ...base,
        requesterCompany: newBusiness.companyName,
        requesterName: newBusiness.primaryContact || base.requesterName,
        requesterEmail: newBusiness.email || base.requesterEmail,
        requesterPhone: newBusiness.phone,
      }
    }
    if (!selectedBusiness) return base
    return relationshipPrefill(selectedBusiness, base)
  }, [businessMode, newBusiness, selectedBusiness, user])

  useEffect(() => {
    setRoute(null)
    setRouteError('')
  }, [formValues.pickupAddress, formValues.pickupCity, formValues.pickupState, formValues.pickupPostalCode, formValues.deliveryAddress, formValues.deliveryCity, formValues.deliveryState, formValues.deliveryPostalCode])

  const calculateRoute = useCallback(async (values = formValues) => {
    const origin = completeAddress(values, 'pickup')
    const destination = completeAddress(values, 'delivery')
    if (!origin || !destination || !values.pickupCity || !values.pickupState || !values.deliveryCity || !values.deliveryState) {
      setRouteError('Enter complete pickup and delivery addresses before calculating the route.')
      return null
    }
    setCalculatingRoute(true)
    setRouteError('')
    try {
      const result = user?.demo
        ? { distanceMeters: 511000, durationSeconds: 16920, loadedMiles: 317.5, provider: 'demo', calculatedAt: new Date().toISOString() }
        : await estimateRoute(origin, destination)
      setRoute(result)
      return result
    } catch (caught) {
      setRouteError(`${caught instanceof Error ? caught.message : 'Unable to calculate this route.'} Enter the route manually to continue.`)
      setRouteMode('manual')
      return null
    } finally {
      setCalculatingRoute(false)
    }
  }, [formValues, user])

  const manualRouteEstimate = useMemo<RouteEstimate | null>(() => {
    const miles = Number(manualMiles)
    const hours = Number(manualHours || 0)
    const minutes = Number(manualMinutes || 0)
    if (!Number.isFinite(miles) || miles <= 0 || !Number.isFinite(hours) || hours < 0 || !Number.isFinite(minutes) || minutes < 0 || minutes > 59) return null
    const durationSeconds = Math.round((hours * 60 + minutes) * 60)
    if (durationSeconds <= 0) return null
    return {
      distanceMeters: Math.round(miles * 1609.344),
      durationSeconds,
      loadedMiles: Math.round(miles * 10) / 10,
      provider: 'manual',
      calculatedAt: new Date().toISOString(),
    }
  }, [manualMiles, manualHours, manualMinutes])

  const ensureBusiness = async () => {
    if (!user?.companyId || user.demo) return selectedBusinessId || undefined
    if (businessMode === 'existing') return selectedBusinessId || undefined
    if (!newBusiness.companyName.trim()) throw new Error('Enter the new business name before booking the load.')
    const created = await createCustomer(user.companyId, user.id, newBusiness)
    setBusinesses((current) => [created, ...current])
    setSelectedBusinessId(created.id)
    return created.id
  }

  const handleSubmit = async (values: LoadRequestInput, action: 'primary' | 'secondary') => {
    if (!user) return
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      if (action === 'secondary') {
        if (user.demo) setSuccess('Demo load request LHR-1005 was created. It now appears under Load Requests.')
        else {
          const request = await submitPublicLoadRequest(values)
          setSuccess(`${request.request_number} was created and is ready for review.`)
        }
      } else if (user.demo) {
        await calculateRoute(values)
        setSuccess('Demo load LH-1030 was booked successfully.')
      } else {
        if (!user.companyId) throw new Error('Complete company setup before creating a booked load.')
        const customerId = await ensureBusiness()
        const routeEstimate = routeMode === 'manual' ? manualRouteEstimate : route || await calculateRoute(values)
        if (!routeEstimate) {
          throw new Error(routeMode === 'manual'
            ? 'Enter valid loaded miles and drive time before booking this load.'
            : 'Calculate the route or switch to manual entry before booking this load.')
        }
        const load = await createBookedLoad(user.companyId, user.id, values, customerId, routeEstimate)
        setSuccess(`${load.load_number} was booked with ${routeEstimate.loadedMiles.toLocaleString()} loaded miles and ${formatDriveTime(routeEstimate.durationSeconds)} drive time.`)
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create the load.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="load-intake-workspace">
      <header className="load-intake-header">
        <div>
          <button className="back-link" onClick={() => navigate('/loads')}>← Shipment Control</button>
          <span>LOAD INTAKE</span>
          <h2>Create shipment record</h2>
          <p>Select the business relationship, enter the shipment, calculate the route, and book one connected operating record.</p>
        </div>
        <div className="load-intake-header__note"><Icon name="check" size={17} /><span>Customer and route metrics stay linked everywhere the load appears.</span></div>
      </header>

      {error && <div className="form-error operations-alert">{error}</div>}
      {success && <div className="success-banner"><strong>Saved</strong><span>{success}</span><button className="text-button" onClick={() => navigate('/loads')}>Open Shipment Control</button></div>}

      <div className="load-intake-layout">
        <aside className="load-intake-index">
          <div className="load-intake-index__title"><span>INTAKE WORKFLOW</span><strong>5 operating sections</strong></div>
          <ol>{intakeSections.map((section, index) => <li key={section.label}><span>{index + 1}</span><div><strong>{section.label}</strong><small>{section.detail}</small></div></li>)}</ol>
          <div className="load-intake-index__help"><Icon name="alert" size={17} /><p>Loaded miles and drive time can be calculated automatically or entered manually.</p></div>
        </aside>

        <main className="load-intake-document">
          <div className="load-intake-document__head"><div><span>NEW OPERATING RECORD</span><strong>Shipment details</strong></div><small>Prepared by {user?.fullName || 'Legacy Hotshot'}</small></div>

          <section className="load-business-source">
            <div className="load-business-source__head">
              <div><span>BUSINESS RELATIONSHIP</span><h3>Who is this load connected to?</h3><p>Select an existing client, vendor, broker, shipper, or receiver—or create a new business here.</p></div>
              <div className="load-business-source__mode"><button className={businessMode === 'existing' ? 'active' : ''} onClick={() => setBusinessMode('existing')}>Existing</button><button className={businessMode === 'new' ? 'active' : ''} onClick={() => setBusinessMode('new')}>New business</button></div>
            </div>
            {businessMode === 'existing' ? (
              <div className="load-business-source__existing">
                <label>Business<select value={selectedBusinessId} onChange={(event) => setSelectedBusinessId(event.target.value)}><option value="">Select a business</option>{businesses.map((business) => <option key={business.id} value={business.id}>{business.company_name} · {business.relationship_types.join(', ')}</option>)}</select></label>
                <button type="button" onClick={() => navigate('/customers')}>Open directory</button>
                {selectedBusiness && <small>{selectedBusiness.company_name} profile information has been prefilled below and can be adjusted for this load.</small>}
              </div>
            ) : (
              <div className="load-business-source__new">
                <label>Business name<input value={newBusiness.companyName} onChange={(event) => setNewBusiness((current) => ({ ...current, companyName: event.target.value }))} /></label>
                <label>Primary contact<input value={newBusiness.primaryContact} onChange={(event) => setNewBusiness((current) => ({ ...current, primaryContact: event.target.value }))} /></label>
                <label>Email<input type="email" value={newBusiness.email} onChange={(event) => setNewBusiness((current) => ({ ...current, email: event.target.value }))} /></label>
                <label>Phone<input value={newBusiness.phone} onChange={(event) => setNewBusiness((current) => ({ ...current, phone: event.target.value }))} /></label>
                <label>Relationship<select value={newBusiness.relationshipTypes[0]} onChange={(event) => setNewBusiness((current) => ({ ...current, relationshipTypes: [event.target.value as BusinessRelationshipInput['relationshipTypes'][number]] }))}><option value="customer">Customer</option><option value="broker">Broker</option><option value="shipper">Shipper</option><option value="receiver">Receiver</option><option value="vendor">Vendor</option><option value="other">Other</option></select></label>
              </div>
            )}
          </section>

          <LoadRequestForm
            initialValues={initialValues}
            submitting={submitting}
            submitLabel="Book Load"
            secondaryLabel="Save for Review"
            onValuesChange={setFormValues}
            onSubmit={handleSubmit}
          />

          <section className="load-route-estimate">
            <div>
              <span>ROUTE CALCULATION</span>
              <h3>Loaded mileage and estimated drive time</h3>
              <p>Use the free route estimate or enter confirmed route figures manually. The selected values are saved with the load.</p>
              <div className="load-business-source__mode">
                <button type="button" className={routeMode === 'automatic' ? 'active' : ''} onClick={() => setRouteMode('automatic')}>Automatic</button>
                <button type="button" className={routeMode === 'manual' ? 'active' : ''} onClick={() => setRouteMode('manual')}>Manual entry</button>
              </div>
            </div>

            {routeMode === 'automatic' ? (
              route ? <dl><div><dt>Loaded miles</dt><dd>{route.loadedMiles.toLocaleString()}</dd></div><div><dt>Drive time</dt><dd>{formatDriveTime(route.durationSeconds)}</dd></div><div><dt>Source</dt><dd>OpenRouteService</dd></div><div><dt>Calculated</dt><dd>{new Date(route.calculatedAt).toLocaleString()}</dd></div></dl>
                : <button type="button" disabled={calculatingRoute} onClick={() => calculateRoute()}>{calculatingRoute ? 'Calculating…' : 'Calculate route'}</button>
            ) : (
              <div className="load-business-source__new">
                <label>Loaded miles<input inputMode="decimal" value={manualMiles} onChange={(event) => setManualMiles(event.target.value)} placeholder="317.5" /></label>
                <label>Drive hours<input inputMode="numeric" value={manualHours} onChange={(event) => setManualHours(event.target.value)} placeholder="5" /></label>
                <label>Drive minutes<input inputMode="numeric" value={manualMinutes} onChange={(event) => setManualMinutes(event.target.value)} placeholder="15" /></label>
                <small>{manualRouteEstimate ? `${manualRouteEstimate.loadedMiles.toLocaleString()} miles · ${formatDriveTime(manualRouteEstimate.durationSeconds)} · Manual source` : 'Enter miles and a valid drive time.'}</small>
              </div>
            )}
            {routeError && <small>{routeError}</small>}
          </section>
        </main>
      </div>
    </div>
  )
}
