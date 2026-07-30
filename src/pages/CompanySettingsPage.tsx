import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { BrandMark } from '../components/BrandMark'
import { Icon } from '../components/Icon'
import { getCompanySettings, saveCompanySettings } from '../lib/companySettings'
import type { CompanySettingsInput, CompanySettingsRecord } from '../lib/companySettings'

const emptySettings: CompanySettingsInput = {
  legal_name: 'Legacy Hotshot LLC',
  display_name: 'Legacy Hotshot',
  owner_name: 'Jared Guinn',
  company_email: 'legacyhsoffice@gmail.com',
  company_phone: '',
  after_hours_phone: '',
  business_address: '',
  mailing_address: '',
  city: '',
  state: 'TX',
  postal_code: '',
  service_area: 'Texas and surrounding states',
  mc_number: '',
  usdot_number: '4514127',
  website_url: '',
  facebook_url: '',
  billing_email: '',
  default_invoice_terms: 'Net 30',
  default_detention_policy: '2 hours free, then billed hourly',
  default_communication_preference: 'email',
  email_signature: 'Jared Guinn | Legacy Hotshot LLC',
  primary_color: '#bd1f31',
  secondary_color: '#111418',
  dispatch_notes: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
}

const settingsSections = [
  { id: 'company', label: 'Company & ownership', icon: 'customers' as const },
  { id: 'locations', label: 'Locations & service area', icon: 'route' as const },
  { id: 'authority', label: 'Carrier authority', icon: 'truck' as const },
  { id: 'billing', label: 'Billing & communication', icon: 'invoices' as const },
  { id: 'brand', label: 'Brand & dispatch notes', icon: 'settings' as const },
]

function fromRecord(record: CompanySettingsRecord): CompanySettingsInput {
  const { company_id: _companyId, ...values } = record
  return values
}

export function CompanySettingsPage() {
  const { user } = useAuth()
  const [values, setValues] = useState<CompanySettingsInput>(emptySettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const canEdit = user?.role === 'owner' || user?.role === 'dispatcher'
  const isDemo = Boolean(user?.demo)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        if (isDemo || !user?.companyId) {
          const saved = localStorage.getItem('legacy-hotshot-demo-settings')
          if (active && saved) setValues({ ...emptySettings, ...JSON.parse(saved) })
          return
        }
        const record = await getCompanySettings(user.companyId)
        if (active) setValues(fromRecord(record))
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load company settings.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [isDemo, user?.companyId])

  const update = (field: keyof CompanySettingsInput, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setMessage('')
  }

  const locationSummary = useMemo(() => [values.city, values.state, values.postal_code].filter(Boolean).join(', '), [values.city, values.state, values.postal_code])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canEdit) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      if (isDemo || !user?.companyId) {
        localStorage.setItem('legacy-hotshot-demo-settings', JSON.stringify(values))
      } else {
        await saveCompanySettings(user.companyId, values)
      }
      setMessage('Company settings saved successfully.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save company settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="settings-loading"><div className="loading-mark">L</div><span>Loading company settings...</span></div>

  return (
    <form className="admin-settings-workspace" onSubmit={handleSubmit}>
      <header className="admin-identity-bar">
        <div className="admin-identity-bar__mark"><BrandMark /></div>
        <div className="admin-identity-bar__company">
          <span>COMPANY ADMINISTRATION</span>
          <h2>{values.display_name || values.legal_name}</h2>
          <p>{values.owner_name || 'Business owner not entered'}{locationSummary ? ` · ${locationSummary}` : ''}</p>
        </div>
        <dl>
          <div><dt>USDOT</dt><dd>{values.usdot_number || 'Not entered'}</dd></div>
          <div><dt>Signed in</dt><dd>{user?.fullName || 'User'}</dd></div>
          <div><dt>Access</dt><dd>{canEdit ? 'Edit enabled' : 'Read only'}</dd></div>
        </dl>
      </header>

      {!canEdit && <div className="admin-settings-notice"><Icon name="alert" size={18} /><div><strong>Read-only access</strong><span>Only owners and dispatcher administrators can change company settings.</span></div></div>}
      {message && <div className="admin-settings-message admin-settings-message--success"><Icon name="check" size={18} />{message}</div>}
      {error && <div className="admin-settings-message admin-settings-message--error"><Icon name="alert" size={18} />{error}</div>}

      <div className="admin-settings-layout">
        <aside className="admin-settings-index" aria-label="Company settings sections">
          <span>SETTINGS INDEX</span>
          {settingsSections.map((section, index) => <a href={`#${section.id}`} key={section.id}><Icon name={section.icon} size={17} /><span><strong>{String(index + 1).padStart(2, '0')}</strong>{section.label}</span></a>)}
        </aside>

        <main className="admin-settings-document">
          <section id="company" className="admin-document-section">
            <header><span>01</span><div><h3>Company & Ownership</h3><p>Legal identity, operating name, ownership, and primary communication channels.</p></div></header>
            <div className="admin-form-grid">
              <label>Legal company name<input disabled={!canEdit} value={values.legal_name} onChange={(e) => update('legal_name', e.target.value)} required /></label>
              <label>Display name<input disabled={!canEdit} value={values.display_name} onChange={(e) => update('display_name', e.target.value)} required /></label>
              <label>Business owner / primary contact<input disabled={!canEdit} value={values.owner_name ?? ''} onChange={(e) => update('owner_name', e.target.value)} placeholder="Jared Guinn" /></label>
              <label>Company email<input disabled={!canEdit} type="email" value={values.company_email ?? ''} onChange={(e) => update('company_email', e.target.value)} placeholder="legacyhsoffice@gmail.com" /></label>
              <label>Company phone<input disabled={!canEdit} value={values.company_phone ?? ''} onChange={(e) => update('company_phone', e.target.value)} placeholder="(555) 555-5555" /></label>
              <label>After-hours phone<input disabled={!canEdit} value={values.after_hours_phone ?? ''} onChange={(e) => update('after_hours_phone', e.target.value)} placeholder="Optional" /></label>
            </div>
          </section>

          <section id="locations" className="admin-document-section">
            <header><span>02</span><div><h3>Locations & Service Area</h3><p>Physical address, mailing address, and the geographic area served by Legacy Hotshot.</p></div></header>
            <div className="admin-form-grid">
              <label className="admin-field--full">Physical business address<input disabled={!canEdit} value={values.business_address ?? ''} onChange={(e) => update('business_address', e.target.value)} placeholder="Street address" /></label>
              <label className="admin-field--full">Mailing address<input disabled={!canEdit} value={values.mailing_address ?? ''} onChange={(e) => update('mailing_address', e.target.value)} placeholder="Leave blank when same as physical address" /></label>
              <label>City<input disabled={!canEdit} value={values.city ?? ''} onChange={(e) => update('city', e.target.value)} /></label>
              <label>State<input disabled={!canEdit} maxLength={2} value={values.state ?? ''} onChange={(e) => update('state', e.target.value.toUpperCase())} /></label>
              <label>ZIP code<input disabled={!canEdit} value={values.postal_code ?? ''} onChange={(e) => update('postal_code', e.target.value)} /></label>
              <label className="admin-field--full">Service area<textarea disabled={!canEdit} value={values.service_area ?? ''} onChange={(e) => update('service_area', e.target.value)} placeholder="Texas and surrounding states" /></label>
            </div>
          </section>

          <section id="authority" className="admin-document-section">
            <header><span>03</span><div><h3>Carrier Authority</h3><p>Regulatory identifiers, public channels, and emergency contacts.</p></div></header>
            <div className="admin-form-grid">
              <label>MC number<input disabled={!canEdit} value={values.mc_number ?? ''} onChange={(e) => update('mc_number', e.target.value)} placeholder="MC-000000" /></label>
              <label>USDOT number<input disabled={!canEdit} value={values.usdot_number ?? ''} onChange={(e) => update('usdot_number', e.target.value)} /></label>
              <label>Website URL<input disabled={!canEdit} type="url" value={values.website_url ?? ''} onChange={(e) => update('website_url', e.target.value)} placeholder="https://" /></label>
              <label>Facebook URL<input disabled={!canEdit} type="url" value={values.facebook_url ?? ''} onChange={(e) => update('facebook_url', e.target.value)} placeholder="https://facebook.com/..." /></label>
              <label>Emergency contact<input disabled={!canEdit} value={values.emergency_contact_name ?? ''} onChange={(e) => update('emergency_contact_name', e.target.value)} /></label>
              <label>Emergency phone<input disabled={!canEdit} value={values.emergency_contact_phone ?? ''} onChange={(e) => update('emergency_contact_phone', e.target.value)} /></label>
            </div>
          </section>

          <section id="billing" className="admin-document-section">
            <header><span>04</span><div><h3>Billing & Communication</h3><p>Defaults used for invoices, detention terms, customer updates, and signatures.</p></div></header>
            <div className="admin-form-grid">
              <label>Billing email<input disabled={!canEdit} type="email" value={values.billing_email ?? ''} onChange={(e) => update('billing_email', e.target.value)} /></label>
              <label>Invoice terms<select disabled={!canEdit} value={values.default_invoice_terms} onChange={(e) => update('default_invoice_terms', e.target.value)}><option>Due on receipt</option><option>Net 15</option><option>Net 30</option><option>Net 45</option></select></label>
              <label>Default communication<select disabled={!canEdit} value={values.default_communication_preference} onChange={(e) => update('default_communication_preference', e.target.value)}><option value="email">Email</option><option value="email_sms">Email and SMS</option><option value="per_load">Ask for each load</option></select></label>
              <label className="admin-field--full">Detention policy<textarea disabled={!canEdit} value={values.default_detention_policy} onChange={(e) => update('default_detention_policy', e.target.value)} /></label>
              <label className="admin-field--full">Email signature<textarea disabled={!canEdit} value={values.email_signature ?? ''} onChange={(e) => update('email_signature', e.target.value)} /></label>
            </div>
          </section>

          <section id="brand" className="admin-document-section">
            <header><span>05</span><div><h3>Brand & Dispatch Notes</h3><p>Application identity and private operating information used by the office team.</p></div></header>
            <div className="admin-form-grid admin-form-grid--brand">
              <label>Primary color<input disabled={!canEdit} type="color" value={values.primary_color} onChange={(e) => update('primary_color', e.target.value)} /></label>
              <label>Secondary color<input disabled={!canEdit} type="color" value={values.secondary_color} onChange={(e) => update('secondary_color', e.target.value)} /></label>
              <div className="admin-logo-reference"><BrandMark /><span>Official Legacy Hotshot application identity</span></div>
              <label className="admin-field--full">Internal dispatch notes<textarea disabled={!canEdit} value={values.dispatch_notes ?? ''} onChange={(e) => update('dispatch_notes', e.target.value)} placeholder="Private operating notes, preferred lanes, equipment limitations, or customer reminders" /></label>
            </div>
          </section>
        </main>
      </div>

      {canEdit && <footer className="admin-settings-savebar"><div><strong>Company settings</strong><span>Changes apply across Legacy Hotshot operations.</span></div><button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'} <Icon name="check" size={17} /></button></footer>}
    </form>
  )
}
