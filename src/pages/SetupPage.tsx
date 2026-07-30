import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { BrandMark } from '../components/BrandMark'
import { Icon } from '../components/Icon'
import type { CompanySetupInput } from '../types'

export function SetupPage() {
  const { user, loading, completeSetup } = useAuth()
  const navigate = useNavigate()
  const [companyName, setCompanyName] = useState('Legacy Hotshot LLC')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (loading) return <div className="loading-screen"><div className="loading-mark">L</div><span>Loading setup...</span></div>
  if (!user) return <Navigate to="/login" replace />
  if (user.setupComplete && !user.demo) return <Navigate to="/" replace />

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    const settings: CompanySetupInput = {
      companyName,
      ownerName: '',
      companyEmail: '',
      companyPhone: '',
      businessAddress: '',
      serviceArea: '',
      mcNumber: '',
      usdotNumber: '',
      invoiceTerms: 'Net 30',
      detentionPolicy: '2 hours free, then billed hourly',
      communicationPreference: 'email',
      emailSignature: '',
      primaryColor: '#bd1f31',
    }

    try {
      await completeSetup(settings)
      navigate('/settings', { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create the company workspace.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="setup-page setup-page--simple">
      <aside className="setup-page__aside">
        <BrandMark inverse />
        <div>
          <span className="eyebrow">FIRST-TIME SETUP</span>
          <h1>Create the company workspace.</h1>
          <p>This step only creates Legacy Hotshot in the system. Ownership, contact, carrier, billing, branding, and operational details are maintained afterward under Company Settings.</p>
        </div>
        <div className="setup-account-card">
          <small>SIGNED IN ACCOUNT</small>
          <strong>{user.fullName}</strong>
          <span>{user.email}</span>
        </div>
      </aside>

      <main className="setup-page__main">
        <form onSubmit={handleSubmit} className="setup-form setup-form--simple">
          <div className="setup-form__header">
            <span>COMPANY WORKSPACE</span>
            <h2>Start Legacy Hotshot</h2>
            <p>Your personal account name will remain separate from the company owner and contact information.</p>
          </div>

          <div className="form-grid">
            <label className="form-grid__full">Company name<input value={companyName} onChange={(event) => setCompanyName(event.target.value)} required /></label>
            <div className="form-grid__full inline-notice"><Icon name="settings" /><div><strong>Finish the details in Company Settings</strong><span>Jared Guinn, administrators, contact information, authority numbers, billing defaults, service area, and additional fields are edited there.</span></div></div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="setup-form__actions setup-form__actions--right">
            <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Workspace'} <Icon name="arrow" size={17} /></button>
          </div>
        </form>
      </main>
    </div>
  )
}
