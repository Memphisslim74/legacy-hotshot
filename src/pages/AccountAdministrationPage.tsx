import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/Icon'
import { listManagedUsers, sendManagedUserPasswordReset, setManagedUserPassword, updateManagedUser } from '../lib/userManagement'
import type { ManagedUser } from '../lib/userManagement'
import type { UserRole } from '../types'

const roleLabels: Record<UserRole, string> = {
  owner: 'Owner', dispatcher: 'Dispatcher / Admin', driver: 'Driver', finance: 'Finance',
}

const sampleUsers: ManagedUser[] = [
  { id: 'sample-owner', email: 'legacyhsoffice@gmail.com', fullName: 'Jared Guinn', role: 'owner', phone: '(972) 555-0188', isActive: true, setupComplete: true, createdAt: new Date(Date.now() - 90 * 86400000).toISOString(), lastSignInAt: new Date(Date.now() - 30 * 60000).toISOString(), emailConfirmedAt: new Date(Date.now() - 90 * 86400000).toISOString() },
  { id: 'sample-admin', email: 'steve@arsenalmediaco.com', fullName: 'Steve Smith', role: 'owner', phone: '', isActive: true, setupComplete: true, createdAt: new Date(Date.now() - 30 * 86400000).toISOString(), lastSignInAt: new Date(Date.now() - 2 * 3600000).toISOString(), emailConfirmedAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'sample-dispatcher', email: 'dispatch@legacyhotshot.com', fullName: 'Taylor Brooks', role: 'dispatcher', phone: '(469) 555-0142', isActive: true, setupComplete: true, createdAt: new Date(Date.now() - 21 * 86400000).toISOString(), lastSignInAt: new Date(Date.now() - 6 * 3600000).toISOString(), emailConfirmedAt: new Date(Date.now() - 21 * 86400000).toISOString() },
  { id: 'sample-driver', email: 'driver@legacyhotshot.com', fullName: 'Marcus Cole', role: 'driver', phone: '(817) 555-0164', isActive: true, setupComplete: true, createdAt: new Date(Date.now() - 14 * 86400000).toISOString(), lastSignInAt: null, emailConfirmedAt: new Date(Date.now() - 14 * 86400000).toISOString() },
]

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

export function AccountAdministrationPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>('driver')
  const [isActive, setIsActive] = useState(true)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingPassword, setSettingPassword] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [showingSampleData, setShowingSampleData] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const loadUsers = async () => {
      try {
        const rows = user?.demo ? sampleUsers : await listManagedUsers()
        if (!active) return
        const resolved = rows.length ? rows : sampleUsers
        setUsers(resolved)
        setSelectedId(resolved[0]?.id || '')
        setShowingSampleData(rows.length === 0 || Boolean(user?.demo))
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
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return users.filter((account) => {
      const matchesSearch = !query || [account.fullName, account.email, account.phone, roleLabels[account.role]].some((value) => value.toLowerCase().includes(query))
      return matchesSearch && (roleFilter === 'all' || account.role === roleFilter)
    })
  }, [users, search, roleFilter])

  const summary = useMemo(() => ({
    all: users.length,
    owners: users.filter((item) => item.role === 'owner').length,
    drivers: users.filter((item) => item.role === 'driver').length,
    inactive: users.filter((item) => !item.isActive).length,
  }), [users])

  useEffect(() => {
    if (!selected) return
    setFullName(selected.fullName)
    setEmail(selected.email)
    setPhone(selected.phone)
    setRole(selected.role)
    setIsActive(selected.isActive)
    setNewPassword('')
    setConfirmPassword('')
    setShowPasswords(false)
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
      const sampleAccount = selected.id.startsWith('sample-')
      const updated = showingSampleData || sampleAccount || user?.demo
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

  const setPassword = async () => {
    if (!selected) return
    setMessage('')
    setError('')
    if (newPassword.length < 12) return setError('Use at least 12 characters for the password.')
    if (newPassword !== confirmPassword) return setError('The two password entries do not match.')
    setSettingPassword(true)
    try {
      const result = showingSampleData || selected.id.startsWith('sample-') || user?.demo
        ? { message: `Sample password updated locally for ${selected.email}.` }
        : await setManagedUserPassword(selected.id, newPassword)
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswords(false)
      setMessage(result.message)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to set the new password.')
    } finally {
      setSettingPassword(false)
    }
  }

  const sendReset = async () => {
    if (!selected) return
    setResetting(true)
    setMessage('')
    setError('')
    try {
      const result = showingSampleData || selected.id.startsWith('sample-') || user?.demo
        ? { message: `Sample branded password reset prepared for ${selected.email}.` }
        : await sendManagedUserPasswordReset(selected.id)
      setMessage(result.message)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to send the branded password reset email.')
    } finally {
      setResetting(false)
    }
  }

  if (loading) return <div className="account-admin__empty">Loading user accounts...</div>

  return (
    <div className="account-admin">
      <section className="account-admin__head">
        <div><span>OWNER ADMINISTRATION</span><h2>User Management</h2><p>Control identity, role, access, and password security for every Legacy Hotshot account.</p></div>
        <div className="account-admin__summary"><div><span>Users</span><strong>{summary.all}</strong></div><div><span>Owners</span><strong>{summary.owners}</strong></div><div><span>Drivers</span><strong>{summary.drivers}</strong></div><div><span>Inactive</span><strong>{summary.inactive}</strong></div></div>
      </section>

      {message && <div className="form-success operations-alert">{message}</div>}
      {error && <div className="form-error operations-alert">{error}</div>}
      {showingSampleData && <div className="sample-data-banner"><Icon name="alert" size={16} /><span><strong>Sample Data — Preview Only</strong> These example accounts are not stored in Supabase. Security actions remain local.</span></div>}

      <section className="account-admin__workspace">
        <aside className="account-admin__directory">
          <header><div><span>ACCOUNT REGISTER</span><strong>{filteredUsers.length} shown</strong></div><label><Icon name="search" size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users" /></label><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as 'all' | UserRole)}><option value="all">All roles</option><option value="owner">Owners</option><option value="dispatcher">Dispatchers</option><option value="driver">Drivers</option><option value="finance">Finance</option></select></header>
          <div>{filteredUsers.map((account) => <button className={selectedId === account.id ? 'active' : ''} key={account.id} onClick={() => setSelectedId(account.id)}><span className="account-admin__avatar">{initials(account.fullName)}</span><span><strong>{account.fullName}</strong><small>{account.email}</small><i>{roleLabels[account.role]}</i></span><b className={account.isActive ? 'active' : 'inactive'}>{account.isActive ? 'Active' : 'Inactive'}</b></button>)}</div>
        </aside>

        <main className="account-admin__editor">
          {!selected ? <div className="account-admin__empty">Select an account to manage.</div> : <form onSubmit={saveUser}>
            <header><div><span>ACCOUNT RECORD</span><h3>{selected.fullName}</h3><p>{selected.email}</p></div><b>{roleLabels[selected.role]}</b></header>

            <section className="account-admin__section"><div className="account-admin__section-head"><div><span>IDENTITY & ACCESS</span><h4>Profile and permissions</h4></div><small>Changes apply immediately after saving.</small></div><div className="account-admin__form"><label>Full name<input value={fullName} onChange={(event) => setFullName(event.target.value)} required /></label><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Phone number<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Optional" /></label><label>Role<select value={role} onChange={(event) => setRole(event.target.value as UserRole)}><option value="owner">Owner</option><option value="dispatcher">Dispatcher / Admin</option><option value="driver">Driver</option><option value="finance">Finance</option></select></label><label className="account-admin__toggle"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /><span><strong>Account is active</strong><small>Inactive users cannot sign in or access company data.</small></span></label></div></section>

            <section className="account-admin__metadata"><div><span>Email status</span><strong>{selected.emailConfirmedAt ? 'Confirmed' : 'Not confirmed'}</strong></div><div><span>Last sign-in</span><strong>{selected.lastSignInAt ? new Date(selected.lastSignInAt).toLocaleString() : 'Never'}</strong></div><div><span>Account created</span><strong>{new Date(selected.createdAt).toLocaleDateString()}</strong></div><div><span>Setup</span><strong>{selected.setupComplete ? 'Complete' : 'Pending'}</strong></div></section>

            <section className="account-admin__section account-admin__security"><div className="account-admin__section-head"><div><span>PASSWORD SECURITY</span><h4>Set or reset password</h4></div><button type="button" onClick={() => setShowPasswords((current) => !current)}>{showPasswords ? 'Hide passwords' : 'Show passwords'}</button></div><div className="account-admin__passwords"><label>New password<input type={showPasswords ? 'text' : 'password'} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={12} autoComplete="new-password" placeholder="At least 12 characters" /></label><label>Confirm password<input type={showPasswords ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={12} autoComplete="new-password" placeholder="Enter it again" /></label></div><div className="account-admin__security-actions"><button type="button" onClick={sendReset} disabled={resetting || !selected.isActive}><Icon name="messages" size={16} />{resetting ? 'Sending...' : 'Send Branded Reset'}</button><button type="button" onClick={setPassword} disabled={settingPassword || !selected.isActive || !newPassword || !confirmPassword}>{settingPassword ? 'Setting Password...' : 'Set Password Manually'}</button></div><p>Manual assignment changes the password immediately. The branded reset email lets the user choose their own password through a secure Legacy Hotshot link.</p></section>

            <footer><span>Only owners can manage account access and password security.</span><button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save User'}</button></footer>
          </form>}
        </main>
      </section>
    </div>
  )
}
