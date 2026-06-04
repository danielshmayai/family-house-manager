import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../../lib/prisma'
import { getSessionUser, isManager } from '../../../../lib/apiAuth'
import { withLogging } from '../../../../lib/withLogging'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })

  const sessionUser = await getSessionUser(req, res)
  if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' })

  if (!isManager(sessionUser.role)) {
    return res.status(403).json({ error: 'Only managers can review wallet requests' })
  }

  const { action } = req.body
  if (!['APPROVE', 'DENY'].includes(action)) {
    return res.status(400).json({ error: 'action must be APPROVE or DENY' })
  }

  const walletReq = await prisma.walletRequest.findUnique({
    where: { id: String(req.query.id) },
  })

  if (!walletReq) return res.status(404).json({ error: 'Request not found' })
  if (walletReq.status !== 'PENDING') return res.status(409).json({ error: 'Request already reviewed' })
  if (walletReq.householdId !== sessionUser.householdId) {
    return res.status(403).json({ error: 'Access denied' })
  }

  if (action === 'DENY') {
    await prisma.walletRequest.update({
      where: { id: walletReq.id },
      data: { status: 'DENIED', reviewedById: sessionUser.id, reviewedAt: new Date() },
    })
    return res.json({ success: true, status: 'DENIED' })
  }

  // APPROVE: credit the wallet, record transaction, mark request approved atomically
  await prisma.wallet.upsert({
    where: { userId: walletReq.userId },
    create: { userId: walletReq.userId, balance: walletReq.amount },
    update: { balance: { increment: walletReq.amount } },
  })

  const finalWallet = await prisma.wallet.findUnique({ where: { userId: walletReq.userId } })

  await prisma.$transaction([
    prisma.walletTransaction.create({
      data: {
        walletId: finalWallet!.id,
        amount: walletReq.amount,
        type: 'CREDIT',
        description: walletReq.description || null,
        createdById: sessionUser.id,
      },
    }),
    prisma.walletRequest.update({
      where: { id: walletReq.id },
      data: { status: 'APPROVED', reviewedById: sessionUser.id, reviewedAt: new Date() },
    }),
  ])

  return res.json({ success: true, status: 'APPROVED', balance: finalWallet!.balance })
}

export default withLogging(handler)
