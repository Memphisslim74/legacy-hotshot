import { getCompanyProfile, jsonResponse, requireOwner, responseFromError, writeAuditLog } from '../../../_shared/admin'
import type { AdminEnv } from '../../../_shared/admin'

type Context = { request: Request; env: AdminEnv }

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
}[character] || character))

function buildResetEmail(values: { name: string; resetUrl: string; appUrl: string }) {
  const safeName = escapeHtml(values.name)
  const safeResetUrl = escapeHtml(values.resetUrl)
  const safeAppUrl = escapeHtml(values.appUrl)

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Reset your Legacy Hotshot password</title>
  </head>
  <body style="margin:0;padding:0;background:#f2f1ed;font-family:Arial,Helvetica,sans-serif;color:#171a1e;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f1ed;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(20,24,28,.10);">
            <tr>
              <td style="padding:28px 34px;background:#15181c;border-top:6px solid #bd1f31;">
                <div style="font-size:13px;font-weight:700;letter-spacing:2px;color:#d9dde0;">LEGACY HOTSHOT, LLC</div>
                <div style="margin-top:5px;font-size:12px;letter-spacing:3px;color:#8f979e;">COMMAND CENTER</div>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 34px 14px;">
                <div style="font-size:12px;font-weight:700;letter-spacing:1.5px;color:#bd1f31;">ACCOUNT SECURITY</div>
                <h1 style="margin:10px 0 14px;font-size:30px;line-height:1.15;color:#171a1e;">Reset your password</h1>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#555d64;">Hello ${safeName},</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.65;color:#555d64;">A Legacy Hotshot owner requested a password reset for your Command Center account. Use the secure button below to choose a new password.</p>
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="border-radius:8px;background:#bd1f31;">
                      <a href="${safeResetUrl}" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">Reset My Password</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#7b8288;">If the button does not work, copy and paste this secure address into your browser:</p>
                <p style="margin:8px 0 0;word-break:break-all;font-size:12px;line-height:1.55;color:#bd1f31;">${safeResetUrl}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 34px 32px;">
                <div style="padding:16px;background:#f7f7f4;border:1px solid #e2e3de;border-radius:9px;font-size:13px;line-height:1.6;color:#646b71;">If you did not expect this message, you may ignore it. Your password will remain unchanged until the secure reset link is used.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 34px;background:#202429;color:#aeb4ba;font-size:12px;line-height:1.6;">
                Legacy Hotshot Command Center<br>
                <a href="${safeAppUrl}" style="color:#ffffff;text-decoration:none;">${safeAppUrl}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

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

    const resendApiKey = env.RESEND_API_KEY?.trim()
    const resendFromEmail = env.RESEND_FROM_EMAIL?.trim()
    const resendFromName = env.RESEND_FROM_NAME?.trim() || 'Legacy Hotshot'
    if (!resendApiKey || !resendFromEmail) {
      return jsonResponse({ error: 'Branded email is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL in Cloudflare.' }, 500)
    }

    const requestOrigin = new URL(request.url).origin
    const appUrl = (env.APP_URL || requestOrigin).replace(/\/$/, '')
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: targetData.user.email,
      options: { redirectTo: `${appUrl}/reset-password` },
    })
    if (linkError) throw linkError

    const resetUrl = linkData.properties?.action_link
    if (!resetUrl) throw new Error('Supabase did not return a recovery link.')

    const recipientName = targetProfile.full_name || targetData.user.email.split('@')[0]
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `legacy-password-reset-${userId}-${Date.now()}`,
      },
      body: JSON.stringify({
        from: `${resendFromName} <${resendFromEmail}>`,
        to: [targetData.user.email],
        subject: 'Reset your Legacy Hotshot password',
        html: buildResetEmail({ name: recipientName, resetUrl, appUrl }),
        text: `Hello ${recipientName},\n\nA Legacy Hotshot owner requested a password reset for your Command Center account. Use this secure link to choose a new password:\n\n${resetUrl}\n\nIf you did not expect this message, you can ignore it.`,
      }),
    })

    const emailPayload = await emailResponse.json().catch(() => ({})) as { id?: string; message?: string; error?: string }
    if (!emailResponse.ok) throw new Error(emailPayload.message || emailPayload.error || 'Resend could not send the password-reset email.')

    await writeAuditLog({
      admin,
      companyId: actingProfile.company_id!,
      actorId: actingUser.id,
      action: 'branded_password_reset_email_sent',
      entityId: userId,
      changes: { email: targetData.user.email, provider: 'resend', emailId: emailPayload.id || null },
    })

    return jsonResponse({ message: `Branded password reset email sent to ${targetData.user.email}.` })
  } catch (error) {
    return responseFromError(error)
  }
}
