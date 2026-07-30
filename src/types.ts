export type UserRole = 'owner' | 'dispatcher' | 'driver' | 'finance'

export type AppUser = {
  id: string
  email: string
  fullName: string
  role: UserRole
  companyId: string | null
  setupComplete: boolean
  demo?: boolean
}

export type AttentionItem = {
  id: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  detail: string
  action: string
  href: string
}

export type ActiveLoad = {
  id: string
  loadNumber: string
  status: 'Booked' | 'En Route to Pickup' | 'In Transit' | 'Delivered'
  pickup: string
  delivery: string
  appointment: string
  driver: string
  eta: string
  progress: number
  customer: string
}
