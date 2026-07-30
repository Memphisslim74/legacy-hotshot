import { useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'

const descriptions: Record<string, { title: string; body: string; stage: string }> = {
  '/loads': { title: 'Load Management', body: 'Search, filter, assign, and follow every Legacy load from request through payment.', stage: 'Stage 2' },
  '/loads/new': { title: 'Create a New Load', body: 'Enter a load directly or convert an incoming customer request without duplicate work.', stage: 'Stage 2' },
  '/customers': { title: 'Customer Management', body: 'Keep contacts, billing preferences, frequent locations, terms, and load history together.', stage: 'Stage 2' },
  '/drivers': { title: 'Legacy Driver Network', body: 'Manage Jared today and onboard additional drivers when the business is ready to expand.', stage: 'Stage 5' },
  '/vehicles': { title: 'Vehicles & Trailers', body: 'Track assignments, documents, maintenance dates, capacities, and availability.', stage: 'Stage 5' },
  '/documents': { title: 'Document Center', body: 'Organize rate confirmations, BOLs, PODs, receipts, freight photos, and company records.', stage: 'Stage 2' },
  '/communications': { title: 'Communication Center', body: 'Send professional load checklists, ETAs, delay notices, pickup updates, and delivery confirmations.', stage: 'Stage 4' },
  '/expenses': { title: 'Expense Tracking', body: 'Capture fuel, tolls, permits, repairs, and receipts against the correct load.', stage: 'Stage 5' },
  '/invoices': { title: 'Invoices', body: 'Generate branded invoices, attach PODs, and follow payment status without losing paperwork.', stage: 'Stage 5' },
  '/reports': { title: 'Business Reports', body: 'Understand revenue, margin, deadhead, customer value, driver performance, and unpaid invoices.', stage: 'Stage 5' },
  '/settings': { title: 'Company Settings', body: 'Control Legacy branding, company details, default terms, notifications, and user access.', stage: 'Stage 1' },
}

export function PlaceholderPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const page = descriptions[location.pathname] ?? descriptions['/loads']

  return (
    <section className="placeholder-panel">
      <div className="placeholder-panel__icon"><Icon name="truck" size={34} /></div>
      <span className="eyebrow">{page.stage.toUpperCase()}</span>
      <h2>{page.title}</h2>
      <p>{page.body}</p>
      <div className="placeholder-panel__status"><Icon name="check" size={17} /><span>Navigation and responsive layout are ready. Functional workflows arrive in the scheduled build stage.</span></div>
      <button className="secondary-button" onClick={() => navigate('/')}>Return to Command Center</button>
    </section>
  )
}
