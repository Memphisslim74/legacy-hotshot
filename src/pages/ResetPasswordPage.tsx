import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { supabase } from '../lib/supabase'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const [saving, setSaving] = useState(false)
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const checkSession = async () => {
      if (!supabase) {
        if (active) {
          setError('Supabase is not connected.')
          setChecking(false)
        }
        return
      }
      const { data } = await supabase.auth.getSession()
      if (active && data.session?.user) {
        setEmail(data.session.user.email || '')
        setReady(true)
      }
      if (active) setChecking(false)
    }

    checkSession()
    const subscription = supabase?.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY' || session?.user) {
        setEmail(session?.user.email || '')
        setReady(Boolean(session?.user))
        setChecking(false)
      }
    })

    return () => {
      active = false
      subscription?.data.subscription.unsubscribe()
    }
  }, [])

  const updatePassword = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (password.length < 12) {
      setError('Use at least 12 characters for the new password.')
      return
    }
    if (password !== confirmPassword) {
      setError('The two passwords do not match.')
      return
    }
    if (!supabase) {
      setError('Supabase is not connected.')
      return
    }

    setSaving(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setComplete(true)
      setPassword('')
      setConfirmPassword('')
      await supabase.auth.signOut()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update your password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="auth-page reset-password-page">
      <section className="auth-brand-panel"><BrandMark inverse /><div><span className="eyebrow">ACCOUNT SECURITY</span><h1>Set a new password</h1><p>Use the secure recovery link sent by Legacy Hotshot to choose a new password for your account.</p></div></section>
      <main className="auth-form-panel">
        <div className="auth-form-card">
          {complete ? (
            <div className="password-reset-complete"><span>✓</span><h2>Password updated</h2><p>Your password has been changed. Sign in again using the new password.</p><button className="primary-button" onClick={() => navigate('/login')}>Return to Sign In</button></div>
          ) : checking ? (
            <div className="empty-state">Checking the password-reset link...</div>
          ) : !ready ? (
            <div className="password-reset-invalid"><h2>This reset link is not active</h2><p>Open the newest password-reset email and use the link inside it. Recovery links expire and can only be used through the approved Legacy Hotshot address.</p><button className="secondary-button" onClick={() => navigate('/login')}>Return to Sign In</button></div>
          ) : (
            <form onSubmit={updatePassword}>
              <div className="auth-form-card__header"><span>SECURE PASSWORD RESET</span><h2>Create your new password</h2><p>{email}</p></div>
              <label>New password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={12} required /></label>
              <label>Confirm new password<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={12} required /></label>
              <small className="password-guidance">Use at least 12 characters. A long, unique passphrase is recommended.</small>
              {error && <div className="form-error">{error}</div>}
              <button className="primary-button auth-submit" type="submit" disabled={saving}>{saving ? 'Updating Password...' : 'Update Password'}</button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
