import type { ActiveLoad, AttentionItem } from '../types'

export const dashboardMetrics = [
  { label: 'Active loads', value: '3', note: '1 delivering today', trend: 'neutral' },
  { label: 'Needs attention', value: '4', note: '2 time-sensitive', trend: 'warning' },
  { label: 'Open invoices', value: '$8,450', note: '$2,100 overdue', trend: 'warning' },
  { label: 'July revenue', value: '$31,780', note: '12 completed loads', trend: 'positive' },
]

export const attentionItems: AttentionItem[] = [
  {
    id: 'attn-1',
    severity: 'critical',
    title: 'Pickup window begins in 52 minutes',
    detail: 'LH-1028 · Titan Industrial · Fort Worth, TX',
    action: 'Open load',
    href: '/loads',
  },
  {
    id: 'attn-2',
    severity: 'warning',
    title: 'Customer update is overdue',
    detail: 'LH-1027 · Last update sent 3 hours ago',
    action: 'Send update',
    href: '/communications',
  },
  {
    id: 'attn-3',
    severity: 'warning',
    title: 'Proof of delivery is missing',
    detail: 'LH-1025 · Delivered yesterday at 4:18 PM',
    action: 'Request POD',
    href: '/documents',
  },
  {
    id: 'attn-4',
    severity: 'info',
    title: 'Invoice ready to send',
    detail: 'INV-10018 · $2,760 · Parker Equipment',
    action: 'Review invoice',
    href: '/invoices',
  },
]

export const activeLoads: ActiveLoad[] = [
  {
    id: 'load-1028',
    loadNumber: 'LH-1028',
    status: 'Booked',
    pickup: 'Fort Worth, TX',
    delivery: 'Midland, TX',
    appointment: 'Today · 8:00 PM',
    driver: 'Jared M.',
    eta: 'Pickup ETA 7:38 PM',
    progress: 10,
    customer: 'Titan Industrial',
  },
  {
    id: 'load-1027',
    loadNumber: 'LH-1027',
    status: 'In Transit',
    pickup: 'Tulsa, OK',
    delivery: 'Odessa, TX',
    appointment: 'Tomorrow · 9:30 AM',
    driver: 'Jared M.',
    eta: 'Delivery ETA 8:54 AM',
    progress: 68,
    customer: 'Redline Components',
  },
  {
    id: 'load-1026',
    loadNumber: 'LH-1026',
    status: 'En Route to Pickup',
    pickup: 'Waxahachie, TX',
    delivery: 'Shreveport, LA',
    appointment: 'Tomorrow · 3:00 PM',
    driver: 'Example Driver',
    eta: 'Pickup ETA 6:12 AM',
    progress: 28,
    customer: 'Parker Equipment',
  },
]

export const weeklySchedule = [
  { day: 'Thu', date: '30', pickups: 2, deliveries: 1 },
  { day: 'Fri', date: '31', pickups: 1, deliveries: 2 },
  { day: 'Sat', date: '01', pickups: 0, deliveries: 1 },
  { day: 'Sun', date: '02', pickups: 0, deliveries: 0 },
  { day: 'Mon', date: '03', pickups: 2, deliveries: 1 },
]
