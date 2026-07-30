import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { listLoadRequests } from '../lib/operations'
import { createQuote, listQuotes, updateQuoteStatus } from '../lib/quotes'
import type { QuoteRecord } from '../lib/quotes'
import type { LoadRequestRecord } from '../types'

const demoQuotes: QuoteRecord[] = [
  { id: 'quote-1', quote_number: 'LHQ-1003', load_request_id: 'request-1', estimated_mileage: 285, base_rate: 1950, fuel_surcharge: 225, tarping_charge: 0, additional_services: 0, total_amount: 2175, detention_terms: '2 hours free, then $95/hour', payment_terms: 'Net 30', expires_at: new Date(Date.now()+172800000).toISOString(), notes: null, status: 'sent', public_token: 'demo-quote-token', created_at: new Date().toISOString(), load_requests: { request_number: 'LHR-1003', requester_company: 'High Plains Fabrication', requester_name: 'Kara Ellis', requester_email: 'shipping@highplainsfab.com', pickup_city: 'Abilene', pickup_state: 'TX', delivery_city: 'Odessa', delivery_state: 'TX', freight_description: 'Skid-mounted pump equipment' } },
  { id: 'quote-2', quote_number: 'LHQ-1004', load_request_id: 'request-2', estimated_mileage: 342, base_rate: 2350, fuel_surcharge: 290, tarping_charge: 175, additional_services: 85, total_amount: 2900, detention_terms: '2 hours free, then $95/hour', payment_terms: 'Net 30', expires_at: new Date(Date.now()+259200000).toISOString(), notes: 'Requires tarping and edge protection.', status: 'draft', public_token: 'demo-quote-token-2', created_at: new Date(Date.now()-3600000).toISOString(), load_requests: { request_number: 'LHR-1004', requester_company: 'Red River Machinery', requester_name: 'Angela Price', requester_email: 'angela@redrivermachinery.com', pickup_city: 'Wichita Falls', pickup_state: 'TX', delivery_city: 'Lubbock', delivery_state: 'TX', freight_description: 'Compact excavator attachment' } },
]

export function QuotesPage() {
  const { user } = useAuth()
  const [quotes, setQuotes] = useState<QuoteRecord[]>([])
  const [requests, setRequests] = useState<LoadRequestRecord[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showingSampleData, setShowingSampleData] = useState(false)
  const [values, setValues] = useState({ loadRequestId: '', estimatedMileage: '', baseRate: '', fuelSurcharge: '', tarpingCharge: '', additionalServices: '', detentionTerms: '2 hours free, then $95/hour', paymentTerms: 'Net 30', expiresAt: '', notes: '' })

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!user?.companyId || user.demo) {
          setQuotes(demoQuotes)
          setRequests([])
          setShowingSampleData(true)
        } else {
          const [quoteRows, requestRows] = await Promise.all([listQuotes(user.companyId), listLoadRequests(user.companyId)])
          setQuotes(quoteRows.length ? quoteRows : demoQuotes)
          setRequests(requestRows.filter((request) => !['converted', 'cancelled', 'declined'].includes(request.status)))
          setShowingSampleData(quoteRows.length === 0)
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load quotes.')
      }
    }
    loadData()
  }, [user])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return quotes.filter((quote) => !query || [quote.quote_number, quote.load_requests?.request_number, quote.load_requests?.requester_company, quote.load_requests?.requester_name, quote.load_requests?.pickup_city, quote.load_requests?.delivery_city].some((value) => value?.toLowerCase().includes(query)))
  }, [quotes, search])

  const total = Number(values.baseRate || 0) + Number(values.fuelSurcharge || 0) + Number(values.tarpingCharge || 0) + Number(values.additionalServices || 0)

  const saveQuote = async () => {
    if (!values.loadRequestId || !user) return
    setSaving(true)
    setError('')
    try {
      const request = requests.find((item) => item.id === values.loadRequestId)
      const created = !user.companyId || user.demo
        ? { ...demoQuotes[0], id: `demo-${Date.now()}`, quote_number: `LHQ-${Date.now().toString().slice(-4)}`, total_amount: total, base_rate: Number(values.baseRate || 0), fuel_surcharge: Number(values.fuelSurcharge || 0), tarping_charge: Number(values.tarpingCharge || 0), additional_services: Number(values.additionalServices || 0), status: 'draft', load_requests: request ? { request_number: request.request_number, requester_company: request.requester_company, requester_name: request.requester_name, requester_email: request.requester_email, pickup_city: request.pickup_city, pickup_state: request.pickup_state, delivery_city: request.delivery_city, delivery_state: request.delivery_state, freight_description: request.freight_description } : null } as QuoteRecord
        : await createQuote(user.companyId, user.id, values)
      setQuotes((current) => [created, ...current])
      setShowingSampleData(false)
      setShowForm(false)
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

  return (
    <div className="operations-page">
      <div className="page-command-row"><div><span className="eyebrow">PRICING CONTROL</span><h2>Quotes</h2><p>Price each shipment clearly and keep approval status connected to the original request.</p></div><button className="primary-button" onClick={() => setShowForm(true)}><Icon name="plus" size={17} /> Create Quote</button></div>
      {error && <div className="form-error operations-alert">{error}</div>}
      {showingSampleData && <div className="sample-data-banner"><Icon name="alert" size={16} /><span><strong>Sample Data — Preview Only</strong> No real quotes exist yet. Status changes to these examples remain local.</span></div>}
      <section className="panel operations-toolbar"><label className="operations-search"><Icon name="search" size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search quote, request, customer, or route" /></label><div className="operations-summary"><strong>{filtered.length}</strong><span>quotes</span></div></section>
      <section className="quote-grid">{filtered.map((quote) => <article className="panel quote-card" key={quote.id}>
        <div className="quote-card__header"><div><span className="request-number">{quote.quote_number}</span><h3>{quote.load_requests?.requester_company || quote.load_requests?.requester_name || 'Customer quote'}</h3></div><select className={`quote-status quote-status--${quote.status}`} value={quote.status} onChange={(e) => changeStatus(quote, e.target.value as QuoteRecord['status'])}><option value="draft">Draft</option><option value="sent">Sent</option><option value="approved">Approved</option><option value="declined">Declined</option><option value="expired">Expired</option><option value="converted">Converted</option></select></div>
        <div className="quote-route"><strong>{quote.load_requests?.pickup_city}, {quote.load_requests?.pickup_state}</strong><Icon name="arrow" size={16} /><strong>{quote.load_requests?.delivery_city}, {quote.load_requests?.delivery_state}</strong></div>
        <p>{quote.load_requests?.freight_description}</p>
        <dl><div><dt>Base</dt><dd>${quote.base_rate.toLocaleString()}</dd></div><div><dt>Fuel</dt><dd>${quote.fuel_surcharge.toLocaleString()}</dd></div><div><dt>Additional</dt><dd>${(quote.tarping_charge + quote.additional_services).toLocaleString()}</dd></div><div className="quote-total"><dt>Total</dt><dd>${quote.total_amount.toLocaleString()}</dd></div></dl>
        <div className="quote-card__footer"><span>{quote.payment_terms} · {quote.estimated_mileage ? `${quote.estimated_mileage} mi` : 'Mileage pending'}</span><button className="text-button">Open quote <Icon name="arrow" size={15} /></button></div>
      </article>)}</section>

      {showForm && <div className="modal-scrim" onMouseDown={() => setShowForm(false)}><section className="modal-card modal-card--wide" onMouseDown={(e) => e.stopPropagation()}><div className="modal-card__header"><div><span className="eyebrow">NEW QUOTE</span><h2>Price a Load Request</h2></div><button className="icon-button" onClick={() => setShowForm(false)}>×</button></div><div className="form-grid form-grid--three">
        <label className="form-grid__full">Load request<select value={values.loadRequestId} onChange={(e) => setValues({ ...values, loadRequestId: e.target.value })}><option value="">Select a request</option>{requests.map((request) => <option key={request.id} value={request.id}>{request.request_number} · {request.requester_company || request.requester_name} · {request.pickup_city} to {request.delivery_city}</option>)}</select></label>
        <label>Estimated mileage<input inputMode="decimal" value={values.estimatedMileage} onChange={(e) => setValues({ ...values, estimatedMileage: e.target.value })} /></label>
        <label>Base rate<input inputMode="decimal" value={values.baseRate} onChange={(e) => setValues({ ...values, baseRate: e.target.value })} /></label>
        <label>Fuel surcharge<input inputMode="decimal" value={values.fuelSurcharge} onChange={(e) => setValues({ ...values, fuelSurcharge: e.target.value })} /></label>
        <label>Tarping<input inputMode="decimal" value={values.tarpingCharge} onChange={(e) => setValues({ ...values, tarpingCharge: e.target.value })} /></label>
        <label>Additional services<input inputMode="decimal" value={values.additionalServices} onChange={(e) => setValues({ ...values, additionalServices: e.target.value })} /></label>
        <label>Expires<input type="date" value={values.expiresAt} onChange={(e) => setValues({ ...values, expiresAt: e.target.value })} /></label>
        <label>Payment terms<select value={values.paymentTerms} onChange={(e) => setValues({ ...values, paymentTerms: e.target.value })}><option>Due on receipt</option><option>Net 15</option><option>Net 30</option><option>Net 45</option></select></label>
        <label className="form-grid__wide">Detention terms<input value={values.detentionTerms} onChange={(e) => setValues({ ...values, detentionTerms: e.target.value })} /></label>
        <label className="form-grid__full">Notes<textarea value={values.notes} onChange={(e) => setValues({ ...values, notes: e.target.value })} /></label>
      </div><div className="quote-total-preview"><span>Quote total</span><strong>${total.toLocaleString()}</strong></div><div className="modal-card__actions"><button className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button" disabled={saving || !values.loadRequestId} onClick={saveQuote}>{saving ? 'Creating...' : 'Create Quote'}</button></div></section></div>}
    </div>
  )
}
