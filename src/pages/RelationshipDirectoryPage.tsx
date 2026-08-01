import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { createCustomer, listCustomers, updateCustomer } from '../lib/operations'
import type { BusinessRelationshipInput } from '../lib/operations'
import type { BusinessRelationshipType, Customer } from '../types'

const roleLabels: Record<BusinessRelationshipType, string> = {
  customer: 'Customer', broker: 'Broker', shipper: 'Shipper', receiver: 'Receiver', vendor: 'Vendor', repair_shop: 'Repair Shop', fuel_partner: 'Fuel Partner', insurance_partner: 'Insurance', other: 'Other',
}

const roleOptions = Object.keys(roleLabels) as BusinessRelationshipType[]
type Filter = 'all' | 'preferred' | 'on_hold' | BusinessRelationshipType

const emptyValues: BusinessRelationshipInput = {
  companyName: '', relationshipTypes: ['customer'], relationshipStatus: 'active', preferredPartner: false, primaryContact: '', email: '', phone: '', websiteUrl: '', city: '', state: '', paymentTerms: 'Net 30', communicationPreference: 'email', vendorCategory: '', notes: '',
}

const sampleRelationships: Customer[] = [
  {
    id: 'sample-relationship-1', company_name: 'Titan Industrial', primary_contact: 'Marcus Reed', email: 'dispatch@titanindustrial.com', phone: '(817) 555-0138', billing_contact: 'Accounts Payable', billing_email: 'ap@titanindustrial.com', billing_address: null, payment_terms: 'Net 30', communication_preference: 'email_sms', notes: 'Frequent machinery and fabrication loads. Evening pickup confirmations preferred.', relationship_types: ['customer', 'shipper'], relationship_status: 'active', preferred_partner: true, website_url: 'https://example.com', address_line_1: null, address_line_2: null, city: 'Fort Worth', state: 'TX', postal_code: '76102', vendor_category: null, account_number: 'LH-1001', last_activity_at: new Date(Date.now() - 2 * 86400000).toISOString(), created_at: new Date(Date.now() - 120 * 86400000).toISOString(), business_contacts: [{ id: 'sample-contact-1', customer_id: 'sample-relationship-1', full_name: 'Marcus Reed', title: 'Shipping Manager', department: 'Operations', email: 'dispatch@titanindustrial.com', phone: '(817) 555-0138', contact_role: 'primary', is_primary: true, is_active: true, notes: null, created_at: new Date().toISOString() }],
  },
  {
    id: 'sample-relationship-2', company_name: 'High Plains Fabrication', primary_contact: 'Kara Ellis', email: 'shipping@highplainsfab.com', phone: '(432) 555-0172', billing_contact: 'Mason Bell', billing_email: 'billing@highplainsfab.com', billing_address: null, payment_terms: 'Net 15', communication_preference: 'email', notes: 'Common pickup and receiving location for fabricated equipment.', relationship_types: ['customer', 'shipper', 'receiver'], relationship_status: 'active', preferred_partner: false, website_url: null, address_line_1: null, address_line_2: null, city: 'Midland', state: 'TX', postal_code: '79701', vendor_category: null, account_number: 'LH-1002', last_activity_at: new Date(Date.now() - 7 * 86400000).toISOString(), created_at: new Date(Date.now() - 90 * 86400000).toISOString(), business_contacts: [],
  },
  {
    id: 'sample-relationship-3', company_name: 'Frontier Fleet & Trailer', primary_contact: 'Daniel Ortiz', email: 'service@frontierfleet.com', phone: '(940) 555-0184', billing_contact: null, billing_email: null, billing_address: null, payment_terms: 'Due on receipt', communication_preference: 'phone', notes: 'Preferred trailer repair and roadside service partner.', relationship_types: ['vendor', 'repair_shop'], relationship_status: 'active', preferred_partner: true, website_url: null, address_line_1: null, address_line_2: null, city: 'Denton', state: 'TX', postal_code: '76201', vendor_category: 'Fleet repair', account_number: null, last_activity_at: new Date(Date.now() - 14 * 86400000).toISOString(), created_at: new Date(Date.now() - 60 * 86400000).toISOString(), business_contacts: [],
  },
  {
    id: 'sample-relationship-4', company_name: 'Red River Freight Brokerage', primary_contact: 'Megan Cole', email: 'loads@redriverfreight.com', phone: '(469) 555-0119', billing_contact: 'Broker Settlements', billing_email: 'settlements@redriverfreight.com', billing_address: null, payment_terms: 'Net 30', communication_preference: 'email', notes: 'Broker relationship. Confirm rate confirmation before dispatch.', relationship_types: ['broker', 'customer'], relationship_status: 'on_hold', preferred_partner: false, website_url: null, address_line_1: null, address_line_2: null, city: 'Dallas', state: 'TX', postal_code: '75201', vendor_category: 'Brokerage', account_number: 'BR-2044', last_activity_at: new Date(Date.now() - 30 * 86400000).toISOString(), created_at: new Date(Date.now() - 180 * 86400000).toISOString(), business_contacts: [],
  },
]

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function valuesFromRelationship(item: Customer): BusinessRelationshipInput {
  return {
    companyName: item.company_name,
    relationshipTypes: item.relationship_types?.length ? item.relationship_types : ['customer'],
    relationshipStatus: item.relationship_status || 'active',
    preferredPartner: Boolean(item.preferred_partner),
    primaryContact: item.primary_contact || '', email: item.email || '', phone: item.phone || '', websiteUrl: item.website_url || '', city: item.city || '', state: item.state || '', paymentTerms: item.payment_terms || 'Net 30', communicationPreference: item.communication_preference || 'email', vendorCategory: item.vendor_category || '', notes: item.notes || '',
  }
}

export function RelationshipDirectoryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [relationships, setRelationships] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showingSampleData, setShowingSampleData] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState<BusinessRelationshipInput>(emptyValues)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        if (!user?.companyId || user.demo) {
          setRelationships(sampleRelationships)
          setShowingSampleData(true)
        } else {
          const rows = await listCustomers(user.companyId)
          setRelationships(rows.length ? rows : sampleRelationships)
          setShowingSampleData(rows.length === 0)
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load business relationships.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const counts = useMemo(() => ({
    all: relationships.length,
    customer: relationships.filter((item) => item.relationship_types.includes('customer')).length,
    vendor: relationships.filter((item) => item.relationship_types.some((role) => ['vendor', 'repair_shop', 'fuel_partner', 'insurance_partner'].includes(role))).length,
    preferred: relationships.filter((item) => item.preferred_partner).length,
    onHold: relationships.filter((item) => item.relationship_status === 'on_hold').length,
  }), [relationships])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return relationships.filter((item) => {
      const matchesSearch = !query || [item.company_name, item.primary_contact, item.email, item.phone, item.city, item.state, item.vendor_category, ...item.relationship_types.map((role) => roleLabels[role])].some((value) => value?.toLowerCase().includes(query))
      const matchesFilter = filter === 'all'
        || (filter === 'preferred' && item.preferred_partner)
        || (filter === 'on_hold' && item.relationship_status === 'on_hold')
        || (roleOptions.includes(filter as BusinessRelationshipType) && item.relationship_types.includes(filter as BusinessRelationshipType))
      return matchesSearch && matchesFilter
    })
  }, [relationships, search, filter])

  const openCreate = () => {
    setEditingId(null)
    setValues(emptyValues)
    setMessage('')
    setError('')
    setShowEditor(true)
  }

  const openEdit = (item: Customer) => {
    setEditingId(item.id)
    setValues(valuesFromRelationship(item))
    setMessage('')
    setError('')
    setShowEditor(true)
  }

  const toggleRole = (role: BusinessRelationshipType) => {
    setValues((current) => {
      const selected = current.relationshipTypes.includes(role)
      if (selected && current.relationshipTypes.length === 1) return current
      return { ...current, relationshipTypes: selected ? current.relationshipTypes.filter((item) => item !== role) : [...current.relationshipTypes, role] }
    })
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!user || !values.companyName.trim()) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const editingSample = Boolean(editingId?.startsWith('sample-relationship-'))
      if (editingId && (editingSample || user.demo || !user.companyId)) {
        setRelationships((current) => current.map((item) => item.id === editingId ? { ...item, company_name: values.companyName, relationship_types: values.relationshipTypes, relationship_status: values.relationshipStatus, preferred_partner: values.preferredPartner, primary_contact: values.primaryContact || null, email: values.email || null, phone: values.phone || null, website_url: values.websiteUrl || null, city: values.city || null, state: values.state.toUpperCase() || null, payment_terms: values.paymentTerms, communication_preference: values.communicationPreference, vendor_category: values.vendorCategory || null, notes: values.notes || null } : item))
      } else if (editingId && user.companyId) {
        const updated = await updateCustomer(user.companyId, editingId, values)
        setRelationships((current) => current.map((item) => item.id === editingId ? { ...item, ...updated } : item))
      } else if (user.companyId && !user.demo) {
        const created = await createCustomer(user.companyId, user.id, values)
        setRelationships((current) => [created, ...current.filter((item) => !item.id.startsWith('sample-relationship-'))])
        setShowingSampleData(false)
      } else {
        const created: Customer = { ...sampleRelationships[0], id: `sample-relationship-${Date.now()}`, company_name: values.companyName, relationship_types: values.relationshipTypes, relationship_status: values.relationshipStatus, preferred_partner: values.preferredPartner, primary_contact: values.primaryContact || null, email: values.email || null, phone: values.phone || null, website_url: values.websiteUrl || null, city: values.city || null, state: values.state.toUpperCase() || null, payment_terms: values.paymentTerms, communication_preference: values.communicationPreference, vendor_category: values.vendorCategory || null, notes: values.notes || null, created_at: new Date().toISOString() }
        setRelationships((current) => [created, ...current])
      }
      setMessage(editingId ? 'Relationship updated.' : 'Relationship created.')
      setShowEditor(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save this relationship.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relationship-v2">
      <section className="relationship-v2__head">
        <div><span>BUSINESS RELATIONSHIP DIRECTORY</span><h2>Clients & Vendors</h2><p>One company record can serve as a customer, broker, shipper, receiver, vendor, or service partner.</p></div>
        <button onClick={openCreate}><Icon name="plus" size={16} /> Add Business</button>
      </section>

      {message && <div className="form-success operations-alert">{message}</div>}
      {error && <div className="form-error operations-alert">{error}</div>}
      {showingSampleData && <div className="sample-data-banner"><Icon name="alert" size={16} /><span><strong>Sample Data — Preview Only</strong> Add the first real business to replace these examples. Edits to sample cards stay local.</span></div>}

      <section className="relationship-v2__controls">
        <div className="relationship-v2__counts">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}><span>All</span><strong>{counts.all}</strong></button>
          <button className={filter === 'customer' ? 'active' : ''} onClick={() => setFilter('customer')}><span>Customers</span><strong>{counts.customer}</strong></button>
          <button className={filter === 'vendor' ? 'active' : ''} onClick={() => setFilter('vendor')}><span>Vendors</span><strong>{counts.vendor}</strong></button>
          <button className={filter === 'preferred' ? 'active' : ''} onClick={() => setFilter('preferred')}><span>Preferred</span><strong>{counts.preferred}</strong></button>
          <button className={filter === 'on_hold' ? 'active' : ''} onClick={() => setFilter('on_hold')}><span>On hold</span><strong>{counts.onHold}</strong></button>
        </div>
        <label><Icon name="search" size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company, contact, role, category, or city" /></label>
      </section>

      {loading ? <div className="relationship-v2__empty">Loading relationships...</div> : <section className="relationship-v2__grid">
        {filtered.map((item) => <article className={item.relationship_status !== 'active' ? 'relationship-v2-card relationship-v2-card--muted' : 'relationship-v2-card'} key={item.id}>
          <header><div className="relationship-v2-card__avatar">{initials(item.company_name)}</div><div><h3>{item.company_name}</h3><p>{item.city && item.state ? `${item.city}, ${item.state}` : 'Location not entered'}</p></div><b className={`relationship-v2-card__status relationship-v2-card__status--${item.relationship_status}`}>{item.relationship_status === 'on_hold' ? 'On hold' : item.relationship_status}</b></header>
          <div className="relationship-v2-card__roles">{item.relationship_types.map((role) => <span key={role}>{roleLabels[role]}</span>)}{item.preferred_partner && <span className="preferred">Preferred</span>}</div>
          <dl><div><dt>Primary contact</dt><dd>{item.primary_contact || 'Not assigned'}</dd></div><div><dt>Email</dt><dd>{item.email || 'Not provided'}</dd></div><div><dt>Phone</dt><dd>{item.phone || 'Not provided'}</dd></div><div><dt>Terms</dt><dd>{item.payment_terms}</dd></div></dl>
          {item.notes && <p className="relationship-v2-card__note">{item.notes}</p>}
          <footer><button onClick={() => openEdit(item)}>View & Edit</button>{item.email && <a href={`mailto:${item.email}`}>Email</a>}{item.phone && <a href={`tel:${item.phone}`}>Call</a>}<button onClick={() => navigate(`/loads/new?businessId=${encodeURIComponent(item.id)}`)}>Create Load <Icon name="arrow" size={13} /></button></footer>
        </article>)}
        {!filtered.length && <div className="relationship-v2__empty">No businesses match the current search or filter.</div>}
      </section>}

      {showEditor && <div className="relationship-v2-drawer-scrim" onMouseDown={() => setShowEditor(false)}><form className="relationship-v2-drawer" onSubmit={save} onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span>BUSINESS RECORD</span><h2>{editingId ? 'Edit Relationship' : 'Add Business'}</h2><p>Select every way Legacy Hotshot works with this company.</p></div><button type="button" onClick={() => setShowEditor(false)}>×</button></header>
        <section><h3>Relationship roles</h3><div className="relationship-v2-role-picker">{roleOptions.map((role) => <button type="button" className={values.relationshipTypes.includes(role) ? 'selected' : ''} key={role} onClick={() => toggleRole(role)}>{values.relationshipTypes.includes(role) ? '✓ ' : ''}{roleLabels[role]}</button>)}</div></section>
        <section className="relationship-v2-form"><label className="wide">Company name<input required value={values.companyName} onChange={(event) => setValues({ ...values, companyName: event.target.value })} /></label><label>Status<select value={values.relationshipStatus} onChange={(event) => setValues({ ...values, relationshipStatus: event.target.value as BusinessRelationshipInput['relationshipStatus'] })}><option value="active">Active</option><option value="on_hold">On hold</option><option value="inactive">Inactive</option></select></label><label>Category<input value={values.vendorCategory} onChange={(event) => setValues({ ...values, vendorCategory: event.target.value })} placeholder="Brokerage, fleet repair, fuel..." /></label><label>Primary contact<input value={values.primaryContact} onChange={(event) => setValues({ ...values, primaryContact: event.target.value })} /></label><label>Email<input type="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} /></label><label>Phone<input value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} /></label><label>Website<input type="url" value={values.websiteUrl} onChange={(event) => setValues({ ...values, websiteUrl: event.target.value })} placeholder="https://" /></label><label>City<input value={values.city} onChange={(event) => setValues({ ...values, city: event.target.value })} /></label><label>State<input maxLength={2} value={values.state} onChange={(event) => setValues({ ...values, state: event.target.value.toUpperCase() })} /></label><label>Payment terms<select value={values.paymentTerms} onChange={(event) => setValues({ ...values, paymentTerms: event.target.value })}><option>Due on receipt</option><option>Net 15</option><option>Net 30</option><option>Net 45</option></select></label><label>Communication<select value={values.communicationPreference} onChange={(event) => setValues({ ...values, communicationPreference: event.target.value })}><option value="email">Email</option><option value="email_sms">Email + SMS</option><option value="phone">Phone</option><option value="per_load">Ask per load</option></select></label><label className="wide relationship-v2-preferred"><input type="checkbox" checked={values.preferredPartner} onChange={(event) => setValues({ ...values, preferredPartner: event.target.checked })} /><span><strong>Preferred partner</strong><small>Highlight this business during dispatch and purchasing decisions.</small></span></label><label className="wide">Internal notes<textarea value={values.notes} onChange={(event) => setValues({ ...values, notes: event.target.value })} /></label></section>
        <footer><button type="button" onClick={() => setShowEditor(false)}>Cancel</button><button type="submit" disabled={saving || !values.companyName.trim()}>{saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Business'}</button></footer>
      </form></div>}
    </div>
  )
}
