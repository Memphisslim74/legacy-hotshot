import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { createCustomer, listCustomers, updateCustomer } from '../lib/operations'
import type { BusinessRelationshipInput } from '../lib/operations'
import type { BusinessRelationshipType, Customer } from '../types'

const relationshipLabels: Record<BusinessRelationshipType, string> = {
  customer: 'Customer',
  broker: 'Broker',
  shipper: 'Shipper',
  receiver: 'Receiver',
  vendor: 'Vendor',
  repair_shop: 'Repair Shop',
  fuel_partner: 'Fuel Partner',
  insurance_partner: 'Insurance',
  other: 'Other',
}

const relationshipOptions = Object.keys(relationshipLabels) as BusinessRelationshipType[]

type DirectoryFilter = 'all' | 'preferred' | 'on_hold' | BusinessRelationshipType

const emptyValues: BusinessRelationshipInput = {
  companyName: '',
  relationshipTypes: ['customer'],
  relationshipStatus: 'active',
  preferredPartner: false,
  primaryContact: '',
  email: '',
  phone: '',
  websiteUrl: '',
  city: '',
  state: '',
  paymentTerms: 'Net 30',
  communicationPreference: 'email',
  vendorCategory: '',
  notes: '',
}

const demoCustomers: Customer[] = [
  {
    id: 'demo-customer-1',
    company_name: 'Titan Industrial',
    primary_contact: 'Marcus Reed',
    email: 'dispatch@titanindustrial.com',
    phone: '(817) 555-0138',
    billing_contact: 'Accounts Payable',
    billing_email: 'ap@titanindustrial.com',
    billing_address: null,
    payment_terms: 'Net 30',
    communication_preference: 'email',
    notes: 'Frequent machinery and fabrication loads. Prefers evening pickup confirmations.',
    relationship_types: ['customer', 'shipper'],
    relationship_status: 'active',
    preferred_partner: true,
    website_url: 'https://example.com',
    address_line_1: null,
    address_line_2: null,
    city: 'Fort Worth',
    state: 'TX',
    postal_code: null,
    vendor_category: null,
    account_number: 'LH-1001',
    last_activity_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-customer-2',
    company_name: 'High Plains Fabrication',
    primary_contact: 'Kara Ellis',
    email: 'shipping@highplainsfab.com',
    phone: '(432) 555-0172',
    billing_contact: null,
    billing_email: null,
    billing_address: null,
    payment_terms: 'Net 15',
    communication_preference: 'email_sms',
    notes: 'Fabrication customer and common pickup location.',
    relationship_types: ['customer', 'shipper', 'receiver'],
    relationship_status: 'active',
    preferred_partner: false,
    website_url: null,
    address_line_1: null,
    address_line_2: null,
    city: 'Midland',
    state: 'TX',
    postal_code: null,
    vendor_category: null,
    account_number: 'LH-1002',
    last_activity_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-customer-3',
    company_name: 'Frontier Fleet & Trailer',
    primary_contact: 'Daniel Ortiz',
    email: 'service@frontierfleet.com',
    phone: '(940) 555-0184',
    billing_contact: null,
    billing_email: null,
    billing_address: null,
    payment_terms: 'Due on receipt',
    communication_preference: 'email',
    notes: 'Preferred trailer repair and roadside service vendor.',
    relationship_types: ['vendor', 'repair_shop'],
    relationship_status: 'active',
    preferred_partner: true,
    website_url: null,
    address_line_1: null,
    address_line_2: null,
    city: 'Denton',
    state: 'TX',
    postal_code: null,
    vendor_category: 'Fleet repair',
    account_number: null,
    last_activity_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-customer-4',
    company_name: 'Red River Freight Brokerage',
    primary_contact: 'Megan Cole',
    email: 'loads@redriverfreight.com',
    phone: '(469) 555-0119',
    billing_contact: 'Broker Settlements',
    billing_email: 'settlements@redriverfreight.com',
    billing_address: null,
    payment_terms: 'Net 30',
    communication_preference: 'email',
    notes: 'Broker relationship. Confirm rate confirmation before dispatch.',
    relationship_types: ['broker', 'customer'],
    relationship_status: 'on_hold',
    preferred_partner: false,
    website_url: null,
    address_line_1: null,
    address_line_2: null,
    city: 'Dallas',
    state: 'TX',
    postal_code: null,
    vendor_category: null,
    account_number: 'BR-2044',
    last_activity_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    created_at: new Date().toISOString(),
  },
]

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function locationLabel(customer: Customer) {
  return [customer.city, customer.state].filter(Boolean).join(', ') || 'Location not entered'
}

function valuesFromCustomer(customer: Customer): BusinessRelationshipInput {
  return {
    companyName: customer.company_name,
    relationshipTypes: customer.relationship_types?.length ? customer.relationship_types : ['customer'],
    relationshipStatus: customer.relationship_status || 'active',
    preferredPartner: Boolean(customer.preferred_partner),
    primaryContact: customer.primary_contact || '',
    email: customer.email || '',
    phone: customer.phone || '',
    websiteUrl: customer.website_url || '',
    city: customer.city || '',
    state: customer.state || '',
    paymentTerms: customer.payment_terms || 'Net 30',
    communicationPreference: customer.communication_preference || 'email',
    vendorCategory: customer.vendor_category || '',
    notes: customer.notes || '',
  }
}

export function CustomersPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<DirectoryFilter>('all')
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState<BusinessRelationshipInput>(emptyValues)

  useEffect(() => {
    const load = async () => {
      try {
        if (!user?.companyId || user.demo) setCustomers(demoCustomers)
        else setCustomers(await listCustomers(user.companyId))
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load business relationships.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const counts = useMemo(() => ({
    all: customers.length,
    customer: customers.filter((item) => item.relationship_types?.includes('customer')).length,
    vendor: customers.filter((item) => item.relationship_types?.some((type) => ['vendor', 'repair_shop', 'fuel_partner', 'insurance_partner'].includes(type))).length,
    preferred: customers.filter((item) => item.preferred_partner).length,
    onHold: customers.filter((item) => item.relationship_status === 'on_hold').length,
  }), [customers])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return customers.filter((customer) => {
      const matchesSearch = !query || [
        customer.company_name,
        customer.primary_contact,
        customer.email,
        customer.phone,
        customer.city,
        customer.state,
        customer.vendor_category,
        ...(customer.relationship_types || []).map((type) => relationshipLabels[type]),
      ].some((value) => value?.toLowerCase().includes(query))

      const matchesFilter = filter === 'all'
        || (filter === 'preferred' && customer.preferred_partner)
        || (filter === 'on_hold' && customer.relationship_status === 'on_hold')
        || (relationshipOptions.includes(filter as BusinessRelationshipType) && customer.relationship_types?.includes(filter as BusinessRelationshipType))

      return matchesSearch && matchesFilter
    })
  }, [customers, filter, search])

  const openCreate = () => {
    setEditingId(null)
    setValues(emptyValues)
    setError('')
    setMessage('')
    setShowForm(true)
  }

  const openEdit = (customer: Customer) => {
    setEditingId(customer.id)
    setValues(valuesFromCustomer(customer))
    setError('')
    setMessage('')
    setShowForm(true)
  }

  const toggleRelationship = (type: BusinessRelationshipType) => {
    setValues((current) => {
      const selected = current.relationshipTypes.includes(type)
      if (selected && current.relationshipTypes.length === 1) return current
      return {
        ...current,
        relationshipTypes: selected
          ? current.relationshipTypes.filter((item) => item !== type)
          : [...current.relationshipTypes, type],
      }
    })
  }

  const saveRelationship = async (event: FormEvent) => {
    event.preventDefault()
    if (!values.companyName.trim() || !user) return
    setSaving(true)
    setError('')
    setMessage('')

    try {
      if (!user.companyId || user.demo) {
        if (editingId) {
          setCustomers((current) => current.map((item) => item.id === editingId
            ? {
                ...item,
                company_name: values.companyName,
                relationship_types: values.relationshipTypes,
                relationship_status: values.relationshipStatus,
                preferred_partner: values.preferredPartner,
                primary_contact: values.primaryContact || null,
                email: values.email || null,
                phone: values.phone || null,
                website_url: values.websiteUrl || null,
                city: values.city || null,
                state: values.state.toUpperCase() || null,
                payment_terms: values.paymentTerms,
                communication_preference: values.communicationPreference,
                vendor_category: values.vendorCategory || null,
                notes: values.notes || null,
              }
            : item))
        } else {
          const created: Customer = {
            id: `demo-${Date.now()}`,
            company_name: values.companyName,
            primary_contact: values.primaryContact || null,
            email: values.email || null,
            phone: values.phone || null,
            billing_contact: null,
            billing_email: null,
            billing_address: null,
            payment_terms: values.paymentTerms,
            communication_preference: values.communicationPreference,
            notes: values.notes || null,
            relationship_types: values.relationshipTypes,
            relationship_status: values.relationshipStatus,
            preferred_partner: values.preferredPartner,
            website_url: values.websiteUrl || null,
            address_line_1: null,
            address_line_2: null,
            city: values.city || null,
            state: values.state.toUpperCase() || null,
            postal_code: null,
            vendor_category: values.vendorCategory || null,
            account_number: null,
            last_activity_at: null,
            created_at: new Date().toISOString(),
          }
          setCustomers((current) => [created, ...current])
        }
      } else if (editingId) {
        const updated = await updateCustomer(user.companyId, editingId, values)
        setCustomers((current) => current.map((item) => item.id === editingId ? { ...item, ...updated } : item))
      } else {
        const created = await createCustomer(user.companyId, user.id, values)
        setCustomers((current) => [created, ...current])
      }

      setMessage(editingId ? 'Business relationship updated.' : 'Business relationship created.')
      setShowForm(false)
      setEditingId(null)
      setValues(emptyValues)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save this business relationship.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="operations-page relationship-directory-page">
      <div className="page-command-row relationship-page-heading">
        <div><span className="eyebrow">CLIENTS, VENDORS & PARTNERS</span><h2>Business Relationships</h2><p>Manage every company Legacy Hotshot works with from one two-way directory.</p></div>
        <button className="primary-button" onClick={openCreate}><Icon name="plus" size={17} /> Add Relationship</button>
      </div>

      {message && <div className="form-success operations-alert">{message}</div>}
      {error && <div className="form-error operations-alert">{error}</div>}

      <section className="relationship-summary" aria-label="Business relationship summary">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}><span>All businesses</span><strong>{counts.all}</strong></button>
        <button className={filter === 'customer' ? 'active' : ''} onClick={() => setFilter('customer')}><span>Customers</span><strong>{counts.customer}</strong></button>
        <button className={filter === 'vendor' ? 'active' : ''} onClick={() => setFilter('vendor')}><span>Vendors</span><strong>{counts.vendor}</strong></button>
        <button className={filter === 'preferred' ? 'active' : ''} onClick={() => setFilter('preferred')}><span>Preferred</span><strong>{counts.preferred}</strong></button>
        <button className={filter === 'on_hold' ? 'active' : ''} onClick={() => setFilter('on_hold')}><span>On hold</span><strong>{counts.onHold}</strong></button>
      </section>

      <section className="panel operations-toolbar relationship-toolbar">
        <label className="operations-search"><Icon name="search" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company, contact, role, category, or location" /></label>
        <div className="relationship-view-note"><Icon name="customers" size={17} /><span>{filtered.length} relationship{filtered.length === 1 ? '' : 's'} shown</span></div>
      </section>

      <section className="relationship-card-grid">
        {loading ? <div className="panel empty-state">Loading business relationships...</div> : filtered.length === 0 ? (
          <div className="panel empty-state"><Icon name="customers" size={28} /><strong>No matching businesses</strong><span>Change the filter or add a new relationship.</span></div>
        ) : filtered.map((customer) => (
          <article className={`relationship-card ${customer.relationship_status !== 'active' ? 'relationship-card--muted' : ''}`} key={customer.id}>
            <div className="relationship-card__identity">
              <div className="relationship-avatar">{initials(customer.company_name)}</div>
              <div className="relationship-card__title">
                <div><h3>{customer.company_name}</h3>{customer.preferred_partner && <span className="preferred-badge">Preferred</span>}</div>
                <p>{customer.primary_contact || 'No primary contact'} · {locationLabel(customer)}</p>
              </div>
              <span className={`relationship-status relationship-status--${customer.relationship_status}`}>{customer.relationship_status === 'on_hold' ? 'On hold' : customer.relationship_status}</span>
            </div>

            <div className="relationship-role-list">
              {(customer.relationship_types?.length ? customer.relationship_types : ['customer']).map((type) => <span key={type}>{relationshipLabels[type]}</span>)}
            </div>

            <div className="relationship-card__contact">
              <div><span>Email</span><strong>{customer.email || 'Not provided'}</strong></div>
              <div><span>Phone</span><strong>{customer.phone || 'Not provided'}</strong></div>
            </div>

            <div className="relationship-card__details">
              <div><span>Terms</span><strong>{customer.payment_terms}</strong></div>
              <div><span>Updates</span><strong>{customer.communication_preference.replace('_', ' + ')}</strong></div>
              <div><span>Category</span><strong>{customer.vendor_category || relationshipLabels[customer.relationship_types?.[0] || 'customer']}</strong></div>
            </div>

            {customer.notes && <p className="relationship-card__notes">{customer.notes}</p>}

            <div className="relationship-card__actions">
              <button className="secondary-button" onClick={() => openEdit(customer)}>View & Edit</button>
              {customer.email && <a className="relationship-link" href={`mailto:${customer.email}`}>Email</a>}
              {customer.phone && <a className="relationship-link" href={`tel:${customer.phone}`}>Call</a>}
              {customer.relationship_types?.includes('customer') && <button className="text-button" onClick={() => navigate('/loads/new')}>New Load <Icon name="arrow" size={14} /></button>}
            </div>
          </article>
        ))}
      </section>

      {showForm && (
        <div className="modal-scrim" role="presentation" onMouseDown={() => setShowForm(false)}>
          <form className="modal-card relationship-modal" role="dialog" aria-modal="true" aria-label={editingId ? 'Edit business relationship' : 'Add business relationship'} onSubmit={saveRelationship} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-card__header"><div><span className="eyebrow">BUSINESS DIRECTORY</span><h2>{editingId ? 'Edit Relationship' : 'Add Relationship'}</h2><p>One company can hold several roles without creating duplicate records.</p></div><button className="icon-button" type="button" onClick={() => setShowForm(false)}>×</button></div>

            <div className="relationship-form-section">
              <div className="relationship-form-heading"><strong>Company roles</strong><span>Select every way Legacy Hotshot works with this business.</span></div>
              <div className="relationship-type-picker">
                {relationshipOptions.map((type) => <button key={type} type="button" className={values.relationshipTypes.includes(type) ? 'selected' : ''} onClick={() => toggleRelationship(type)}>{values.relationshipTypes.includes(type) && '✓ '}{relationshipLabels[type]}</button>)}
              </div>
            </div>

            <div className="form-grid relationship-form-grid">
              <label className="form-grid__full">Company name<input required value={values.companyName} onChange={(event) => setValues({ ...values, companyName: event.target.value })} /></label>
              <label>Status<select value={values.relationshipStatus} onChange={(event) => setValues({ ...values, relationshipStatus: event.target.value as BusinessRelationshipInput['relationshipStatus'] })}><option value="active">Active</option><option value="on_hold">On hold</option><option value="inactive">Inactive</option></select></label>
              <label>Vendor/category<input value={values.vendorCategory} onChange={(event) => setValues({ ...values, vendorCategory: event.target.value })} placeholder="Fleet repair, fuel, brokerage..." /></label>
              <label>Primary contact<input value={values.primaryContact} onChange={(event) => setValues({ ...values, primaryContact: event.target.value })} /></label>
              <label>Email<input type="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} /></label>
              <label>Phone<input value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} /></label>
              <label>Website<input type="url" value={values.websiteUrl} onChange={(event) => setValues({ ...values, websiteUrl: event.target.value })} placeholder="https://" /></label>
              <label>City<input value={values.city} onChange={(event) => setValues({ ...values, city: event.target.value })} /></label>
              <label>State<input maxLength={2} value={values.state} onChange={(event) => setValues({ ...values, state: event.target.value.toUpperCase() })} /></label>
              <label>Payment terms<select value={values.paymentTerms} onChange={(event) => setValues({ ...values, paymentTerms: event.target.value })}><option>Due on receipt</option><option>Net 15</option><option>Net 30</option><option>Net 45</option></select></label>
              <label>Communication<select value={values.communicationPreference} onChange={(event) => setValues({ ...values, communicationPreference: event.target.value })}><option value="email">Email</option><option value="email_sms">Email + SMS</option><option value="phone">Phone</option><option value="per_load">Ask per load</option></select></label>
              <label className="relationship-preferred-toggle form-grid__full"><input type="checkbox" checked={values.preferredPartner} onChange={(event) => setValues({ ...values, preferredPartner: event.target.checked })} /><span><strong>Preferred partner</strong><small>Highlight this business for dispatch and purchasing decisions.</small></span></label>
              <label className="form-grid__full">Internal notes<textarea value={values.notes} onChange={(event) => setValues({ ...values, notes: event.target.value })} /></label>
            </div>

            <div className="modal-card__actions"><button className="secondary-button" type="button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button" type="submit" disabled={saving || !values.companyName.trim()}>{saving ? 'Saving...' : editingId ? 'Save Relationship' : 'Create Relationship'}</button></div>
          </form>
        </div>
      )}
    </div>
  )
}
