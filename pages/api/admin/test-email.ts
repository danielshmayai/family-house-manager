/**
 * GET /api/admin/test-email?secret=<NEXTAUTH_SECRET>
 *
 * Diagnostic endpoint: sends a test approval email and returns a status report.
 * Protected by NEXTAUTH_SECRET so it cannot be called by anonymous users.
 */
import { NextApiRequest, NextApiResponse } from 'next'
import { sendApprovalRequestEmail } from '../../../lib/email'
import { PRODUCT_ADMIN_EMAIL } from '../../../lib/productAdmin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { secret } = req.query
  if (!secret || secret !== process.env.NEXTAUTH_SECRET) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const resendConfigured = !!process.env.RESEND_API_KEY
  const emailFrom = process.env.EMAIL_FROM || 'onboarding@resend.dev'
  const adminEmail = PRODUCT_ADMIN_EMAIL

  const testApproveUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/approve?token=TEST_TOKEN&family=Test+Family&lang=he`

  let emailResult: 'sent' | 'console_only' | 'error' = 'console_only'
  let errorDetails: string | null = null

  if (resendConfigured) {
    try {
      await sendApprovalRequestEmail(adminEmail, 'Test User', 'test@example.com', 'Test Family', testApproveUrl)
      emailResult = 'sent'
    } catch (err: any) {
      emailResult = 'error'
      errorDetails = err?.message || String(err)
    }
  } else {
    // sendApprovalRequestEmail logs to console when resend is null
    await sendApprovalRequestEmail(adminEmail, 'Test User', 'test@example.com', 'Test Family', testApproveUrl)
  }

  return res.json({
    resendConfigured,
    emailFrom,
    adminEmail,
    emailResult,
    errorDetails,
    note: resendConfigured
      ? emailFrom === 'onboarding@resend.dev'
        ? 'WARNING: EMAIL_FROM is the Resend sandbox domain. It can only send to the Resend account owner email. Set EMAIL_FROM to a verified domain.'
        : 'Resend is configured with a custom domain.'
      : 'RESEND_API_KEY is not set. Emails are logged to server console only. Set RESEND_API_KEY in your Vercel environment variables.',
  })
}
