import { getCompanyProfile, jsonResponse, requireOwner, responseFromError, writeAuditLog } from '../../../_shared/admin'
import type { AdminEnv } from '../../../_shared/admin'

type Context = { request: Request; env: AdminEnv }

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  try {
    const { admin, authUser: actingUser, profile: actingProfile } = await requireOwner(request, env)
    const body = await request.json() as Record<string, unknown>
    const userId = typeof body.userId === 'string' ? body.userId : ''
    if (!userId) return jsonResponse({ error: 'A user account is required.' }, 400)

    const targetProfile = await getCompanyProfile(admin, actingProfile.company_id!, userId)
    if (!targetProfile.is_active) return jsonResponse({ error: 'Reactivate this account before sending a password reset.' }, 400)

    const { data: targetData, error: targetError } = await admin.auth.admin.getUserById(userId)
    if (targetError || !targetData.user?.email) throw targetError || new Error('This user does not have an email address.')

    const requestOrigin = new URL(request.url).origin
    const appUrl = (env.APP_URL || requestOrigin).replace(/\/$/, '')
    const { error: resetError } = await admin.auth.resetPasswordForEmail(targetData.user.email, {
      redirectTo: `${appUrl}/reset-password`,
    })
    if (resetError) throw resetError

    await writeAuditLog({
      admin,
      companyId: actingProfile.company_id!,
      actorId: actingUser.id,
      action: 'password_reset_email_sent',
      entityId: userId,
      changes: { email: targetData.user.email },
    })

    return jsonResponse({ message: `Password reset email sent to ${targetData.user.email}.` })
  } catch (error) {
    return responseFromError(error)
  }
}
