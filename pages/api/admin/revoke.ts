/**
 * GET /api/admin/revoke?token=<revokeToken>
 *
 * Called when the product admin clicks the revoke link.
 * Deletes the household and all its data, then disconnects all members.
 * Returns an HTML confirmation page.
 */
import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { APP_URL } from '../../../lib/email'

function html(title: string, body: string, color = '#ef4444') {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><title>${title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;min-height:100vh;background:linear-gradient(135deg,${color},#f97316);display:flex;align-items:center;justify-content:center;font-family:system-ui;">
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

  const { token } = req.query

  if (!token || typeof token !== 'string') {
    res.status(400).send(html('שגיאה', '<h1>קישור לא תקין</h1><p style="color:#6b7280">הקישור חסר פרמטרים.</p>'))
    return
  }

  const household = await prisma.household.findUnique({
    where: { revokeToken: token },
    include: { members: { select: { id: true, name: true, email: true } } },
  })

  if (!household) {
    res.status(404).send(html('לא נמצא', '<h1>קישור לא תקין</h1><p style="color:#6b7280">הקישור כבר שומש או שאינו קיים.</p>'))
    return
  }

  try {
    const householdId = household.id
    const memberNames = household.members.map((m: { name: string | null; email: string }) => m.name || m.email).join(', ')

    // Delete in FK order (same as DELETE /api/households)
    await prisma.event.deleteMany({ where: { householdId } })
    const categories = await prisma.category.findMany({ where: { householdId }, select: { id: true } })
    const catIds = categories.map((c: { id: string }) => c.id)
    if (catIds.length > 0) {
      await prisma.activity.deleteMany({ where: { categoryId: { in: catIds } } })
    }
    await prisma.category.deleteMany({ where: { householdId } })
    await prisma.invite.deleteMany({ where: { householdId } })
    // Disconnect + reset all members
    await prisma.user.updateMany({
      where: { householdId },
      data: { householdId: null, role: 'MEMBER', approvalStatus: 'PENDING' },
    })
    await prisma.household.delete({ where: { id: householdId } })

    res.send(html(
      'בוטל בהצלחה',
      `<div style="font-size:56px;margin-bottom:16px;">🗑️</div>
       <h1 style="margin:0 0 8px;color:#1f2937;">המשפחה נמחקה</h1>
       <p style="color:#6b7280;margin:0 0 8px;">המשפחה <strong>${household.name}</strong> נמחקה.</p>
       ${memberNames ? `<p style="color:#9ca3af;font-size:13px;margin:0;">חברים שהוסרו: ${memberNames}</p>` : ''}`,
      '#ef4444',
    ))
  } catch (e) {
    console.error('revoke error:', e)
    res.status(500).send(html('שגיאה', '<h1>שגיאת שרת</h1><p style="color:#6b7280">אנא נסה שוב.</p>'))
  }
}
