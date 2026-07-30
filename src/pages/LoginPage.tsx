import { FormEvent, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { BrandMark } from '../components/BrandMark'
import { Icon } from '../components/Icon'

export function LoginPage() {
  const { user, signIn, enterDemo, configured, demoEnabled } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/" replace />

  const destination = (location.state as { from?: string } | null)?.from || '/'

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate(destination, { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDemo = () => {
    enterDemo()
    navigate('/', { replace: true })
  }

  return (
    <div className="login-page">
      <section className="login-hero">
        <div className="login-hero__overlay" />
        <div className="login-hero__content">
          <BrandMark inverse />
          <div className="login-hero__message">
            <span className="eyebrow">BUILT FOR THE ROAD AHEAD</span>
            <h1>Run every load with confidence.</h1>
            <p>One clear place for dispatch, customer updates, documents, drivers, and the numbers that move Legacy forward.</p>
          </div>
          <div className="login-hero__trust">
            <div><Icon name="check" /><span>Faster customer updates</span></div>
            <div><Icon name="check" /><span>Cleaner load handoffs</span></div>
            <div><Icon name="check" /><span>Ready for more drivers</span></div>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-panel__inner">
          <div className="login-panel__mobile-brand"><BrandMark /></div>
          <span className="eyebrow">SECURE ACCESS</span>
          <h2>Welcome back</h2>
          <p>Sign in to the Legacy Hotshot Command Center.</p>

          <form onSubmit={handleSubmit} className="login-form">
            <label>
              Email address
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="jared@legacyhotshot.com" required />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required />
            </label>
            {error && <div className="form-error">{error}</div>}
            <button className="primary-button primary-button--large" type="submit" disabled={submitting || !configured}>
              {submitting ? 'Signing in...' : 'Sign In'} <Icon name="arrow" size={18} />
            </button>
          </form>

          {!configured && (
            <div className="setup-notice">
              <strong>Supabase connection pending</strong>
              <span>Add the two public Supabase values from <code>.env.example</code> to enable account sign-in.</span>
            </div>
          )}

          {demoEnabled && (
            <button className="secondary-button secondary-button--full" onClick={handleDemo}>
              Preview Stage 1 Demo
            </button>
          )}

          <small className="login-footer">Authorized Legacy Hotshot LLC users only.</small>
        </div>
      </section>
    </div>
  )
}
