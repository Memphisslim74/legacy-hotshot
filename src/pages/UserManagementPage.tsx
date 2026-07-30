import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import {
  listManagedUsers,
  sendManagedUserPasswordReset,
  updateManagedUser,
} from '../lib/userManagement'
import type { ManagedUser } from '../lib/userManagement'
import type { UserRole } from '../types'

const roleLabels: Record<UserRole, string> = {
  owner: 'Owner',
  dispatcher: 'Dispatcher / Admin',
  driver: 'Driver',
  finance: 'Finance',
}

const demoUsers: ManagedUser[] = [
  {
    id: 'demo-owner',
    email: 'legacyhsoffice@gmail.com',
    fullName: 'Jared Guinn',
    role: 'owner',
    phone: '',
    isActive: true,
    setupComplete: true,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    lastSignInAt: new Date().toISOString(),
    emailConfirmedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'demo-admin',
    email: 'steve@arsenalmediaco.com',
    fullName: 'Steve Smith',
    role: 'owner',
    phone: '',
    isActive: true,
    setupComplete: true,
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    lastSignInAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    emailConfirmedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: 'demo-driver',
    email: 'driver@example.com',
    fullName: 'Example Driver',
    role: 'driver',
    phone: '(555) 555-0172',
    isActive: true,
    setupComplete: true,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    lastSignInAt: null,
    emailConfirmedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
]

export function UserManagementPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>('driver')
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const loadUsers = async () => {
      try {
        const rows = user?.demo ? demoUsers : await listManagedUsers()
        if (!active) return
        setUsers(rows)
        setSelectedId(rows[0]?.id || '')
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load users.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadUsers()
    return () => { active = false }
  }, [user?.demo])

  const selected = useMemo(() => users.find((item) => item.id === selectedId) || null, [users, selectedId])

  useEffect(() => {
    if (!selected) return
    setFullName(selected.fullName)
    setEmail(selected.email)
    setPhone(selected.phone)
    setRole(selected.role)
    setIsActive(selected.isActive)
    setMessage('')
    setError('')
  }, [selected])

  const saveUser = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const updated = user?.demo
        ? { ...selected, fullName, email, phone, role, isActive }
        : await updateManagedUser({ id: selected.id, fullName, email, phone, role, isActive })
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item))
      setMessage(`${updated.fullName}'s account was updated.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update this user.')
    } finally {
      setSaving(false)
    }
  }

  const sendReset = async () => {
    if (!selected) return
    setResetting(true)
    setMessage('')
    setError('')
    try {
      const result = user?.demo
        ? { message: `Demo password reset email prepared for ${selected.email}.` }
        : await sendManagedUserPasswordReset(selected.id)
      setMessage(result.message)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to send the password reset email.')
    } finally {
      setResetting(false)
    }
  }

  if (loading) return <div className="panel empty-state">Loading user accounts...</div>

  return (
    <div className="user-management-page">
      <section className="settings-hero">
        <div><span className="eyebrow">OWNER ACCESS</span><h2>User Management</h2><p>Edit names, email addresses, phone numbers, roles, and account access. Passwords are never displayed or shared.</p></div>
        <div className="settings-access-note"><Icon name="alert" size={18} /><span>Only Legacy Hotshot owners can manage user accounts or send password-reset emails.</span></div>
      </section>

      {message && <div className="form-success operations-alert">{message}</div>}
      {error && <div className="form-error operations-alert">{error}</div>}

      <section className="user-management-grid">
        <article className="panel user-list-panel">
          <div className="panel__header panel__header--bordered"><div><span className="panel__eyebrow">ACCOUNTS</span><h3>{users.length} Users</h3></div></div>
          <div className="user-account-list">
            {users.map((account) => (
              <button key={account.id} className={selectedId === account.id ? 'active' : ''} onClick={() => setSelectedId(account.id)}>
                <span className="avatar">{account.fullName.charAt(0).toUpperCase()}</span>
                <span><strong>{account.fullName}</strong><small>{account.email}</small></span>
                <span className={`user-status ${account.isActive ? 'user-status--active' : 'user-status--inactive'}`}>{account.isActive ? 'Active' : 'Inactive'}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="panel user-editor-panel">
          {!selected ? <div className="empty-state">Select a user to edit.</div> : (
            <form onSubmit={saveUser}>
              <div className="panel__header panel__header--bordered"><div><span className="panel__eyebrow">EDIT ACCOUNT</span><h3>{selected.fullName}</h3></div><span className="role-badge">{roleLabels[selected.role]}</span></div>
              <div className="form-grid user-form-grid">
                <label>Full name<input value={fullName} onChange={(event) => setFullName(event.target.value)} required /></label>
                <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
                <label>Phone number <span>Optional</span><input value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
                <label>Role<select value={role} onChange={(event) => setRole(event.target.value as UserRole)}><option value="owner">Owner</option><option value="dispatcher">Dispatcher / Admin</option><option value="driver">Driver</option><option value="finance">Finance</option></select></label>
                <label className="user-active-toggle form-grid__full"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /><span><strong>Account is active</strong><small>Inactive users cannot sign in or access Legacy Hotshot data.</small></span></label>
              </div>

              <div className="user-account-metadata">
                <div><span>Email</span><strong>{selected.emailConfirmedAt ? 'Confirmed' : 'Not confirmed'}</strong></div>
                <div><span>Last sign-in</span><strong>{selected.lastSignInAt ? new Date(selected.lastSignInAt).toLocaleString() : 'Never'}</strong></div>
                <div><span>Account created</span><strong>{new Date(selected.createdAt).toLocaleDateString()}</strong></div>
              </div>

              <div className="user-editor-actions">
                <button className="secondary-button" type="button" onClick={sendReset} disabled={resetting || !selected.isActive}><Icon name="messages" size={17} />{resetting ? 'Sending...' : 'Send Password Reset'}</button>
                <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save User'}</button>
              </div>
              <p className="user-reset-note">The reset button emails a secure link. The owner never sees or chooses the user’s new password.</p>
            </form>
          )}
        </article>
      </section>
    </div>
  )
}
