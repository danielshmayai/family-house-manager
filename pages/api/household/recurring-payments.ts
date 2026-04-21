import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { getSessionUser, verifyHouseholdAccess, isManager } from '../../../lib/apiAuth'
import { rateLimit } from '../../../lib/rateLimit'
import { withLogging } from '../../../lib/withLogging'
import { calcNextPayAt } from '../../../lib/recurringPayments'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sessionUser = await getSessionUser(req, res)
  if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' })

  if (!sessionUser.householdId) return res.status(400).json({ error: 'No household' })

  if (!isManager(sessionUser.role)) {
    return res.status(403).json({ error: 'Only managers can manage recurring payments' })
  }

  const hasAccess = await verifyHouseholdAccess(sessionUser.id, sessionUser.householdId)
  if (!hasAccess) return res.status(403).json({ error: 'Access denied' })

  // GET — list all recurring payments for the household
  if (req.method === 'GET') {
    const payments = await prisma.recurringPayment.findMany({
      where: { householdId: sessionUser.householdId },
      orderBy: { createdAt: 'desc' },
    })
    const userIds = [...new Set(payments.map((p: any) => p.userId))]
    const users = userIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: userIds as string[] } }, select: { id: true, name: true, email: true } })
      : []
    const userMap = Object.fromEntries(users.map((u: any) => [u.id, u]))
    return res.json(payments.map((p: any) => ({ ...p, user: userMap[p.userId] ?? null })))
  }

  // POST — create a new recurring payment
  if (req.method === 'POST') {
    if (rateLimit(req, res, { max: 20, windowMs: 60_000, keyPrefix: 'recurring-create' })) return

    const { userId, amount, cycleType, payDay, description } = req.body

    if (!userId || amount === undefined || !cycleType || payDay === undefined) {
      return res.status(400).json({ error: 'userId, amount, cycleType, and payDay are required' })
    }
    if (!['WEEKLY', 'MONTHLY'].includes(cycleType)) {
      return res.status(400).json({ error: 'cycleType must be WEEKLY or MONTHLY' })
    }
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' })
    }
    const parsedPayDay = parseInt(payDay, 10)
    const maxDay = cycleType === 'WEEKLY' ? 7 : 31
    if (isNaN(parsedPayDay) || parsedPayDay < 1 || parsedPayDay > maxDay) {
      return res.status(400).json({ error: `payDay must be 1–${maxDay} for ${cycleType}` })
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, householdId: true } })
    if (!targetUser || targetUser.householdId !== sessionUser.householdId) {
      return res.status(404).json({ error: 'User not found in this household' })
    }

    const nextPayAt = calcNextPayAt(cycleType, parsedPayDay)

    const payment = await prisma.recurringPayment.create({
      data: {
        householdId: sessionUser.householdId,
        userId,
        amount: parsedAmount,
        cycleType,
        payDay: parsedPayDay,
        description: description || null,
        createdById: sessionUser.id,
        nextPayAt,
      }
    })
    return res.status(201).json(payment)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withLogging(handler)
