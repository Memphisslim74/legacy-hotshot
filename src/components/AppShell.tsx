import { useState } from 'react'
import type { PropsWithChildren } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { BrandMark } from './BrandMark'
import { Icon } from './Icon'

type NavItem = { label: string; href: string; icon: Parameters<typeof Icon>[0]['name']; badge?: number }

const officeMainNav: NavItem[] = [
  { label: 'Command Center', href: '/', icon: 'dashboard' },
  { label: 'Loads', href: '/loads', icon: 'loads' },
  { label: 'New Load', href: '/loads/new', icon: 'plus' },
  { label: 'Quotes', href: '/quotes', icon: 'invoices' },
  { label: 'Customers', href: '/customers', icon: 'customers' },
  { label: 'Driver Portal', href: '/driver', icon: 'drivers' },
  { label: 'Drivers', href: '/drivers', icon: 'drivers' },
  { label: 'Vehicles', href: '/vehicles', icon: 'vehicles' },
  { label: 'Documents', href: '/documents', icon: 'documents' },
  { label: 'Communications', href: '/communications', icon: 'messages' },
]

const driverMainNav: NavItem[] = [
  { label: 'Driver Home', href: '/driver', icon: 'dashboard' },
  { label: 'Documents', href: '/documents', icon: 'documents' },
]

const businessNav: NavItem[] = [
  { label: 'Expenses', href: '/expenses', icon: 'expenses' },
  { label: 'Invoices', href: '/invoices', icon: 'invoices' },
  { label: 'Reports', href: '/reports', icon: 'reports' },
  { label: 'Company Settings', href: '/settings', icon: 'settings' },
]

const ownerNav: NavItem[] = [
  { label: 'User Management', href: '/users', icon: 'customers' },
]

const pageTitles: Record<string, { eyebrow: string; title: string }> = {
  '/': { eyebrow: 'Legacy Hotshot Operations', title: 'Command Center' },
  '/loads': { eyebrow: 'Operations', title: 'Loads' },
  '/loads/new': { eyebrow: 'Operations', title: 'New Load' },
  '/quotes': { eyebrow: 'Pricing', title: 'Quotes' },
  '/customers': { eyebrow: 'Relationships', title: 'Customers' },
  '/driver': { eyebrow: 'Mobile Operations', title: 'Driver Portal' },
  '/drivers': { eyebrow: 'Legacy Driver Network', title: 'Drivers' },
  '/vehicles': { eyebrow: 'Fleet', title: 'Vehicles & Trailers' },
  '/documents': { eyebrow: 'Records', title: 'Documents' },
  '/communications': { eyebrow: 'Customer Experience', title: 'Communications' },
  '/expenses': { eyebrow: 'Financials', title: 'Expenses' },
  '/invoices': { eyebrow: 'Financials', title: 'Invoices' },
  '/reports': { eyebrow: 'Performance', title: 'Reports' },
  '/settings': { eyebrow: 'Administration', title: 'Company Settings' },
  '/users': { eyebrow: 'Administration', title: 'User Management' },
}

function SidebarLink({ item, closeMenu }: { item: NavItem; closeMenu: () => void }) {
  return <NavLink to={item.href} onClick={closeMenu} className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}><Icon name={item.icon} size={19} /><span>{item.label}</span>{item.badge ? <small>{item.badge}</small> : null}</NavLink>
}

export function AppShell({ children }: PropsWithChildren) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isDriver = user?.role === 'driver'
  const mainNav = isDriver ? driverMainNav : officeMainNav
  const page = location.pathname.startsWith('/driver/loads/')
    ? { eyebrow: 'Assigned Shipment', title: 'Driver Load' }
    : location.pathname.startsWith('/loads/') && location.pathname !== '/loads/new'
      ? { eyebrow: 'Shipment Workspace', title: 'Load Detail' }
      : pageTitles[location.pathname] ?? { eyebrow: 'Legacy Hotshot', title: 'Command Center' }

  const handleSignOut = async () => { await signOut(); navigate('/login') }
  const accountName = user?.fullName || 'User'

  return (
    <div className={`app-shell ${isDriver ? 'app-shell--driver' : ''}`}>
      <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__brand"><BrandMark inverse /><button className="icon-button sidebar__close" onClick={() => setMenuOpen(false)} aria-label="Close navigation">×</button></div>
        <nav className="sidebar__nav" aria-label="Primary navigation">
          <div className="sidebar__section"><p className="sidebar__label">{isDriver ? 'DRIVER TOOLS' : 'OPERATIONS'}</p>{mainNav.map((item) => <SidebarLink key={item.href} item={item} closeMenu={() => setMenuOpen(false)} />)}</div>
          {!isDriver && <div className="sidebar__section"><p className="sidebar__label">BUSINESS</p>{businessNav.map((item) => <SidebarLink key={item.href} item={item} closeMenu={() => setMenuOpen(false)} />)}</div>}
          {user?.role === 'owner' && <div className="sidebar__section"><p className="sidebar__label">OWNER</p>{ownerNav.map((item) => <SidebarLink key={item.href} item={item} closeMenu={() => setMenuOpen(false)} />)}</div>}
        </nav>
        <div className="sidebar__profile"><div className="avatar">{accountName.charAt(0).toUpperCase()}</div><div><strong>{accountName}</strong><span>{user?.role === 'owner' ? 'Owner & Administrator' : user?.role}</span></div><button className="icon-button" onClick={handleSignOut} aria-label="Sign out"><Icon name="logout" size={18} /></button></div>
      </aside>

      {menuOpen && <button className="sidebar-scrim" onClick={() => setMenuOpen(false)} aria-label="Close menu" />}

      <main className="main-area">
        <header className="topbar"><div className="topbar__title"><button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Icon name="menu" /></button><div><span>{page.eyebrow}</span><h1>{page.title}</h1></div></div><div className="topbar__actions">{!isDriver && <label className="global-search"><Icon name="search" size={18} /><input placeholder="Search loads, customers, quotes..." aria-label="Global search" /><kbd>⌘ K</kbd></label>}<button className="icon-button notification-button" aria-label="Notifications"><Icon name="bell" /><span>4</span></button>{!isDriver && <button className="primary-button topbar__new-load" onClick={() => navigate('/loads/new')}><Icon name="plus" size={17} /> New Load</button>}</div></header>
        {user?.demo && <div className="demo-banner"><strong>Demo Preview</strong><span>You are viewing realistic sample operations. Connect Supabase and run all migrations to activate live data.</span></div>}
        <div className="page-content">{children}</div>
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">{mainNav.slice(0, 4).map((item) => <NavLink key={item.href} to={item.href} className={({ isActive }) => isActive ? 'active' : ''}><Icon name={item.icon} size={20} /><span>{item.label === 'Command Center' || item.label === 'Driver Home' ? 'Home' : item.label}</span></NavLink>)}<button onClick={() => setMenuOpen(true)}><Icon name="menu" size={20} /><span>More</span></button></nav>
    </div>
  )
}
