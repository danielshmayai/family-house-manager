import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { getSessionUser, verifyHouseholdAccess, isManager } from '../../lib/apiAuth'
import { rateLimit } from '../../lib/rateLimit'
import { withLogging } from '../../lib/withLogging'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sessionUser = await getSessionUser(req, res)
  if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' })

  // GET — fetch wallet(s)
  if (req.method === 'GET') {
    const allMode = req.query.all === 'true'

    // Manager-only: return all wallets + transactions across the household
    if (allMode) {
      if (!isManager(sessionUser.role)) {
        return res.status(403).json({ error: 'Only managers can view all transactions' })
      }
      if (!sessionUser.householdId) return res.status(400).json({ error: 'No household' })

      const [transactions, memberWallets, earnedByUser, convertedByUser] = await Promise.all([
        prisma.walletTransaction.findMany({
          where: { wallet: { user: { householdId: sessionUser.householdId } } },
          orderBy: { createdAt: 'desc' },
          take: 200,
          include: {
            wallet: { include: { user: { select: { id: true, name: true } } } }
          }
        }),
        prisma.wallet.findMany({
          where: { user: { householdId: sessionUser.householdId } },
          include: { user: { select: { id: true, name: true } } }
        }),
        prisma.event.groupBy({
          by: ['recordedById'],
          where: { householdId: sessionUser.householdId },
          _sum: { points: true }
        }),
        prisma.walletTransaction.groupBy({
          by: ['createdById'],
          where: { type: 'POINTS_CONVERSION', wallet: { user: { householdId: sessionUser.householdId } } },
          _sum: { pointsUsed: true }
        })
      ])

      const earnedMap = Object.fromEntries(earnedByUser.map((r: { recordedById: string; _sum: { points: number | null } }) => [r.recordedById, r._sum.points ?? 0]))
      const convertedMap = Object.fromEntries(convertedByUser.map((r: { createdById: string; _sum: { pointsUsed: number | null } }) => [r.createdById, r._sum.pointsUsed ?? 0]))

      const memberWalletsWithPoints = memberWallets.map((mw: { user: { id: string; name: string | null }; balance: number; [key: string]: unknown }) => ({
        ...mw,
        availablePoints: Math.max(0, (earnedMap[mw.user.id] ?? 0) - (convertedMap[mw.user.id] ?? 0))
      }))

      return res.json({ transactions, memberWallets: memberWalletsWithPoints })
    }

    // Single user wallet
    const targetUserId = req.query.userId ? String(req.query.userId) : sessionUser.id

    if (targetUserId !== sessionUser.id && !isManager(sessionUser.role)) {
      return res.status(403).json({ error: 'You can only view your own wallet' })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, householdId: true }
    })
    if (!targetUser?.householdId) return res.status(404).json({ error: 'User not found' })

    const hasAccess = await verifyHouseholdAccess(sessionUser.id, targetUser.householdId)
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' })

    const wallet = await prisma.wallet.upsert({
      where: { userId: targetUserId },
      create: { userId: targetUserId },
      update: {},
      include: {
        transactions: { orderBy: { createdAt: 'desc' }, take: 50 }
      }
    })

    // Compute available points: total earned − already converted
    const [earnedResult, convertedResult] = await Promise.all([
      prisma.event.aggregate({
        where: { recordedById: targetUserId, householdId: targetUser.householdId },
        _sum: { points: true }
      }),
      prisma.walletTransaction.aggregate({
        where: { type: 'POINTS_CONVERSION', createdById: targetUserId, wallet: { userId: targetUserId } },
        _sum: { pointsUsed: true }
      })
    ])

    const availablePoints = (earnedResult._sum.points ?? 0) - (convertedResult._sum.pointsUsed ?? 0)

    return res.json({ ...wallet, availablePoints: Math.max(0, availablePoints) })
  }

  // POST — manager adjusts a member's wallet balance
  if (req.method === 'POST') {
    if (rateLimit(req, res, { max: 30, windowMs: 60_000, keyPrefix: 'wallet-adjust' })) return

    if (!isManager(sessionUser.role)) {
      return res.status(403).json({ error: 'Only managers can adjust wallet balances' })
    }

    const { userId, amount, type, description } = req.body

    if (!userId || amount === undefined || !type) {
      return res.status(400).json({ error: 'userId, amount, and type are required' })
    }

    if (!['CREDIT', 'DEBIT'].includes(type)) {
      return res.status(400).json({ error: 'type must be CREDIT or DEBIT' })
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, householdId: true }
    })
    if (!targetUser?.householdId) return res.status(404).json({ error: 'User not found' })

    const hasAccess = await verifyHouseholdAccess(sessionUser.id, targetUser.householdId)
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' })

    const delta = type === 'CREDIT' ? parsedAmount : -parsedAmount

    const wallet = await prisma.wallet.upsert({
      where: { userId },
      create: { userId, balance: Math.max(0, delta) },
      update: { balance: { increment: delta } },
    })

    // Prevent negative balance
    if (wallet.balance < 0) {
      await prisma.wallet.update({
        where: { userId },
        data: { balance: 0 }
      })
    }

    const finalWallet = await prisma.wallet.findUnique({ where: { userId } })

    await prisma.walletTransaction.create({
      data: {
        walletId: finalWallet!.id,
        amount: parsedAmount,
        type,
        description: description || null,
        createdById: sessionUser.id
      }
    })

    return res.json({ success: true, balance: finalWallet!.balance })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withLogging(handler)
