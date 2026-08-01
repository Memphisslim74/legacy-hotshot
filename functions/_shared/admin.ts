import { createClient } from '@supabase/supabase-js'

export interface AdminEnv {
  SUPABASE_URL?: string
  SUPABASE_SECRET_KEY?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  APP_URL?: string
  RESEND_API_KEY?: string
  RESEND_FROM_EMAIL?: string
  RESEND_FROM_NAME?: string
  QUOTE_APPROVAL_NOTIFY_EMAIL?: string
  OPENROUTESERVICE_API_KEY?: string
}

type ProfileRow = {
  id: string
  company_id: string | null
  full_name: string | null
  role: 'owner' | 'dispatcher' | 'driver' | 'finance'
  phone: string | null
  setup_complete: boolean
  is_active: boolean
  created_at: string
}

export function createAdminClient(env: AdminEnv) {
  const url = env.SUPABASE_URL
  const secret = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !secret) throw new Error('Supabase server credentials are not configured.')

  return createClient(url, secret, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}

export function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}

export async function requireOwner(request: Request, env: AdminEnv) {
  const authorization = request.headers.get('Authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  if (!token) throw new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401 })

  const admin = createAdminClient(env)
  const { data: authData, error: authError } = await admin.auth.getUser(token)
  if (authError || !authData.user) {
    throw new Response(JSON.stringify({ error: 'Your session is invalid or expired.' }), { status: 401 })
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, company_id, full_name, role, phone, setup_complete, is_active, created_at')
    .eq('id', authData.user.id)
    .single<ProfileRow>()

  if (profileError || !profile || !profile.is_active) {
    throw new Response(JSON.stringify({ error: 'Your user profile is inactive or unavailable.' }), { status: 403 })
  }
  if (profile.role !== 'owner' || !profile.company_id) {
    throw new Response(JSON.stringify({ error: 'Only an owner can manage user accounts.' }), { status: 403 })
  }

  return { admin, authUser: authData.user, profile }
}

export async function requireCompanyUser(request: Request, env: AdminEnv) {
  const authorization = request.headers.get('Authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  if (!token) throw new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401 })

  const admin = createAdminClient(env)
  const { data: authData, error: authError } = await admin.auth.getUser(token)
  if (authError || !authData.user) throw new Response(JSON.stringify({ error: 'Your session is invalid or expired.' }), { status: 401 })

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, company_id, full_name, role, phone, setup_complete, is_active, created_at')
    .eq('id', authData.user.id)
    .single<ProfileRow>()

  if (profileError || !profile || !profile.is_active || !profile.company_id) {
    throw new Response(JSON.stringify({ error: 'Your company profile is inactive or unavailable.' }), { status: 403 })
  }

  return { admin, authUser: authData.user, profile }
}

export async function getCompanyProfile(admin: ReturnType<typeof createAdminClient>, companyId: string, userId: string) {
  const { data, error } = await admin
    .from('profiles')
    .select('id, company_id, full_name, role, phone, setup_complete, is_active, created_at')
    .eq('id', userId)
    .eq('company_id', companyId)
    .single<ProfileRow>()

  if (error || !data) throw new Response(JSON.stringify({ error: 'User not found in this company.' }), { status: 404 })
  return data
}

export async function writeAuditLog(values: {
  admin: ReturnType<typeof createAdminClient>
  companyId: string
  actorId: string
  action: string
  entityId: string
  changes?: Record<string, unknown>
}) {
  await values.admin.from('audit_logs').insert({
    company_id: values.companyId,
    actor_id: values.actorId,
    action: values.action,
    entity_type: 'profile',
    entity_id: values.entityId,
    changes: values.changes || {},
  })
}

export function responseFromError(error: unknown) {
  if (error instanceof Response) return error
  console.error(error)
  return jsonResponse({ error: error instanceof Error ? error.message : 'Unexpected server error.' }, 500)
}
