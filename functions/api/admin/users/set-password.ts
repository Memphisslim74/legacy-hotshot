import { getCompanyProfile, jsonResponse, requireOwner, responseFromError, writeAuditLog } from '../../../_shared/admin'
import type { AdminEnv } from '../../../_shared/admin'

type Context = { request: Request; env: AdminEnv }

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  try {
    const { admin, authUser: actingUser, profile: actingProfile } = await requireOwner(request, env)
    const body = await request.json() as Record<string, unknown>
    const userId = typeof body.userId === 'string' ? body.userId : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!userId) return jsonResponse({ error: 'A user account is required.' }, 400)
    if (password.length < 12) return jsonResponse({ error: 'Use at least 12 characters for the password.' }, 400)
    if (password.length > 128) return jsonResponse({ error: 'The password cannot exceed 128 characters.' }, 400)

    const targetProfile = await getCompanyProfile(admin, actingProfile.company_id!, userId)
    if (!targetProfile.is_active) return jsonResponse({ error: 'Reactivate this account before setting its password.' }, 400)

    const { data: targetData, error: targetError } = await admin.auth.admin.getUserById(userId)
    if (targetError || !targetData.user) throw targetError || new Error('Authentication user not found.')

    const { error: passwordError } = await admin.auth.admin.updateUserById(userId, { password })
    if (passwordError) throw passwordError

    await writeAuditLog({
      admin,
      companyId: actingProfile.company_id!,
      actorId: actingUser.id,
      action: 'password_set_by_owner',
      entityId: userId,
      changes: { email: targetData.user.email || null, method: 'manual' },
    })

    return jsonResponse({ message: `A new password was set for ${targetData.user.email || targetProfile.full_name || 'this user'}.` })
  } catch (error) {
    return responseFromError(error)
  }
}
