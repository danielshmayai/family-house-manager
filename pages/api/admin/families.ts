/**
 * /api/admin/families — product-admin only
 *
 * GET  → { pending: User[], households: (Household & { members, admin })[] }
 * POST → { userId, familyName, lang? } — approve a pending user
 * DELETE → { householdId } — revoke / delete a household
 */
import { NextApiRequest, NextApiResponse } from 'next'
import { v4 as uuidv4 } from 'uuid'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import prisma from '../../../lib/prisma'
import { PRODUCT_ADMIN_EMAIL } from '../../../lib/productAdmin'
import { seedHouseholdDefaults } from '../../../lib/defaultActivities'
import {
  sendRegistrationApprovedEmail,
  sendRevokeNotificationEmail,
  APP_URL,
} from '../../../lib/email'

async function isProductAdmin(req: NextApiRequest, res: NextApiResponse): Promise<boolean> {
  const session = await getServerSession(req, res, authOptions)
  return !!(session?.user && (session.user as any).email === PRODUCT_ADMIN_EMAIL)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await isProductAdmin(req, res))) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const [pending, households] = await Promise.all([
      prisma.user.findMany({
        where: { approvalStatus: 'PENDING', approvalToken: { not: null } },
        select: { id: true, name: true, email: true, approvalToken: true, createdAt: true, language: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.household.findMany({
        include: {
          members: {
            select: { id: true, name: true, email: true, role: true, createdAt: true },
            orderBy: { role: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return res.json({ pending, households })
  }

  // ── POST ─────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { action, userId, familyName, lang, email, name } = req.body as {
      action?: string
      userId?: string
      familyName?: string
      lang?: string
      email?: string
      name?: string
    }

    // ── action: invite — product admin initiates a new family head ──────────
    if (action === 'invite') {
      if (!email?.trim()) return res.status(400).json({ error: 'email required' })
      if (!familyName?.trim()) return res.status(400).json({ error: 'familyName required' })

      const normalizedEmail = email.trim().toLowerCase()
      const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } })
      if (exists) return res.status(409).json({ error: 'כתובת המייל כבר רשומה במערכת' })

      const resolvedLang = (lang === 'en' || lang === 'he') ? lang : 'he'
      const resolvedFamily = familyName.trim()

      const revokeToken = uuidv4()
      const setupToken = uuidv4()

      const household = await prisma.household.create({
        data: { name: resolvedFamily, revokeToken },
      })

      const newUser = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: name?.trim() || null,
          passwordHash: null,
          role: 'ADMIN',
          approvalStatus: 'APPROVED',
          householdId: household.id,
          setupToken,
          language: resolvedLang,
        },
      })

      try { await seedHouseholdDefaults(prisma, household.id, newUser.id, resolvedLang) }
      catch (e) { console.error('seed defaults failed (non-fatal):', e) }

      const setupLink = `${APP_URL}/auth/setup?token=${setupToken}`

      return res.json({ ok: true, setupLink, familyName: resolvedFamily, email: normalizedEmail })
    }

    // ── action: approve (default) ─────────────────────────────────────────
    if (!userId) return res.status(400).json({ error: 'userId required' })

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.approvalStatus === 'APPROVED') return res.status(409).json({ error: 'Already approved' })

    const resolvedFamily = (familyName?.trim()) || `${user.name || user.email}'s Family`
    const resolvedLang = (lang === 'en' || lang === 'he') ? lang : (user.language || 'he')

    const revokeToken = uuidv4()
    const household = await prisma.household.create({
      data: { name: resolvedFamily, revokeToken },
    })

    await prisma.user.update({
      where: { id: user.id },
      data: { approvalStatus: 'APPROVED', approvalToken: null, householdId: household.id },
    })

    try { await seedHouseholdDefaults(prisma, household.id, user.id, resolvedLang) }
    catch (e) { console.error('seed defaults failed (non-fatal):', e) }

    const loginUrl = `${APP_URL}/auth/login`
    const revokeUrl = `${APP_URL}/api/admin/revoke?token=${revokeToken}`

    try { await sendRegistrationApprovedEmail(user.email, user.name || user.email, loginUrl) }
    catch (e) { console.error('failed to send approved email (non-fatal):', e) }

    try {
      await sendRevokeNotificationEmail(
        PRODUCT_ADMIN_EMAIL, user.name || user.email, user.email, resolvedFamily, revokeUrl,
      )
    } catch (e) { console.error('failed to send revoke email (non-fatal):', e) }

    return res.json({ ok: true, householdId: household.id, householdName: resolvedFamily })
  }

  // ── DELETE — revoke household ─────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { householdId } = req.body as { householdId?: string }
    if (!householdId) return res.status(400).json({ error: 'householdId required' })

    const household = await prisma.household.findUnique({
      where: { id: householdId },
      include: { members: { select: { id: true, name: true, email: true } } },
    })
    if (!household) return res.status(404).json({ error: 'Household not found' })

    // Delete in FK order
    await prisma.event.deleteMany({ where: { householdId } })
    const categories = await prisma.category.findMany({ where: { householdId }, select: { id: true } })
    const catIds = categories.map((c: { id: string }) => c.id)
    if (catIds.length > 0) {
      await prisma.activity.deleteMany({ where: { categoryId: { in: catIds } } })
    }
    await prisma.category.deleteMany({ where: { householdId } })
    await prisma.invite.deleteMany({ where: { householdId } })
    await prisma.user.updateMany({
      where: { householdId },
      data: { householdId: null, role: 'MEMBER', approvalStatus: 'PENDING' },
    })
    await prisma.household.delete({ where: { id: householdId } })

    return res.json({ ok: true, deletedHousehold: household.name, memberCount: household.members.length })
  }

  return res.status(405).end()
}
