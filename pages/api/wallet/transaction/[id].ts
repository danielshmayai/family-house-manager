import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../../lib/prisma'
import { getSessionUser, isManager } from '../../../../lib/apiAuth'
import { withLogging } from '../../../../lib/withLogging'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })

  const sessionUser = await getSessionUser(req, res)
  if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' })

  if (!isManager(sessionUser.role)) {
    return res.status(403).json({ error: 'Only managers can cancel transactions' })
  }

  const tx = await prisma.walletTransaction.findUnique({
    where: { id: String(req.query.id) },
    include: { wallet: { include: { user: { select: { id: true, householdId: true } } } } }
  })

  if (!tx) return res.status(404).json({ error: 'Transaction not found' })

  // Verify household
  if (tx.wallet.user.householdId !== sessionUser.householdId) {
    return res.status(403).json({ error: 'Access denied' })
  }

  // Reverse the balance impact:
  // CREDIT / POINTS_CONVERSION / RECURRING added money → subtract it back
  // DEBIT removed money → add it back
  const reversal = tx.type === 'DEBIT' ? tx.amount : -tx.amount

  await prisma.$transaction([
    prisma.wallet.update({
      where: { id: tx.walletId },
      data: { balance: { increment: reversal } },
    }),
    prisma.walletTransaction.delete({ where: { id: tx.id } }),
  ])

  return res.json({ success: true, balanceAdjustment: reversal })
}

export default withLogging(handler)
