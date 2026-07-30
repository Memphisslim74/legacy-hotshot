import { useState } from 'react'
import { BrandMark } from '../components/BrandMark'
import { LoadRequestForm } from '../components/LoadRequestForm'
import { submitPublicLoadRequest } from '../lib/operations'
import type { LoadRequestInput } from '../types'

export function PublicLoadRequestPage() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState<{ number: string; token: string } | null>(null)

  const handleSubmit = async (values: LoadRequestInput) => {
    setSubmitting(true)
    setError('')
    try {
      const result = await submitPublicLoadRequest(values)
      setConfirmation({ number: result.request_number, token: result.public_token })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to submit the request. Please contact Legacy Hotshot directly.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="public-request-page">
      <header className="public-request-header"><BrandMark inverse /><div><strong>Need help?</strong><span>Legacy Hotshot will review every request before confirming availability or price.</span></div></header>
      <main className="public-request-main">
        {confirmation ? (
          <section className="public-confirmation panel">
            <div className="confirmation-check">✓</div>
            <span className="eyebrow">REQUEST RECEIVED</span>
            <h1>Thank you. Legacy has the details.</h1>
            <p>Your request number is <strong>{confirmation.number}</strong>. Jared Guinn will review the shipment information and contact you about availability, missing details, and pricing.</p>
            <div className="confirmation-next"><strong>What happens next</strong><ol><li>Legacy reviews the pickup, delivery, and freight requirements.</li><li>You receive a Legacy Load Checklist highlighting any missing information.</li><li>Jared sends a quote or contacts you with questions.</li></ol></div>
            <button className="primary-button" onClick={() => setConfirmation(null)}>Submit Another Request</button>
          </section>
        ) : (
          <>
            <section className="public-request-intro"><span className="eyebrow">LEGACY LOAD REQUEST</span><h1>Tell us what needs to move.</h1><p>Provide as much information as possible. Submitting this form does not automatically book the load or guarantee a price.</p></section>
            {error && <div className="form-error operations-alert">{error}</div>}
            <section className="panel public-request-form-card"><LoadRequestForm publicMode submitting={submitting} submitLabel="Submit Load Request" onSubmit={(values) => handleSubmit(values)} /></section>
          </>
        )}
      </main>
      <footer className="public-request-footer">Legacy Hotshot, LLC · USDOT 4514127 · Secure request intake</footer>
    </div>
  )
}
