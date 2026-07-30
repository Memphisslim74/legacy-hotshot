import { useState } from 'react'
import type { PropsWithChildren } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { BrandMark } from './BrandMark'
import { Icon } from './Icon'

type NavItem = {
  label: string
  href: string
  icon: Parameters<typeof Icon>[0]['name']
  badge?: number
}

const mainNav: NavItem[] = [
  { label: 'Command Center', href: '/', icon: 'dashboard' },
  { label: 'Loads', href: '/loads', icon: 'loads', badge: 4 },
  { label: 'New Load', href: '/loads/new', icon: 'plus' },
  { label: 'Customers', href: '/customers', icon: 'customers' },
  { label: 'Drivers', href: '/drivers', icon: 'drivers' },
  { label: 'Vehicles', href: '/vehicles', icon: 'vehicles' },
  { label: 'Documents', href: '/documents', icon: 'documents', badge: 2 },
  { label: 'Communications', href: '/communications', icon: 'messages' },
]

const businessNav: NavItem[] = [
  { label: 'Expenses', href: '/expenses', icon: 'expenses' },
  { label: 'Invoices', href: '/invoices', icon: 'invoices', badge: 3 },
  { label: 'Reports', href: '/reports', icon: 'reports' },
  { label: 'Company Settings', href: '/settings', icon: 'settings' },
]

const pageTitles: Record<string, { eyebrow: string; title: string }> = {
  '/': { eyebrow: 'Wednesday, July 29', title: 'Command Center' },
  '/loads': { eyebrow: 'Operations', title: 'Loads' },
  '/loads/new': { eyebrow: 'Operations', title: 'New Load' },
  '/customers': { eyebrow: 'Relationships', title: 'Customers' },
  '/drivers': { eyebrow: 'Legacy Driver Network', title: 'Drivers' },
  '/vehicles': { eyebrow: 'Fleet', title: 'Vehicles & Trailers' },
  '/documents': { eyebrow: 'Records', title: 'Documents' },
  '/communications': { eyebrow: 'Customer Experience', title: 'Communications' },
  '/expenses': { eyebrow: 'Financials', title: 'Expenses' },
  '/invoices': { eyebrow: 'Financials', title: 'Invoices' },
  '/reports': { eyebrow: 'Performance', title: 'Reports' },
  '/settings': { eyebrow: 'Administration', title: 'Company Settings' },
}

function SidebarLink({ item, closeMenu }: { item: NavItem; closeMenu: () => void }) {
  return (
    <NavLink
      to={item.href}
      onClick={closeMenu}
      className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
    >
      <Icon name={item.icon} size={19} />
      <span>{item.label}</span>
      {item.badge ? <small>{item.badge}</small> : null}
    </NavLink>
  )
}

export function AppShell({ children }: PropsWithChildren) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const page = pageTitles[location.pathname] ?? { eyebrow: 'Legacy Hotshot', title: 'Command Center' }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <BrandMark inverse />
          <button className="icon-button sidebar__close" onClick={() => setMenuOpen(false)} aria-label="Close navigation">×</button>
        </div>

        <nav className="sidebar__nav" aria-label="Primary navigation">
          <div className="sidebar__section">
            <p className="sidebar__label">OPERATIONS</p>
            {mainNav.map((item) => <SidebarLink key={item.href} item={item} closeMenu={() => setMenuOpen(false)} />)}
          </div>
          <div className="sidebar__section">
            <p className="sidebar__label">BUSINESS</p>
            {businessNav.map((item) => <SidebarLink key={item.href} item={item} closeMenu={() => setMenuOpen(false)} />)}
          </div>
        </nav>

        <div className="sidebar__profile">
          <div className="avatar">{user?.fullName.charAt(0).toUpperCase() || 'J'}</div>
          <div>
            <strong>{user?.fullName || 'Jared'}</strong>
            <span>{user?.role === 'owner' ? 'Owner & Administrator' : user?.role}</span>
          </div>
          <button className="icon-button" onClick={handleSignOut} aria-label="Sign out"><Icon name="logout" size={18} /></button>
        </div>
      </aside>

      {menuOpen && <button className="sidebar-scrim" onClick={() => setMenuOpen(false)} aria-label="Close menu" />}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar__title">
            <button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Icon name="menu" /></button>
            <div>
              <span>{page.eyebrow}</span>
              <h1>{page.title}</h1>
            </div>
          </div>
          <div className="topbar__actions">
            <label className="global-search">
              <Icon name="search" size={18} />
              <input placeholder="Search loads, customers, invoices..." aria-label="Global search" />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-button notification-button" aria-label="Notifications">
              <Icon name="bell" />
              <span>4</span>
            </button>
            <button className="primary-button topbar__new-load" onClick={() => navigate('/loads/new')}>
              <Icon name="plus" size={17} /> New Load
            </button>
          </div>
        </header>

        {user?.demo && (
          <div className="demo-banner">
            <strong>Stage 1 Preview</strong>
            <span>You are viewing realistic sample data. Connect Supabase to activate production authentication.</span>
          </div>
        )}

        <div className="page-content">{children}</div>
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {mainNav.slice(0, 4).map((item) => (
          <NavLink key={item.href} to={item.href} className={({ isActive }) => isActive ? 'active' : ''}>
            <Icon name={item.icon} size={20} />
            <span>{item.label === 'Command Center' ? 'Home' : item.label}</span>
          </NavLink>
        ))}
        <button onClick={() => setMenuOpen(true)}><Icon name="menu" size={20} /><span>More</span></button>
      </nav>
    </div>
  )
}
