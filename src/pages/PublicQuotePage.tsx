import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

interface PublicQuote {
  quoteNumber: string
  customerCompany: string | null
  customerName: string
  pickupCity: string
  pickupState: string
  deliveryCity: string
  deliveryState: string
  freightDescription: string
  estimatedMileage: number | null
  baseRate: number
  fuelSurcharge: number
  tarpingCharge: number
  additionalServices: number
  totalAmount: number
  detentionTerms: string | null
  paymentTerms: string
  expiresAt: string | null
  notes: string | null
  status: string
  acceptedByName: string | null
  acceptedAt: string | null
  acceptedQuoteAmount: number | null
  acceptedQuoteVersion: number | null
  quoteVersion: number
}

const money = (value: number | null) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0))

export function PublicQuotePage() {
  const { token } = useParams()
  const [quote, setQuote] = useState<PublicQuote | null>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')

  const loadQuote = async () => {
    try {
      const response = await fetch(`/api/public/quotes/${encodeURIComponent(token || '')}`, { headers: { Accept: 'application/json' } })
      const payload = await response.json() as PublicQuote & { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Unable to open this quote.')
      setQuote(payload)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to open this quote.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadQuote() }, [token])

  const expired = useMemo(() => Boolean(quote?.expiresAt && new Date(quote.expiresAt).getTime() < Date.now()), [quote])
  const accepted = Boolean(quote?.acceptedAt || quote?.status === 'approved')

  const acceptQuote = async () => {
    if (!name.trim()) return
    setAccepting(true)
    setError('')
    try {
      const response = await fetch(`/api/public/quotes/${encodeURIComponent(token || '')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ acceptedByName: name.trim() }),
      })
      const payload = await response.json() as PublicQuote & { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Unable to accept this quote.')
      setQuote(payload)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to accept this quote.')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) return <main className="public-quote-page"><div className="public-quote-loading">Loading your quote…</div></main>
  if (!quote) return <main className="public-quote-page"><section className="public-quote-error"><strong>Quote unavailable</strong><p>{error}</p></section></main>

  if (accepted) return (
    <main className="public-quote-page public-quote-page--thank-you">
      <section className="public-quote-thank-you">
        <div className="public-quote-mark">✓</div>
        <span>QUOTE ACCEPTED</span>
        <h1>Thank you. Your approval has been recorded.</h1>
        <p>Legacy Hotshot received your approval and will follow up with scheduling and next-step details.</p>
        <div className="public-quote-confirmation-grid">
          <div><small>Quote</small><strong>{quote.quoteNumber}</strong></div>
          <div><small>Approved amount</small><strong>{money(quote.acceptedQuoteAmount ?? quote.totalAmount)}</strong></div>
          <div><small>Accepted by</small><strong>{quote.acceptedByName}</strong></div>
          <div><small>Accepted</small><strong>{quote.acceptedAt ? new Date(quote.acceptedAt).toLocaleString() : 'Recorded'}</strong></div>
          <div><small>Route</small><strong>{quote.pickupCity}, {quote.pickupState} → {quote.deliveryCity}, {quote.deliveryState}</strong></div>
          <div><small>Quote version</small><strong>Version {quote.acceptedQuoteVersion || quote.quoteVersion}</strong></div>
        </div>
        <p className="public-quote-contact">Questions or changes? Reply to your quote email and the Legacy Hotshot team will assist you.</p>
      </section>
    </main>
  )

  return (
    <main className="public-quote-page">
      <section className="public-quote-shell">
        <header className="public-quote-header"><div><span>LEGACY HOTSHOT</span><h1>Transportation Quote</h1></div><div><small>QUOTE</small><strong>{quote.quoteNumber}</strong></div></header>
        <section className="public-quote-customer"><p>Prepared for</p><h2>{quote.customerCompany || quote.customerName}</h2><span>{quote.customerName}</span></section>
        <section className="public-quote-route"><div><small>PICKUP</small><strong>{quote.pickupCity}, {quote.pickupState}</strong></div><b>→</b><div><small>DELIVERY</small><strong>{quote.deliveryCity}, {quote.deliveryState}</strong></div></section>
        <section className="public-quote-freight"><small>FREIGHT</small><strong>{quote.freightDescription}</strong>{quote.estimatedMileage && <span>{quote.estimatedMileage.toLocaleString()} estimated miles</span>}</section>
        <section className="public-quote-pricing">
          <div><span>Base transportation</span><strong>{money(quote.baseRate)}</strong></div>
          {quote.fuelSurcharge > 0 && <div><span>Fuel surcharge</span><strong>{money(quote.fuelSurcharge)}</strong></div>}
          {quote.tarpingCharge > 0 && <div><span>Tarping</span><strong>{money(quote.tarpingCharge)}</strong></div>}
          {quote.additionalServices > 0 && <div><span>Additional services</span><strong>{money(quote.additionalServices)}</strong></div>}
          <div className="public-quote-total"><span>Quote total</span><strong>{money(quote.totalAmount)}</strong></div>
        </section>
        <section className="public-quote-terms"><div><small>Payment terms</small><strong>{quote.paymentTerms}</strong></div><div><small>Detention</small><strong>{quote.detentionTerms || 'Standard terms apply'}</strong></div><div><small>Valid through</small><strong>{quote.expiresAt ? new Date(quote.expiresAt).toLocaleDateString() : 'No expiration date'}</strong></div></section>
        {quote.notes && <section className="public-quote-notes"><small>NOTES</small><p>{quote.notes}</p></section>}
        <section id="accept" className="public-quote-accept">
          <span>APPROVE THIS QUOTE</span><h2>Type your name to confirm approval</h2><p>By selecting Accept Quote, you confirm approval of quote {quote.quoteNumber} for {money(quote.totalAmount)}.</p>
          {expired ? <div className="public-quote-expired">This quote has expired. Please contact Legacy Hotshot for updated pricing.</div> : <><label>Full name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Type your full name" autoComplete="name" /></label>{error && <div className="public-quote-form-error">{error}</div>}<button disabled={accepting || name.trim().length < 2} onClick={acceptQuote}>{accepting ? 'Recording approval…' : 'Accept Quote'}</button></>}
          <small>Your name, approval time, quote amount, and quote version will be recorded.</small>
        </section>
      </section>
    </main>
  )
}
