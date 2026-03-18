import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.EMAIL_FROM || 'FamFlow <noreply@famflow.app>'
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

export async function sendPasswordResetEmail(email: string, code: string) {
  const subject = 'Reset your FamFlow password'
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:16px;">
      <div style="text-align:center;margin-bottom:24px;font-size:48px;">🏡</div>
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1f2937;text-align:center;">Password Reset</h1>
      <p style="color:#6b7280;text-align:center;margin:0 0 32px;">Use the code below to reset your password. It expires in 15 minutes.</p>
      <div style="background:white;border-radius:12px;padding:24px;text-align:center;border:2px solid #e5e7eb;margin-bottom:24px;">
        <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#667eea;font-family:monospace;">${code}</div>
      </div>
      <p style="color:#9ca3af;font-size:13px;text-align:center;margin:0;">
        If you did not request this, ignore this email — your password remains unchanged.
      </p>
    </div>
  `

  if (resend) {
    await resend.emails.send({ from: FROM, to: email, subject, html })
  } else {
    // No email provider — log to console for development
    console.log(`\n[PASSWORD RESET] Code for ${email}: ${code}\n`)
  }
}

export const emailConfigured = !!process.env.RESEND_API_KEY
export { APP_URL }
