/**
 * GET /api/admin/approve?token=<approvalToken>&family=<familyName>&lang=<lang>
 *
 * Called when the product admin clicks the approval link from their email.
 * 1. Finds the pending user by approvalToken
 * 2. Creates their household and seeds defaults
 * 3. Marks user as APPROVED
 * 4. Generates a revokeToken on the household
 * 5. Emails the user that they're approved
 * 6. Emails the admin a revoke link
 * 7. Returns an HTML confirmation page
 */
import { NextApiRequest, NextApiResponse } from 'next'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../../../lib/prisma'
import { seedHouseholdDefaults } from '../../../lib/defaultActivities'
import {
  sendRegistrationApprovedEmail,
  sendRevokeNotificationEmail,
  APP_URL,
} from '../../../lib/email'
import { PRODUCT_ADMIN_EMAIL } from '../../../lib/productAdmin'

function html(title: string, body: string, color = '#43e97b') {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><title>${title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;min-height:100vh;background:linear-gradient(135deg,${color},#38f9d7);display:flex;align-items:center;justify-content:center;font-family:system-ui;">
  <div style="background:white;border-radius:28px;padding:48px;max-width:480px;width:90%;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.2);">
    ${body}
    <a href="${APP_URL}" style="display:inline-block;margin-top:24px;padding:14px 28px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:14px;text-decoration:none;font-weight:700;">
      🏡 FamFlow
    </a>
  </div>
</body>
</html>`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { token, family, lang } = req.query

  if (!token || typeof token !== 'string') {
    res.status(400).send(html('שגיאה', '<h1 style="color:#991b1b">קישור לא תקין</h1><p style="color:#6b7280">הקישור חסר פרמטרים.</p>', '#fee2e2'))
    return
  }

  const user = await prisma.user.findUnique({ where: { approvalToken: token } })

  if (!user) {
    res.status(404).send(html('לא נמצא', '<h1 style="color:#991b1b">קישור לא תקין</h1><p style="color:#6b7280">הקישור כבר שומש או שאינו קיים.</p>', '#fee2e2'))
    return
  }

  if (user.approvalStatus === 'APPROVED') {
    res.send(html('כבר אושר', '<h1>✅ כבר אושר</h1><p style="color:#6b7280">משתמש זה כבר אושר בעבר.</p>'))
    return
  }

  const resolvedFamilyName =
    (typeof family === 'string' && family.trim())
      ? family.trim()
      : `${user.name || user.email}'s Family`

  const resolvedLang = (lang === 'en' || lang === 'he') ? lang : (user.language || 'he')

  try {
    // Create household
    const revokeToken = uuidv4()
    const hh = await prisma.household.create({
      data: { name: resolvedFamilyName, revokeToken },
    })

    // Approve user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        approvalStatus: 'APPROVED',
        approvalToken: null,
        householdId: hh.id,
      },
    })

    // Seed defaults (non-fatal)
    try {
      await seedHouseholdDefaults(prisma, hh.id, user.id, resolvedLang)
    } catch (e) {
      console.error('seed defaults failed (non-fatal):', e)
    }

    const proto = (req.headers['x-forwarded-proto'] as string) || 'http'
    const host = req.headers.host || 'localhost:3000'
    const loginUrl = `${proto}://${host}/auth/login`
    const revokeUrl = `${proto}://${host}/api/admin/revoke?token=${revokeToken}`

    // Email user — approved
    try {
      await sendRegistrationApprovedEmail(user.email, user.name || user.email, loginUrl)
    } catch (e) {
      console.error('failed to send approved email (non-fatal):', e)
    }

    // Email admin — revoke link
    try {
      await sendRevokeNotificationEmail(
        PRODUCT_ADMIN_EMAIL,
        user.name || user.email,
        user.email,
        resolvedFamilyName,
        revokeUrl,
      )
    } catch (e) {
      console.error('failed to send revoke email (non-fatal):', e)
    }

    res.send(html(
      'אושר בהצלחה',
      `<div style="font-size:56px;margin-bottom:16px;">✅</div>
       <h1 style="margin:0 0 8px;color:#1f2937;">אושר!</h1>
       <p style="color:#6b7280;margin:0 0 8px;">${user.name || user.email} אושר.</p>
       <p style="color:#6b7280;font-size:13px;margin:0;">נשלח אימייל למשתמש עם קישור כניסה.<br>קישור ביטול נשלח אליך במייל נפרד.</p>`,
    ))
  } catch (e) {
    console.error('approve error:', e)
    res.status(500).send(html('שגיאה', '<h1 style="color:#991b1b">שגיאת שרת</h1><p style="color:#6b7280">אנא נסה שוב.</p>', '#fee2e2'))
  }
}
