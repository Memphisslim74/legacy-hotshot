import { useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'

type PreviewKey = 'drivers' | 'vehicles' | 'communications' | 'expenses' | 'invoices' | 'reports'

type PreviewConfig = {
  title: string
  eyebrow: string
  description: string
  stage: string
}

const previews: Record<PreviewKey, PreviewConfig> = {
  drivers: { title: 'Driver Network', eyebrow: 'PEOPLE & COMPLIANCE', description: 'Availability, assignments, credentials, and operating readiness in one dispatch view.', stage: 'Stage 5' },
  vehicles: { title: 'Fleet & Equipment', eyebrow: 'ASSET CONTROL', description: 'Vehicle readiness, trailer assignments, maintenance, capacity, and document status.', stage: 'Stage 5' },
  communications: { title: 'Communication Center', eyebrow: 'LOAD UPDATES', description: 'Customer, broker, and driver messages organized by shipment and urgency.', stage: 'Stage 4' },
  expenses: { title: 'Expense Ledger', eyebrow: 'COST CONTROL', description: 'Fuel, tolls, repairs, permits, and receipts tied to the right load.', stage: 'Stage 5' },
  invoices: { title: 'Invoice Control', eyebrow: 'ACCOUNTS RECEIVABLE', description: 'Invoice preparation, delivery, aging, documents, and payment follow-up.', stage: 'Stage 5' },
  reports: { title: 'Operating Reports', eyebrow: 'BUSINESS INTELLIGENCE', description: 'Revenue, margin, utilization, deadhead, customer value, and cash flow.', stage: 'Stage 5' },
}

const sampleDrivers = [
  { name: 'Jared Guinn', initials: 'JG', status: 'On Load', location: 'Abilene, TX', load: 'LH-1028', equipment: 'Truck 01 · Trailer 40G', compliance: 'Current' },
  { name: 'Marcus Cole', initials: 'MC', status: 'Available', location: 'Midlothian, TX', load: 'Unassigned', equipment: 'Truck 02 · Trailer 35G', compliance: 'Medical card due in 42 days' },
  { name: 'Derek Vaughn', initials: 'DV', status: 'Off Duty', location: 'Fort Worth, TX', load: 'Returns tomorrow 06:00', equipment: 'No equipment assigned', compliance: 'Current' },
]

const sampleVehicles = [
  { unit: 'Truck 01', type: '2024 Ram 3500', assignment: 'Jared Guinn', status: 'Dispatched', odometer: '48,220 mi', service: 'Oil service in 1,780 mi' },
  { unit: 'Truck 02', type: '2023 Ford F-350', assignment: 'Marcus Cole', status: 'Ready', odometer: '61,804 mi', service: 'Inspection due Aug 18' },
  { unit: 'Trailer 40G', type: '40 ft Gooseneck', assignment: 'Truck 01', status: 'Dispatched', odometer: '—', service: 'Tires checked Jul 28' },
  { unit: 'Trailer 35G', type: '35 ft Gooseneck', assignment: 'Truck 02', status: 'Ready', odometer: '—', service: 'Deck repair scheduled Aug 6' },
]

const sampleMessages = [
  { time: '10:42 PM', subject: 'Delivery ETA updated', party: 'Titan Industrial · LH-1028', channel: 'Email + SMS', status: 'Sent', preview: 'Updated ETA is 8:15 AM. Driver is on schedule and no exceptions are reported.' },
  { time: '9:18 PM', subject: 'Pickup instructions received', party: 'High Plains Fabrication · LH-1029', channel: 'Email', status: 'Needs review', preview: 'Use the south equipment gate and call Dana 20 minutes before arrival.' },
  { time: '7:55 PM', subject: 'Missing dimensions requested', party: 'Red River Machinery · LHR-1004', channel: 'Email', status: 'Waiting', preview: 'Please send overall length, width, height, and confirmed weight before quoting.' },
]

const sampleExpenses = [
  { date: 'Jul 29', load: 'LH-1028', category: 'Fuel', vendor: 'Love’s Travel Stop', amount: '$286.41', receipt: 'Attached', status: 'Approved' },
  { date: 'Jul 29', load: 'LH-1028', category: 'Toll', vendor: 'NTTA', amount: '$18.22', receipt: 'Imported', status: 'Approved' },
  { date: 'Jul 28', load: 'Company', category: 'Repair', vendor: 'Frontier Fleet & Trailer', amount: '$642.00', receipt: 'Attached', status: 'Review' },
  { date: 'Jul 27', load: 'LH-1026', category: 'Permit', vendor: 'Texas DMV', amount: '$121.50', receipt: 'Attached', status: 'Approved' },
]

const sampleInvoices = [
  { invoice: 'LHI-1018', customer: 'Titan Industrial', load: 'LH-1026', amount: '$2,450', issued: 'Jul 25', due: 'Aug 24', status: 'Sent', age: '4 days' },
  { invoice: 'LHI-1017', customer: 'Frontier Site Services', load: 'LH-1025', amount: '$1,875', issued: 'Jul 18', due: 'Aug 17', status: 'Viewed', age: '11 days' },
  { invoice: 'LHI-1013', customer: 'Red River Machinery', load: 'LH-1021', amount: '$3,125', issued: 'Jun 24', due: 'Jul 24', status: 'Overdue', age: '35 days' },
]

function SampleBanner() {
  return <div className="sample-data-banner"><Icon name="alert" size={16} /><span><strong>Sample Data — Preview Only</strong> These records are not stored in Supabase and will be removed before launch.</span></div>
}

function DriversPreview() {
  return <section className="preview-register"><div className="preview-register__head"><span>Driver</span><span>Operating status</span><span>Current assignment</span><span>Equipment</span><span>Compliance</span></div>{sampleDrivers.map((driver) => <article key={driver.name}><div className="preview-person"><span>{driver.initials}</span><div><strong>{driver.name}</strong><small>{driver.location}</small></div></div><div><b className={`preview-status preview-status--${driver.status.toLowerCase().replaceAll(' ', '-')}`}>{driver.status}</b></div><div><strong>{driver.load}</strong><small>{driver.status === 'On Load' ? 'Delivery ETA 8:15 AM' : 'No active load'}</small></div><div><strong>{driver.equipment}</strong></div><div><strong>{driver.compliance}</strong><button>Open profile <Icon name="arrow" size={13} /></button></div></article>)}</section>
}

function VehiclesPreview() {
  return <section className="preview-fleet-grid">{sampleVehicles.map((vehicle) => <article key={vehicle.unit}><header><div><span>{vehicle.unit}</span><h3>{vehicle.type}</h3></div><b className={`preview-status preview-status--${vehicle.status.toLowerCase()}`}>{vehicle.status}</b></header><dl><div><dt>Assigned to</dt><dd>{vehicle.assignment}</dd></div><div><dt>Odometer</dt><dd>{vehicle.odometer}</dd></div><div><dt>Maintenance</dt><dd>{vehicle.service}</dd></div></dl><footer><button>Documents</button><button>Maintenance</button><button>Open asset <Icon name="arrow" size={13} /></button></footer></article>)}</section>
}

function CommunicationsPreview() {
  return <section className="preview-message-workspace"><aside><button className="active">All activity <strong>12</strong></button><button>Needs review <strong>2</strong></button><button>Waiting <strong>3</strong></button><button>Sent today <strong>7</strong></button></aside><div className="preview-message-list">{sampleMessages.map((message) => <article key={message.subject}><time>{message.time}</time><div><header><strong>{message.subject}</strong><b>{message.status}</b></header><span>{message.party} · {message.channel}</span><p>{message.preview}</p></div><button aria-label={`Open ${message.subject}`}><Icon name="arrow" size={15} /></button></article>)}</div></section>
}

function ExpensesPreview() {
  return <section className="preview-table"><table><thead><tr><th>Date</th><th>Load</th><th>Category</th><th>Vendor</th><th>Receipt</th><th>Status</th><th>Amount</th></tr></thead><tbody>{sampleExpenses.map((expense) => <tr key={`${expense.date}-${expense.vendor}`}><td>{expense.date}</td><td><strong>{expense.load}</strong></td><td>{expense.category}</td><td>{expense.vendor}</td><td>{expense.receipt}</td><td><b>{expense.status}</b></td><td><strong>{expense.amount}</strong></td></tr>)}</tbody></table><footer><span>4 sample transactions</span><strong>Total: $1,068.13</strong></footer></section>
}

function InvoicesPreview() {
  return <section className="preview-table"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Load</th><th>Issued</th><th>Due</th><th>Age</th><th>Status</th><th>Amount</th></tr></thead><tbody>{sampleInvoices.map((invoice) => <tr key={invoice.invoice}><td><strong>{invoice.invoice}</strong></td><td>{invoice.customer}</td><td>{invoice.load}</td><td>{invoice.issued}</td><td>{invoice.due}</td><td>{invoice.age}</td><td><b className={invoice.status === 'Overdue' ? 'preview-overdue' : ''}>{invoice.status}</b></td><td><strong>{invoice.amount}</strong></td></tr>)}</tbody></table><footer><span>Outstanding: $7,450</span><strong>Overdue: $3,125</strong></footer></section>
}

function ReportsPreview() {
  const bars = [{ label: 'Titan Industrial', value: 82, amount: '$18,420' }, { label: 'High Plains Fabrication', value: 63, amount: '$14,180' }, { label: 'Frontier Site Services', value: 47, amount: '$10,650' }, { label: 'Red River Machinery', value: 31, amount: '$6,925' }]
  return <div className="preview-reports"><section className="preview-kpis"><div><span>Revenue · 30 days</span><strong>$50,175</strong><small>↑ 12.4% from prior period</small></div><div><span>Gross margin</span><strong>31.8%</strong><small>Target 30%</small></div><div><span>Loaded miles</span><strong>7,842</strong><small>14.2% deadhead</small></div><div><span>Average days to pay</span><strong>24.6</strong><small>1 overdue invoice</small></div></section><section className="preview-report-grid"><article><header><div><span>REVENUE BY CUSTOMER</span><h3>Top relationships</h3></div><button>Last 30 days</button></header><div className="preview-bars">{bars.map((bar) => <div key={bar.label}><span>{bar.label}</span><i><b style={{ width: `${bar.value}%` }} /></i><strong>{bar.amount}</strong></div>)}</div></article><article><header><div><span>FLEET PERFORMANCE</span><h3>Operating efficiency</h3></div></header><dl><div><dt>Revenue per loaded mile</dt><dd>$3.42</dd></div><div><dt>Revenue per total mile</dt><dd>$2.93</dd></div><div><dt>On-time pickup</dt><dd>96%</dd></div><div><dt>On-time delivery</dt><dd>94%</dd></div><div><dt>Average load margin</dt><dd>$812</dd></div></dl></article></section></div>
}

export function PlaceholderPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const key = location.pathname.slice(1) as PreviewKey
  const page = previews[key] || previews.drivers

  return (
    <div className="preview-workspace">
      <section className="preview-workspace__heading"><div><span>{page.eyebrow}</span><h2>{page.title}</h2><p>{page.description}</p></div><div><small>{page.stage} preview</small><button onClick={() => navigate('/')}>Return to Dispatch</button></div></section>
      <SampleBanner />
      {key === 'drivers' && <DriversPreview />}
      {key === 'vehicles' && <VehiclesPreview />}
      {key === 'communications' && <CommunicationsPreview />}
      {key === 'expenses' && <ExpensesPreview />}
      {key === 'invoices' && <InvoicesPreview />}
      {key === 'reports' && <ReportsPreview />}
    </div>
  )
}
