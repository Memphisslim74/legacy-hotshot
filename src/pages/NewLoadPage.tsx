import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { LoadRequestForm } from '../components/LoadRequestForm'
import { Icon } from '../components/Icon'
import { createBookedLoad, submitPublicLoadRequest } from '../lib/operations'
import type { LoadRequestInput } from '../types'

const intakeSections = [
  { label: 'Customer', detail: 'Requester and business contact' },
  { label: 'Pickup', detail: 'Origin, appointment, instructions' },
  { label: 'Delivery', detail: 'Destination and receiving details' },
  { label: 'Freight', detail: 'Equipment, weight, dimensions' },
  { label: 'Review', detail: 'Book now or save for review' },
]

export function NewLoadPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
      } else if (user.demo) setSuccess('Demo load LH-1030 was booked successfully.')
      else {
        if (!user.companyId) throw new Error('Complete company setup before creating a booked load.')
        const load = await createBookedLoad(user.companyId, user.id, values)
        setSuccess(`${load.load_number} was booked successfully.`)
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
          <p>Enter the operating details once, then book the load immediately or hold it in the request queue.</p>
        </div>
        <div className="load-intake-header__note"><Icon name="check" size={17} /><span>Required fields are validated before the shipment can be booked.</span></div>
      </header>

      {error && <div className="form-error operations-alert">{error}</div>}
      {success && <div className="success-banner"><strong>Saved</strong><span>{success}</span><button className="text-button" onClick={() => navigate('/loads')}>Open Shipment Control</button></div>}

      <div className="load-intake-layout">
        <aside className="load-intake-index">
          <div className="load-intake-index__title"><span>INTAKE WORKFLOW</span><strong>5 operating sections</strong></div>
          <ol>{intakeSections.map((section, index) => <li key={section.label}><span>{index + 1}</span><div><strong>{section.label}</strong><small>{section.detail}</small></div></li>)}</ol>
          <div className="load-intake-index__help"><Icon name="alert" size={17} /><p>Saving as a request keeps the load out of dispatch until it is reviewed and booked.</p></div>
        </aside>

        <main className="load-intake-document">
          <div className="load-intake-document__head"><div><span>NEW OPERATING RECORD</span><strong>Shipment details</strong></div><small>Prepared by {user?.fullName || 'Legacy Hotshot'}</small></div>
          <LoadRequestForm
            initialValues={{ requesterName: user?.fullName || 'Jared Guinn', requesterEmail: user?.email || '' }}
            submitting={submitting}
            submitLabel="Book Load"
            secondaryLabel="Save for Review"
            onSubmit={handleSubmit}
          />
        </main>
      </div>
    </div>
  )
}
