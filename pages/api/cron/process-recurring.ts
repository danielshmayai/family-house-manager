import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { getSessionUser } from '../../../lib/apiAuth'
import { calcNextPayAt } from '../../../lib/recurringPayments'
import { withLogging } from '../../../lib/withLogging'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const sessionUser = await getSessionUser(req, res)
  if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' })

  const now = new Date()

  // Find all due active payments for this user's household
  const due = await prisma.recurringPayment.findMany({
    where: {
      householdId: sessionUser.householdId!,
      isActive: true,
      nextPayAt: { lte: now },
    }
  })

  if (due.length === 0) return res.json({ processed: 0 })

  let processed = 0
  for (const payment of due) {
    try {
      // Upsert wallet and credit
      const wallet = await prisma.wallet.upsert({
        where: { userId: payment.userId },
        create: { userId: payment.userId, balance: payment.amount },
        update: { balance: { increment: payment.amount } },
      })

      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: payment.amount,
          type: 'RECURRING',
          description: payment.description || null,
          createdById: payment.createdById,
        }
      })

      const nextPayAt = calcNextPayAt(payment.cycleType, payment.payDay, now)
      await prisma.recurringPayment.update({
        where: { id: payment.id },
        data: { lastPaidAt: now, nextPayAt },
      })

      processed++
    } catch {
      // Log but don't fail the whole batch
      console.error(`[process-recurring] Failed for payment ${payment.id}`)
    }
  }

  return res.json({ processed })
}

export default withLogging(handler)
