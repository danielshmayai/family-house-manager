import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../../lib/prisma'
import { getSessionUser, isManager } from '../../../../lib/apiAuth'
import { rateLimit } from '../../../../lib/rateLimit'
import { withLogging } from '../../../../lib/withLogging'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sessionUser = await getSessionUser(req, res)
  if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' })

  if (!sessionUser.householdId) {
    return res.status(400).json({ error: 'You are not in a household' })
  }

  // GET — manager sees pending requests; member sees their own
  if (req.method === 'GET') {
    if (isManager(sessionUser.role)) {
      const requests = await prisma.walletRequest.findMany({
        where: { householdId: sessionUser.householdId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      })
      return res.json(requests)
    }

    const requests = await prisma.walletRequest.findMany({
      where: { userId: sessionUser.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return res.json(requests)
  }

  // POST — member submits a money request
  if (req.method === 'POST') {
    if (rateLimit(req, res, { max: 10, windowMs: 60_000, keyPrefix: 'wallet-request' })) return

    const { amount, description } = req.body
    const parsedAmount = parseFloat(amount)

    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' })
    }

    const request = await prisma.walletRequest.create({
      data: {
        userId: sessionUser.id,
        householdId: sessionUser.householdId,
        amount: parsedAmount,
        description: description || null,
        status: 'PENDING',
      },
    })

    return res.status(201).json(request)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withLogging(handler)
