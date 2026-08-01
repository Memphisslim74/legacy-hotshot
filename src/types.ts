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

export type CompanySetupInput = {
  companyName: string
  ownerName: string
  companyEmail: string
  companyPhone: string
  businessAddress: string
  serviceArea: string
  mcNumber: string
  usdotNumber: string
  invoiceTerms: string
  detentionPolicy: string
  communicationPreference: string
  emailSignature: string
  primaryColor: string
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

export type BusinessRelationshipType =
  | 'customer'
  | 'broker'
  | 'shipper'
  | 'receiver'
  | 'vendor'
  | 'repair_shop'
  | 'fuel_partner'
  | 'insurance_partner'
  | 'other'

export type BusinessContact = {
  id: string
  customer_id: string
  full_name: string
  title: string | null
  department: string | null
  email: string | null
  phone: string | null
  contact_role: string
  is_primary: boolean
  is_active: boolean
  notes: string | null
  created_at: string
}

export type Customer = {
  id: string
  company_name: string
  primary_contact: string | null
  email: string | null
  phone: string | null
  billing_contact: string | null
  billing_email: string | null
  billing_address: string | null
  payment_terms: string
  communication_preference: string
  notes: string | null
  relationship_types: BusinessRelationshipType[]
  relationship_status: 'active' | 'inactive' | 'on_hold'
  preferred_partner: boolean
  website_url: string | null
  address_line_1: string | null
  address_line_2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  vendor_category: string | null
  account_number: string | null
  last_activity_at: string | null
  created_at: string
  updated_at?: string
  business_contacts?: BusinessContact[]
}

export type LoadStatus =
  | 'request_received' | 'reviewing' | 'quoted' | 'booked' | 'driver_assigned'
  | 'en_route_to_pickup' | 'arrived_at_pickup' | 'loaded' | 'in_transit'
  | 'delayed' | 'arrived_at_delivery' | 'delivered' | 'pod_received'
  | 'invoice_sent' | 'paid' | 'cancelled'

export type TrackingVisibility = 'exact' | 'approximate' | 'city_state' | 'milestones_only'

export type LoadRecord = {
  id: string
  load_number: string
  customer_id: string | null
  assigned_driver_id: string | null
  status: LoadStatus
  pickup_company: string | null
  pickup_address: string
  pickup_city: string
  pickup_state: string
  pickup_contact: string | null
  pickup_phone: string | null
  pickup_at: string | null
  pickup_instructions: string | null
  delivery_company: string | null
  delivery_address: string
  delivery_city: string
  delivery_state: string
  delivery_contact: string | null
  delivery_phone: string | null
  delivery_at: string | null
  delivery_instructions: string | null
  freight_description: string
  pieces: number | null
  estimated_weight: number | null
  dimensions: string | null
  equipment_requirements: string | null
  securement_requirements: string | null
  customer_rate: number
  driver_pay: number
  estimated_fuel: number
  additional_expenses: number
  loaded_miles: number
  deadhead_miles: number
  route_distance_meters?: number | null
  route_duration_seconds?: number | null
  route_calculated_at?: string | null
  route_provider?: string | null
  current_eta: string | null
  tracking_token: string
  tracking_visibility: TrackingVisibility
  driver_location_sharing_allowed: boolean
  location_last_updated_at: string | null
  location_last_latitude: number | null
  location_last_longitude: number | null
  location_accuracy_meters: number | null
  created_at: string
  customers?: { company_name: string } | null
  assigned_driver?: { full_name: string | null } | null
}

export type LoadRequestRecord = {
  id: string
  request_number: string
  requester_company: string | null
  requester_name: string
  requester_email: string
  requester_phone: string | null
  pickup_city: string
  pickup_state: string
  pickup_date: string | null
  delivery_city: string
  delivery_state: string
  delivery_date: string | null
  freight_description: string
  estimated_weight: number | null
  dimensions: string | null
  status: 'received' | 'reviewing' | 'quoted' | 'converted' | 'declined' | 'cancelled'
  missing_fields: string[]
  created_at: string
}

export type LoadRequestInput = {
  requesterCompany: string
  requesterName: string
  requesterEmail: string
  requesterPhone: string
  pickupCompany: string
  pickupAddress: string
  pickupCity: string
  pickupState: string
  pickupPostalCode: string
  pickupContact: string
  pickupPhone: string
  pickupDate: string
  pickupTimeWindow: string
  pickupMethod: string
  pickupInstructions: string
  deliveryCompany: string
  deliveryAddress: string
  deliveryCity: string
  deliveryState: string
  deliveryPostalCode: string
  deliveryContact: string
  deliveryPhone: string
  deliveryDate: string
  deliveryTimeWindow: string
  unloadingMethod: string
  deliveryInstructions: string
  freightDescription: string
  pieces: string
  estimatedWeight: string
  dimensions: string
  equipmentRequirements: string
  tarpingRequirements: string
  securementRequirements: string
  declaredValue: string
  referenceNumber: string
  additionalInstructions: string
}

export type DocumentRecord = {
  id: string
  type: string
  file_name: string
  storage_path: string
  customer_visible: boolean
  created_at: string
  loads?: { load_number: string } | null
  customers?: { company_name: string } | null
}

export type DriverChecklistPhase = 'pickup' | 'delivery'

export type DriverChecklistItem = {
  id: string
  load_id: string
  phase: DriverChecklistPhase
  item_key: string
  label: string
  required: boolean
  sort_order: number
  completed_at: string | null
  completed_by: string | null
  notes: string | null
}

export type DriverTimeEventType =
  | 'started_work'
  | 'en_route_to_pickup'
  | 'arrived_at_pickup'
  | 'departed_pickup'
  | 'fuel_stop'
  | 'break'
  | 'arrived_at_delivery'
  | 'departed_delivery'
  | 'finished_work'

export type DriverTimeEvent = {
  id: string
  load_id: string
  event_type: DriverTimeEventType
  occurred_at: string
  latitude: number | null
  longitude: number | null
  notes: string | null
}
