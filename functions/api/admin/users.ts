import type { AdminUserAttributes } from '@supabase/supabase-js'
import { getCompanyProfile, jsonResponse, requireOwner, responseFromError, writeAuditLog } from '../../_shared/admin'
import type { AdminEnv } from '../../_shared/admin'

type Context = { request: Request; env: AdminEnv }
type UserRole = 'owner' | 'dispatcher' | 'driver' | 'finance'

const validRoles: UserRole[] = ['owner', 'dispatcher', 'driver', 'finance']

export const onRequestGet = async ({ request, env }: Context): Promise<Response> => {
  try {
    const { admin, profile } = await requireOwner(request, env)
    const [{ data: authData, error: authError }, { data: profiles, error: profilesError }] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin
        .from('profiles')
        .select('id, company_id, full_name, role, phone, setup_complete, is_active, created_at')
        .eq('company_id', profile.company_id)
        .order('full_name'),
    ])

    if (authError) throw authError
    if (profilesError) throw profilesError

    const authUsers = new Map(authData.users.map((user) => [user.id, user]))
    const users = (profiles || []).map((companyProfile) => {
      const authUser = authUsers.get(companyProfile.id)
      return {
        id: companyProfile.id,
        email: authUser?.email || '',
        fullName: companyProfile.full_name || authUser?.email?.split('@')[0] || 'User',
        role: companyProfile.role,
        phone: companyProfile.phone || '',
        isActive: companyProfile.is_active,
        setupComplete: companyProfile.setup_complete,
        createdAt: authUser?.created_at || companyProfile.created_at,
        lastSignInAt: authUser?.last_sign_in_at || null,
        emailConfirmedAt: authUser?.email_confirmed_at || null,
      }
    })

    return jsonResponse({ users })
  } catch (error) {
    return responseFromError(error)
  }
}

export const onRequestPatch = async ({ request, env }: Context): Promise<Response> => {
  try {
    const { admin, authUser: actingUser, profile: actingProfile } = await requireOwner(request, env)
    const body = await request.json() as Record<string, unknown>
    const id = typeof body.id === 'string' ? body.id : ''
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
    const role = typeof body.role === 'string' && validRoles.includes(body.role as UserRole) ? body.role as UserRole : null
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : null

    if (!id || !fullName || !email || !role || isActive === null) {
      return jsonResponse({ error: 'Name, email, role, and active status are required.' }, 400)
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) return jsonResponse({ error: 'Enter a valid email address.' }, 400)

    const targetProfile = await getCompanyProfile(admin, actingProfile.company_id!, id)

    if (id === actingUser.id && (role !== 'owner' || !isActive)) {
      return jsonResponse({ error: 'You cannot remove your own owner access or deactivate your own account.' }, 400)
    }

    if (targetProfile.role === 'owner' && (role !== 'owner' || !isActive)) {
      const { count, error: countError } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', actingProfile.company_id)
        .eq('role', 'owner')
        .eq('is_active', true)
        .neq('id', id)
      if (countError) throw countError
      if (!count) return jsonResponse({ error: 'Legacy Hotshot must retain at least one active owner.' }, 400)
    }

    const { data: targetAuthData, error: targetAuthError } = await admin.auth.admin.getUserById(id)
    if (targetAuthError || !targetAuthData.user) throw targetAuthError || new Error('Authentication user not found.')

    const authAttributes: AdminUserAttributes = {
      user_metadata: {
        ...targetAuthData.user.user_metadata,
        full_name: fullName,
      },
      ban_duration: isActive ? 'none' : '876000h',
    }
    if ((targetAuthData.user.email || '').toLowerCase() !== email) {
      authAttributes.email = email
      authAttributes.email_confirm = true
    }

    const { error: authUpdateError } = await admin.auth.admin.updateUserById(id, authAttributes)
    if (authUpdateError) throw authUpdateError

    const { data: updatedProfile, error: profileUpdateError } = await admin
      .from('profiles')
      .update({ full_name: fullName, phone: phone || null, role, is_active: isActive })
      .eq('id', id)
      .eq('company_id', actingProfile.company_id)
      .select('id, full_name, phone, role, is_active, setup_complete, created_at')
      .single()
    if (profileUpdateError) throw profileUpdateError

    await writeAuditLog({
      admin,
      companyId: actingProfile.company_id!,
      actorId: actingUser.id,
      action: 'user_account_updated',
      entityId: id,
      changes: { fullName, email, phone, role, isActive },
    })

    return jsonResponse({
      user: {
        id,
        email,
        fullName: updatedProfile.full_name,
        phone: updatedProfile.phone || '',
        role: updatedProfile.role,
        isActive: updatedProfile.is_active,
        setupComplete: updatedProfile.setup_complete,
        createdAt: updatedProfile.created_at,
        lastSignInAt: targetAuthData.user.last_sign_in_at || null,
        emailConfirmedAt: targetAuthData.user.email_confirmed_at || null,
      },
    })
  } catch (error) {
    return responseFromError(error)
  }
}
