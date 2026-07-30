import { useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { BrandMark } from './BrandMark'
import { Icon } from './Icon'

type NavItem = {
  label: string
  href: string
  icon: Parameters<typeof Icon>[0]['name']
  ownerOnly?: boolean
}

const officeRail: NavItem[] = [
  { label: 'Overview', href: '/', icon: 'dashboard' },
  { label: 'Dispatch', href: '/loads', icon: 'loads' },
  { label: 'Partners', href: '/customers', icon: 'customers' },
  { label: 'Fleet', href: '/drivers', icon: 'vehicles' },
  { label: 'Finance', href: '/invoices', icon: 'invoices' },
  { label: 'Admin', href: '/settings', icon: 'settings' },
]

const driverRail: NavItem[] = [
  { label: 'Home', href: '/driver', icon: 'dashboard' },
  { label: 'Documents', href: '/documents', icon: 'documents' },
]

const overviewTabs: NavItem[] = [
  { label: 'Operations Overview', href: '/', icon: 'dashboard' },
  { label: 'All Loads', href: '/loads', icon: 'loads' },
  { label: 'Quotes', href: '/quotes', icon: 'invoices' },
  { label: 'Clients & Vendors', href: '/customers', icon: 'customers' },
]

const dispatchTabs: NavItem[] = [
  { label: 'Load Board', href: '/loads', icon: 'loads' },
  { label: 'Create Load', href: '/loads/new', icon: 'plus' },
  { label: 'Quotes', href: '/quotes', icon: 'invoices' },
  { label: 'Clients & Vendors', href: '/customers', icon: 'customers' },
  { label: 'Communications', href: '/communications', icon: 'messages' },
]

const fleetTabs: NavItem[] = [
  { label: 'Drivers', href: '/drivers', icon: 'drivers' },
  { label: 'Vehicles & Trailers', href: '/vehicles', icon: 'vehicles' },
  { label: 'Driver Portal', href: '/driver', icon: 'dashboard' },
  { label: 'Documents', href: '/documents', icon: 'documents' },
]

const financeTabs: NavItem[] = [
  { label: 'Invoices', href: '/invoices', icon: 'invoices' },
  { label: 'Expenses', href: '/expenses', icon: 'expenses' },
  { label: 'Reports', href: '/reports', icon: 'reports' },
]

const adminTabs: NavItem[] = [
  { label: 'Company Settings', href: '/settings', icon: 'settings' },
  { label: 'User Management', href: '/users', icon: 'customers', ownerOnly: true },
  { label: 'Documents', href: '/documents', icon: 'documents' },
  { label: 'Communications', href: '/communications', icon: 'messages' },
]

const driverTabs: NavItem[] = [
  { label: 'Assigned Loads', href: '/driver', icon: 'loads' },
  { label: 'Documents', href: '/documents', icon: 'documents' },
]

const pageTitles: Record<string, { eyebrow: string; title: string }> = {
  '/': { eyebrow: 'Live operations', title: 'Dispatch Overview' },
  '/loads': { eyebrow: 'Dispatch', title: 'Load Board' },
  '/loads/new': { eyebrow: 'Dispatch', title: 'Create Load' },
  '/quotes': { eyebrow: 'Commercial', title: 'Quotes' },
  '/customers': { eyebrow: 'Business network', title: 'Clients & Vendors' },
  '/driver': { eyebrow: 'Mobile operations', title: 'Driver Portal' },
  '/drivers': { eyebrow: 'Fleet operations', title: 'Drivers' },
  '/vehicles': { eyebrow: 'Fleet operations', title: 'Vehicles & Trailers' },
  '/documents': { eyebrow: 'Records', title: 'Documents' },
  '/communications': { eyebrow: 'Customer experience', title: 'Communications' },
  '/expenses': { eyebrow: 'Financial operations', title: 'Expenses' },
  '/invoices': { eyebrow: 'Financial operations', title: 'Invoices' },
  '/reports': { eyebrow: 'Business intelligence', title: 'Reports' },
  '/settings': { eyebrow: 'Administration', title: 'Company Settings' },
  '/users': { eyebrow: 'Administration', title: 'User Management' },
}

function RailLink({ item, closeMenu }: { item: NavItem; closeMenu: () => void }) {
  return (
    <NavLink
      to={item.href}
      end={item.href === '/'}
      onClick={closeMenu}
      className={({ isActive }) => `ops-rail-link ${isActive ? 'ops-rail-link--active' : ''}`}
      title={item.label}
    >
      <Icon name={item.icon} size={20} />
      <span>{item.label}</span>
    </NavLink>
  )
}

function WorkspaceTab({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.href}
      end={item.href === '/' || item.href === '/loads' || item.href === '/driver'}
      className={({ isActive }) => `workspace-tab ${isActive ? 'workspace-tab--active' : ''}`}
    >
      <Icon name={item.icon} size={15} />
      <span>{item.label}</span>
    </NavLink>
  )
}

export function AppShell({ children }: PropsWithChildren) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isDriver = user?.role === 'driver'
  const accountName = user?.fullName || 'User'

  const page = location.pathname.startsWith('/driver/loads/')
    ? { eyebrow: 'Assigned shipment', title: 'Driver Load' }
    : location.pathname.startsWith('/loads/') && location.pathname !== '/loads/new'
      ? { eyebrow: 'Shipment workspace', title: 'Load Detail' }
      : pageTitles[location.pathname] ?? { eyebrow: 'Legacy Hotshot', title: 'Operations' }

  const tabs = useMemo(() => {
    if (isDriver) return driverTabs
    if (location.pathname === '/') return overviewTabs
    if (location.pathname.startsWith('/loads') || ['/quotes', '/customers', '/communications'].includes(location.pathname)) return dispatchTabs
    if (['/drivers', '/vehicles', '/driver', '/documents'].includes(location.pathname) || location.pathname.startsWith('/driver/loads/')) return fleetTabs
    if (['/invoices', '/expenses', '/reports'].includes(location.pathname)) return financeTabs
    return adminTabs
  }, [isDriver, location.pathname])

  const visibleTabs = tabs.filter((item) => !item.ownerOnly || user?.role === 'owner')
  const rail = isDriver ? driverRail : officeRail

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const todayLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date())

  return (
    <div className={`legacy-ops-shell ${isDriver ? 'legacy-ops-shell--driver' : ''}`}>
      <header className="ops-commandbar">
        <div className="ops-commandbar__brand">
          <button className="ops-mobile-trigger" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Icon name="menu" size={20} /></button>
          <BrandMark />
        </div>

        {!isDriver && (
          <label className="ops-command-search">
            <Icon name="search" size={17} />
            <input placeholder="Search loads, companies, drivers..." aria-label="Global search" />
            <kbd>⌘ K</kbd>
          </label>
        )}

        <div className="ops-commandbar__actions">
          <span className="ops-date">{todayLabel}</span>
          {!isDriver && <button className="ops-create-load" onClick={() => navigate('/loads/new')}><Icon name="plus" size={16} /> Create Load</button>}
          <button className="ops-icon-action" aria-label="Notifications"><Icon name="bell" size={18} /><span>4</span></button>
          <button className="ops-account" onClick={() => navigate('/settings')}>
            <span className="ops-account__avatar">{accountName.charAt(0).toUpperCase()}</span>
            <span className="ops-account__copy"><strong>{accountName}</strong><small>{user?.role === 'owner' ? 'Owner' : user?.role}</small></span>
          </button>
        </div>
      </header>

      <aside className={`ops-rail ${menuOpen ? 'ops-rail--open' : ''}`}>
        <div className="ops-rail__mobile-head"><strong>Navigation</strong><button onClick={() => setMenuOpen(false)} aria-label="Close navigation">×</button></div>
        <nav className="ops-rail__nav" aria-label="Primary navigation">
          {rail.map((item) => <RailLink key={item.href} item={item} closeMenu={() => setMenuOpen(false)} />)}
        </nav>
        <button className="ops-rail__signout" onClick={handleSignOut} title="Sign out"><Icon name="logout" size={19} /><span>Sign out</span></button>
      </aside>

      {menuOpen && <button className="ops-rail-scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}

      <main className="ops-workspace">
        <section className="workspace-heading">
          <div className="workspace-heading__copy">
            <span>{page.eyebrow}</span>
            <div><h1>{page.title}</h1>{!isDriver && <small className="workspace-live-indicator"><i /> Operational</small>}</div>
          </div>
        </section>

        <nav className="workspace-tabs" aria-label="Section navigation">
          {visibleTabs.map((item) => <WorkspaceTab key={item.href} item={item} />)}
        </nav>

        {user?.demo && <div className="ops-demo-banner"><strong>Demo Preview</strong><span>Sample operating data is displayed.</span></div>}
        <div className="ops-workspace__body">{children}</div>
      </main>

      <nav className="ops-mobile-nav" aria-label="Mobile navigation">
        {rail.slice(0, 4).map((item) => <RailLink key={item.href} item={item} closeMenu={() => setMenuOpen(false)} />)}
        <button onClick={() => setMenuOpen(true)}><Icon name="menu" size={20} /><span>More</span></button>
      </nav>
    </div>
  )
}
