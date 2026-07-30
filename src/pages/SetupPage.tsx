import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { BrandMark } from '../components/BrandMark'
import { Icon } from '../components/Icon'
import type { CompanySetupInput } from '../types'

const steps = ['Company', 'Contact', 'Operations', 'Branding']

export function SetupPage() {
  const { user, completeSetup } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [companyName, setCompanyName] = useState('Legacy Hotshot LLC')
  const [ownerName, setOwnerName] = useState(user?.fullName || 'Jared')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [serviceArea, setServiceArea] = useState('Texas and surrounding states')
  const [mcNumber, setMcNumber] = useState('')
  const [usdotNumber, setUsdotNumber] = useState('')
  const [invoiceTerms, setInvoiceTerms] = useState('Net 30')
  const [detentionPolicy, setDetentionPolicy] = useState('2 hours free, then billed hourly')
  const [communicationPreference, setCommunicationPreference] = useState('email')
  const [emailSignature, setEmailSignature] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#b98642')

  if (!user) return <Navigate to="/login" replace />
  if (user.setupComplete && !user.demo) return <Navigate to="/" replace />

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (step < steps.length - 1) {
      setStep((current) => current + 1)
      return
    }

    const settings: CompanySetupInput = {
      companyName,
      ownerName,
      companyEmail: email,
      companyPhone: phone,
      businessAddress,
      serviceArea,
      mcNumber,
      usdotNumber,
      invoiceTerms,
      detentionPolicy,
      communicationPreference,
      emailSignature,
      primaryColor,
    }

    setSaving(true)
    try {
      await completeSetup(settings)
      navigate('/')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save company setup.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="setup-page">
      <aside className="setup-page__aside">
        <BrandMark inverse />
        <div>
          <span className="eyebrow">FIRST-TIME SETUP</span>
          <h1>Let’s set up Jared’s command center.</h1>
          <p>Only the basics are required. Everything else can be completed later in Company Settings.</p>
        </div>
        <div className="setup-progress">
          {steps.map((label, index) => (
            <div className={`${index === step ? 'active' : ''} ${index < step ? 'complete' : ''}`} key={label}>
              <span>{index < step ? <Icon name="check" size={15} /> : index + 1}</span>
              <p><strong>{label}</strong><small>{index === step ? 'Current step' : index < step ? 'Complete' : 'Not started'}</small></p>
            </div>
          ))}
        </div>
      </aside>

      <main className="setup-page__main">
        <form onSubmit={handleSubmit} className="setup-form">
          <div className="setup-form__header"><span>Step {step + 1} of {steps.length}</span><h2>{steps[step]} information</h2><p>You may leave optional fields blank and return later.</p></div>

          {step === 0 && (
            <div className="form-grid">
              <label className="form-grid__full">Company name<input value={companyName} onChange={(event) => setCompanyName(event.target.value)} required /></label>
              <label>Owner name<input value={ownerName} onChange={(event) => setOwnerName(event.target.value)} required /></label>
              <label>Service area<input value={serviceArea} onChange={(event) => setServiceArea(event.target.value)} /></label>
              <label>MC number <span>Optional</span><input value={mcNumber} onChange={(event) => setMcNumber(event.target.value)} placeholder="MC-000000" /></label>
              <label>USDOT number <span>Optional</span><input value={usdotNumber} onChange={(event) => setUsdotNumber(event.target.value)} placeholder="0000000" /></label>
            </div>
          )}

          {step === 1 && (
            <div className="form-grid">
              <label>Company email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="dispatch@legacyhotshot.com" /></label>
              <label>Company phone<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(555) 555-5555" /></label>
              <label className="form-grid__full">Business address <span>Optional</span><input value={businessAddress} onChange={(event) => setBusinessAddress(event.target.value)} placeholder="Street, city, state, ZIP" /></label>
              <label className="form-grid__full">Email signature <span>Optional</span><textarea value={emailSignature} onChange={(event) => setEmailSignature(event.target.value)} placeholder="Jared | Legacy Hotshot LLC" /></label>
            </div>
          )}

          {step === 2 && (
            <div className="form-grid">
              <label>Default invoice terms<select value={invoiceTerms} onChange={(event) => setInvoiceTerms(event.target.value)}><option>Due on receipt</option><option>Net 15</option><option>Net 30</option><option>Net 45</option></select></label>
              <label>Default communication<select value={communicationPreference} onChange={(event) => setCommunicationPreference(event.target.value)}><option value="email">Email</option><option value="email_sms">Email and SMS</option><option value="per_load">Ask for each load</option></select></label>
              <label className="form-grid__full">Default detention policy<textarea value={detentionPolicy} onChange={(event) => setDetentionPolicy(event.target.value)} /></label>
              <div className="form-grid__full inline-notice"><Icon name="truck" /><div><strong>Truck and trailer details can wait.</strong><span>Add the current equipment later under Vehicles & Trailers.</span></div></div>
            </div>
          )}

          {step === 3 && (
            <div className="form-grid">
              <label>Primary brand color<input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} /></label>
              <label>Company logo <span>Stage 2</span><input type="file" accept="image/png,image/jpeg,image/webp" disabled /></label>
              <div className="form-grid__full brand-preview" style={{ '--preview-accent': primaryColor } as CSSProperties}>
                <BrandMark />
                <span>The selected color is saved now. Secure logo upload will activate when the private branding storage bucket is added.</span>
              </div>
            </div>
          )}

          {error && <div className="form-error">{error}</div>}

          <div className="setup-form__actions">
            <button className="text-button" type="button" disabled={step === 0 || saving} onClick={() => setStep((current) => current - 1)}>Back</button>
            <button className="primary-button" type="submit" disabled={saving}>{step === steps.length - 1 ? (saving ? 'Saving...' : 'Finish Setup') : 'Continue'} <Icon name="arrow" size={17} /></button>
          </div>
        </form>
      </main>
    </div>
  )
}
