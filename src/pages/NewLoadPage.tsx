import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { LoadRequestForm } from '../components/LoadRequestForm'
import { createBookedLoad, submitPublicLoadRequest } from '../lib/operations'
import type { LoadRequestInput } from '../types'

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
        if (user.demo) {
          setSuccess('Demo load request LHR-1005 was created. It now appears under Load Requests.')
        } else {
          const request = await submitPublicLoadRequest(values)
          setSuccess(`${request.request_number} was created and is ready for review.`)
        }
      } else {
        if (user.demo) {
          setSuccess('Demo load LH-1030 was booked successfully.')
        } else {
          if (!user.companyId) throw new Error('Complete company setup before creating a booked load.')
          const load = await createBookedLoad(user.companyId, user.id, values)
          setSuccess(`${load.load_number} was booked successfully.`)
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create the load.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="operations-page">
      <div className="page-command-row page-command-row--form">
        <div><span className="eyebrow">LOAD INTAKE</span><h2>Create a Load</h2><p>Enter the complete shipment once, then save it for review or book it immediately.</p></div>
        <button className="secondary-button" onClick={() => navigate('/loads')}>Back to Loads</button>
      </div>
      {error && <div className="form-error operations-alert">{error}</div>}
      {success && <div className="success-banner"><strong>Saved</strong><span>{success}</span><button className="text-button" onClick={() => navigate('/loads')}>Open Loads</button></div>}
      <section className="panel load-form-panel">
        <LoadRequestForm
          initialValues={{ requesterName: user?.fullName || 'Jared Guinn', requesterEmail: user?.email || '' }}
          submitting={submitting}
          submitLabel="Create Booked Load"
          secondaryLabel="Save as Load Request"
          onSubmit={handleSubmit}
        />
      </section>
    </div>
  )
}
