import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { createCustomer, listCustomers } from '../lib/operations'
import type { Customer } from '../types'

const demoCustomers: Customer[] = [
  { id: 'demo-customer-1', company_name: 'Titan Industrial', primary_contact: 'Marcus Reed', email: 'dispatch@titanindustrial.com', phone: '(817) 555-0138', payment_terms: 'Net 30', communication_preference: 'email', notes: 'Frequent machinery and fabrication loads.', created_at: new Date().toISOString() },
  { id: 'demo-customer-2', company_name: 'High Plains Fabrication', primary_contact: 'Kara Ellis', email: 'shipping@highplainsfab.com', phone: '(432) 555-0172', payment_terms: 'Net 15', communication_preference: 'email_sms', notes: null, created_at: new Date().toISOString() },
  { id: 'demo-customer-3', company_name: 'Frontier Site Services', primary_contact: 'Daniel Ortiz', email: 'operations@frontiersite.com', phone: '(940) 555-0184', payment_terms: 'Due on receipt', communication_preference: 'email', notes: null, created_at: new Date().toISOString() },
]

export function CustomersPage() {
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState({ companyName: '', primaryContact: '', email: '', phone: '', paymentTerms: 'Net 30', notes: '' })

  useEffect(() => {
    const load = async () => {
      try {
        if (!user?.companyId || user.demo) setCustomers(demoCustomers)
        else setCustomers(await listCustomers(user.companyId))
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load customers.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return customers
    return customers.filter((customer) => [customer.company_name, customer.primary_contact, customer.email, customer.phone].some((value) => value?.toLowerCase().includes(query)))
  }, [customers, search])

  const saveCustomer = async () => {
    if (!values.companyName.trim() || !user) return
    setSaving(true)
    setError('')
    try {
      const created = !user.companyId || user.demo
        ? { id: `demo-${Date.now()}`, company_name: values.companyName, primary_contact: values.primaryContact || null, email: values.email || null, phone: values.phone || null, payment_terms: values.paymentTerms, communication_preference: 'email', notes: values.notes || null, created_at: new Date().toISOString() } as Customer
        : await createCustomer(user.companyId, user.id, values)
      setCustomers((current) => [created, ...current])
      setValues({ companyName: '', primaryContact: '', email: '', phone: '', paymentTerms: 'Net 30', notes: '' })
      setShowForm(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create customer.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="operations-page">
      <div className="page-command-row">
        <div><span className="eyebrow">CUSTOMER DIRECTORY</span><h2>Customers</h2><p>Keep contacts, billing terms, and load history organized in one place.</p></div>
        <button className="primary-button" onClick={() => setShowForm(true)}><Icon name="plus" size={17} /> Add Customer</button>
      </div>

      {error && <div className="form-error operations-alert">{error}</div>}

      <section className="panel operations-toolbar">
        <label className="operations-search"><Icon name="search" size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers, contacts, email, or phone" /></label>
        <div className="operations-summary"><strong>{filtered.length}</strong><span>customer{filtered.length === 1 ? '' : 's'}</span></div>
      </section>

      <section className="customer-grid">
        {loading ? <div className="panel empty-state">Loading customers...</div> : filtered.map((customer) => (
          <article className="panel customer-card" key={customer.id}>
            <div className="customer-card__header"><div className="customer-avatar">{customer.company_name.charAt(0)}</div><div><h3>{customer.company_name}</h3><span>{customer.primary_contact || 'No primary contact'}</span></div></div>
            <dl>
              <div><dt>Email</dt><dd>{customer.email || 'Not provided'}</dd></div>
              <div><dt>Phone</dt><dd>{customer.phone || 'Not provided'}</dd></div>
              <div><dt>Terms</dt><dd>{customer.payment_terms}</dd></div>
              <div><dt>Updates</dt><dd>{customer.communication_preference.replace('_', ' + ')}</dd></div>
            </dl>
            {customer.notes && <p>{customer.notes}</p>}
            <button className="text-button">Open customer <Icon name="arrow" size={15} /></button>
          </article>
        ))}
      </section>

      {showForm && (
        <div className="modal-scrim" role="presentation" onMouseDown={() => setShowForm(false)}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-label="Add customer" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-card__header"><div><span className="eyebrow">NEW RELATIONSHIP</span><h2>Add Customer</h2></div><button className="icon-button" onClick={() => setShowForm(false)}>×</button></div>
            <div className="form-grid">
              <label className="form-grid__full">Company name<input required value={values.companyName} onChange={(e) => setValues({ ...values, companyName: e.target.value })} /></label>
              <label>Primary contact<input value={values.primaryContact} onChange={(e) => setValues({ ...values, primaryContact: e.target.value })} /></label>
              <label>Email<input type="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} /></label>
              <label>Phone<input value={values.phone} onChange={(e) => setValues({ ...values, phone: e.target.value })} /></label>
              <label>Payment terms<select value={values.paymentTerms} onChange={(e) => setValues({ ...values, paymentTerms: e.target.value })}><option>Due on receipt</option><option>Net 15</option><option>Net 30</option><option>Net 45</option></select></label>
              <label className="form-grid__full">Internal notes<textarea value={values.notes} onChange={(e) => setValues({ ...values, notes: e.target.value })} /></label>
            </div>
            <div className="modal-card__actions"><button className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button" disabled={saving || !values.companyName.trim()} onClick={saveCustomer}>{saving ? 'Saving...' : 'Create Customer'}</button></div>
          </section>
        </div>
      )}
    </div>
  )
}
