import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../../lib/prisma'
import { getSessionUser, verifyHouseholdAccess, isManager } from '../../../../lib/apiAuth'
import { rateLimit } from '../../../../lib/rateLimit'
import { withLogging } from '../../../../lib/withLogging'
import { calcNextPayAt } from '../../../../lib/recurringPayments'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sessionUser = await getSessionUser(req, res)
  if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' })

  if (!isManager(sessionUser.role)) {
    return res.status(403).json({ error: 'Only managers can manage recurring payments' })
  }

  const { id } = req.query
  const payment = await prisma.recurringPayment.findUnique({ where: { id: String(id) } })
  if (!payment) return res.status(404).json({ error: 'Not found' })

  const hasAccess = await verifyHouseholdAccess(sessionUser.id, payment.householdId)
  if (!hasAccess) return res.status(403).json({ error: 'Access denied' })

  // PUT — update
  if (req.method === 'PUT') {
    if (rateLimit(req, res, { max: 20, windowMs: 60_000, keyPrefix: 'recurring-update' })) return

    const { amount, cycleType, payDay, description, isActive } = req.body
    const updateData: any = {}

    if (amount !== undefined) {
      const v = parseFloat(amount)
      if (isNaN(v) || v <= 0) return res.status(400).json({ error: 'amount must be a positive number' })
      updateData.amount = v
    }

    const newCycleType = cycleType ?? payment.cycleType
    const newPayDay = payDay !== undefined ? parseInt(payDay, 10) : payment.payDay

    if (cycleType !== undefined) {
      if (!['WEEKLY', 'MONTHLY'].includes(cycleType)) return res.status(400).json({ error: 'Invalid cycleType' })
      updateData.cycleType = cycleType
    }
    if (payDay !== undefined) {
      const maxDay = newCycleType === 'WEEKLY' ? 7 : 31
      if (isNaN(newPayDay) || newPayDay < 1 || newPayDay > maxDay) {
        return res.status(400).json({ error: `payDay must be 1–${maxDay}` })
      }
      updateData.payDay = newPayDay
    }
    if (description !== undefined) updateData.description = description || null
    if (isActive !== undefined) updateData.isActive = Boolean(isActive)

    // Recalculate nextPayAt if schedule changed
    if (cycleType !== undefined || payDay !== undefined) {
      updateData.nextPayAt = calcNextPayAt(newCycleType, newPayDay)
    }

    const updated = await prisma.recurringPayment.update({ where: { id: String(id) }, data: updateData })
    return res.json(updated)
  }

  // DELETE
  if (req.method === 'DELETE') {
    await prisma.recurringPayment.delete({ where: { id: String(id) } })
    return res.json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withLogging(handler)
