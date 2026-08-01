import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { listLoadRequests } from '../lib/operations'
import { createQuote, listQuotes, sendQuoteEmail, updateQuoteStatus } from '../lib/quotes'
import type { QuoteRecord } from '../lib/quotes'
import type { LoadRequestRecord } from '../types'

const demoQuotes: QuoteRecord[] = [
  { id: 'quote-1', quote_number: 'LHQ-1003', load_request_id: 'request-1', estimated_mileage: 285, base_rate: 1950, fuel_surcharge: 225, tarping_charge: 0, additional_services: 0, total_amount: 2175, detention_terms: '2 hours free, then $95/hour', payment_terms: 'Net 30', expires_at: new Date(Date.now() + 172800000).toISOString(), notes: null, status: 'sent', public_token: 'demo-quote-token', sent_at: new Date().toISOString(), quote_version: 1, created_at: new Date().toISOString(), load_requests: { request_number: 'LHR-1003', requester_company: 'High Plains Fabrication', requester_name: 'Kara Ellis', requester_email: 'shipping@highplainsfab.com', pickup_city: 'Abilene', pickup_state: 'TX', delivery_city: 'Odessa', delivery_state: 'TX', freight_description: 'Skid-mounted pump equipment' } },
]

const quoteStatuses: QuoteRecord['status'][] = ['draft', 'sent', 'approved', 'declined', 'expired', 'converted']
const statusLabel = (value: QuoteRecord['status']) => value.charAt(0).toUpperCase() + value.slice(1)

export function QuotesPage() {
  const { user } = useAuth()
  const [quotes, setQuotes] = useState<QuoteRecord[]>([])
  const [requests, setRequests] = useState<LoadRequestRecord[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | QuoteRecord['status']>('all')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sendingId, setSendingId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showingSampleData, setShowingSampleData] = useState(false)
  const [values, setValues] = useState({ loadRequestId: '', estimatedMileage: '', baseRate: '', fuelSurcharge: '', tarpingCharge: '', additionalServices: '', detentionTerms: '2 hours free, then $95/hour', paymentTerms: 'Net 30', expiresAt: '', notes: '' })

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!user?.companyId || user.demo) {
          setQuotes(demoQuotes)
          setRequests([])
          setShowingSampleData(true)
          return
        }
        const [quoteRows, requestRows] = await Promise.all([listQuotes(user.companyId), listLoadRequests(user.companyId)])
        setQuotes(quoteRows.length ? quoteRows : demoQuotes)
        setRequests(requestRows.filter((request) => !['converted', 'cancelled', 'declined'].includes(request.status)))
        setShowingSampleData(quoteRows.length === 0)
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load quotes.')
      }
    }
    loadData()
  }, [user])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return quotes.filter((quote) => {
      const matchesSearch = !query || [quote.quote_number, quote.load_requests?.request_number, quote.load_requests?.requester_company, quote.load_requests?.requester_name, quote.load_requests?.pickup_city, quote.load_requests?.delivery_city].some((value) => value?.toLowerCase().includes(query))
      return matchesSearch && (statusFilter === 'all' || quote.status === statusFilter)
    })
  }, [quotes, search, statusFilter])

  const metrics = useMemo(() => ({
    open: quotes.filter((quote) => ['draft', 'sent'].includes(quote.status)).length,
    approved: quotes.filter((quote) => quote.status === 'approved').length,
    converted: quotes.filter((quote) => quote.status === 'converted').length,
    pipeline: quotes.filter((quote) => !['declined', 'expired'].includes(quote.status)).reduce((sum, quote) => sum + quote.total_amount, 0),
  }), [quotes])

  const total = Number(values.baseRate || 0) + Number(values.fuelSurcharge || 0) + Number(values.tarpingCharge || 0) + Number(values.additionalServices || 0)

  const saveQuote = async () => {
    if (!values.loadRequestId || !user) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const request = requests.find((item) => item.id === values.loadRequestId)
      const created = !user.companyId || user.demo
        ? { ...demoQuotes[0], id: `demo-${Date.now()}`, quote_number: `LHQ-${Date.now().toString().slice(-4)}`, total_amount: total, base_rate: Number(values.baseRate || 0), fuel_surcharge: Number(values.fuelSurcharge || 0), tarping_charge: Number(values.tarpingCharge || 0), additional_services: Number(values.additionalServices || 0), status: 'draft', sent_at: null, load_requests: request ? { request_number: request.request_number, requester_company: request.requester_company, requester_name: request.requester_name, requester_email: request.requester_email, pickup_city: request.pickup_city, pickup_state: request.pickup_state, delivery_city: request.delivery_city, delivery_state: request.delivery_state, freight_description: request.freight_description } : null } as QuoteRecord
        : await createQuote(user.companyId, user.id, values)
      setQuotes((current) => [created, ...current.filter((quote) => !quote.id.startsWith('quote-'))])
      setShowingSampleData(false)
      setShowForm(false)
      setMessage(`${created.quote_number} created and ready to send.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create quote.')
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (quote: QuoteRecord, status: QuoteRecord['status']) => {
    const previous = quote.status
    setQuotes((current) => current.map((item) => item.id === quote.id ? { ...item, status } : item))
    if (showingSampleData || quote.id.startsWith('quote-')) return
    try {
      if (!user?.demo) await updateQuoteStatus(quote.id, status)
    } catch (caught) {
      setQuotes((current) => current.map((item) => item.id === quote.id ? { ...item, status: previous } : item))
      setError(caught instanceof Error ? caught.message : 'Unable to update quote.')
    }
  }

  const sendQuote = async (quote: QuoteRecord) => {
    setSendingId(quote.id)
    setError('')
    setMessage('')
    try {
      if (showingSampleData || quote.id.startsWith('quote-')) {
        setMessage('Sample quote email preview only. Create a real quote before sending.')
        return
      }
      const result = await sendQuoteEmail(quote.id)
      const sentAt = new Date().toISOString()
      setQuotes((current) => current.map((item) => item.id === quote.id ? { ...item, status: 'sent', sent_at: sentAt } : item))
      setMessage(`${quote.quote_number} was sent to ${result.recipient}.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to send quote.')
    } finally {
      setSendingId('')
    }
  }

  const previewQuote = (quote: QuoteRecord) => window.open(`/quote/${encodeURIComponent(quote.public_token)}`, '_blank', 'noopener,noreferrer')

  return (
    <div className="pricing-queue-page">
      <header className="record-page-head">
        <div><span>COMMERCIAL OPERATIONS</span><h2>Pricing Queue</h2><p>Prepare, email, approve, and convert shipment pricing from one register.</p></div>
        <button className="record-primary-action" onClick={() => setShowForm(true)}><Icon name="plus" size={16} /> New Quote</button>
      </header>

      {error && <div className="record-alert record-alert--error">{error}</div>}
      {message && <div className="record-alert record-alert--success">{message}</div>}
      {showingSampleData && <div className="sample-data-banner"><Icon name="alert" size={16} /><span><strong>Sample Data — Preview Only</strong> No real quotes exist yet. Sample emails are not sent.</span></div>}

      <section className="pricing-metric-strip">
        <div><span>Open pricing</span><strong>{metrics.open}</strong></div><div><span>Approved</span><strong>{metrics.approved}</strong></div><div><span>Converted</span><strong>{metrics.converted}</strong></div><div><span>Active pipeline</span><strong>${metrics.pipeline.toLocaleString()}</strong></div>
      </section>

      <section className="record-filterbar">
        <label><Icon name="search" size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search quote, request, customer, or route" /></label>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">All statuses</option>{quoteStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select>
        <span>{filtered.length} pricing records</span>
      </section>

      <section className="pricing-register pricing-register--actions">
        <div className="pricing-register__head"><span>Quote</span><span>Customer & freight</span><span>Route</span><span>Commercials</span><span>Status</span><span>Customer action</span></div>
        {filtered.map((quote) => (
          <article key={quote.id}>
            <div><strong>{quote.quote_number}</strong><small>{quote.load_requests?.request_number || 'Direct quote'} · v{quote.quote_version || 1}</small></div>
            <div><strong>{quote.load_requests?.requester_company || quote.load_requests?.requester_name || 'Customer quote'}</strong><small>{quote.load_requests?.requester_email}</small></div>
            <div className="pricing-route"><strong>{quote.load_requests?.pickup_city}, {quote.load_requests?.pickup_state}</strong><Icon name="arrow" size={13} /><strong>{quote.load_requests?.delivery_city}, {quote.load_requests?.delivery_state}</strong><small>{quote.estimated_mileage ? `${quote.estimated_mileage} estimated miles` : 'Mileage pending'}</small></div>
            <div className="pricing-commercials"><strong>${quote.total_amount.toLocaleString()}</strong><small>{quote.expires_at ? `Expires ${new Date(quote.expires_at).toLocaleDateString()}` : quote.payment_terms}</small></div>
            <div><select className={`quote-status quote-status--${quote.status}`} value={quote.status} onChange={(event) => changeStatus(quote, event.target.value as QuoteRecord['status'])}>{quoteStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select>{quote.accepted_by_name && <small>Accepted by {quote.accepted_by_name}</small>}</div>
            <div className="quote-customer-actions"><button onClick={() => previewQuote(quote)}>View</button><button className="quote-send-button" disabled={sendingId === quote.id || quote.status === 'approved' || quote.status === 'converted'} onClick={() => sendQuote(quote)}>{sendingId === quote.id ? 'Sending…' : quote.sent_at ? 'Resend Quote' : 'Send Quote'}</button>{quote.sent_at && <small>Sent {new Date(quote.sent_at).toLocaleString()}</small>}</div>
          </article>
        ))}
        {!filtered.length && <div className="record-empty">No pricing records match the current filters.</div>}
      </section>

      {showForm && <div className="modal-scrim" onMouseDown={() => setShowForm(false)}><section className="modal-card modal-card--wide" onMouseDown={(event) => event.stopPropagation()}><div className="modal-card__header"><div><span className="eyebrow">NEW QUOTE</span><h2>Price a Load Request</h2></div><button className="icon-button" onClick={() => setShowForm(false)}>×</button></div><div className="form-grid form-grid--three">
        <label className="form-grid__full">Load request<select value={values.loadRequestId} onChange={(event) => setValues({ ...values, loadRequestId: event.target.value })}><option value="">Select a request</option>{requests.map((request) => <option key={request.id} value={request.id}>{request.request_number} · {request.requester_company || request.requester_name} · {request.pickup_city} to {request.delivery_city}</option>)}</select></label>
        <label>Estimated mileage<input inputMode="decimal" value={values.estimatedMileage} onChange={(event) => setValues({ ...values, estimatedMileage: event.target.value })} /></label><label>Base rate<input inputMode="decimal" value={values.baseRate} onChange={(event) => setValues({ ...values, baseRate: event.target.value })} /></label><label>Fuel surcharge<input inputMode="decimal" value={values.fuelSurcharge} onChange={(event) => setValues({ ...values, fuelSurcharge: event.target.value })} /></label><label>Tarping<input inputMode="decimal" value={values.tarpingCharge} onChange={(event) => setValues({ ...values, tarpingCharge: event.target.value })} /></label><label>Additional services<input inputMode="decimal" value={values.additionalServices} onChange={(event) => setValues({ ...values, additionalServices: event.target.value })} /></label><label>Expires<input type="date" value={values.expiresAt} onChange={(event) => setValues({ ...values, expiresAt: event.target.value })} /></label><label>Payment terms<select value={values.paymentTerms} onChange={(event) => setValues({ ...values, paymentTerms: event.target.value })}><option>Due on receipt</option><option>Net 15</option><option>Net 30</option><option>Net 45</option></select></label><label className="form-grid__wide">Detention terms<input value={values.detentionTerms} onChange={(event) => setValues({ ...values, detentionTerms: event.target.value })} /></label><label className="form-grid__full">Notes<textarea value={values.notes} onChange={(event) => setValues({ ...values, notes: event.target.value })} /></label>
      </div><div className="quote-total-preview"><span>Quote total</span><strong>${total.toLocaleString()}</strong></div><div className="modal-card__actions"><button className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button" disabled={saving || !values.loadRequestId} onClick={saveQuote}>{saving ? 'Creating…' : 'Create Quote'}</button></div></section></div>}
    </div>
  )
}
