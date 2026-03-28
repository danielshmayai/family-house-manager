import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { getSessionUser } from '../../../lib/apiAuth'
import { rateLimit } from '../../../lib/rateLimit'
import { withLogging } from '../../../lib/withLogging'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sessionUser = await getSessionUser(req, res)
  if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (rateLimit(req, res, { max: 10, windowMs: 60_000, keyPrefix: 'wallet-convert' })) return

  if (!sessionUser.householdId) {
    return res.status(400).json({ error: 'You are not in a household' })
  }

  const { points } = req.body
  const parsedPoints = parseInt(points, 10)

  if (!parsedPoints || isNaN(parsedPoints) || parsedPoints <= 0) {
    return res.status(400).json({ error: 'points must be a positive integer' })
  }

  // Get household pointToNisRate
  const household = await prisma.household.findUnique({
    where: { id: sessionUser.householdId },
    select: { pointToNisRate: true }
  })

  if (!household || household.pointToNisRate <= 0) {
    return res.status(400).json({ error: 'Point conversion rate is not configured' })
  }

  // Calculate total points the user has earned (all time)
  const pointsResult = await prisma.event.aggregate({
    where: { recordedById: sessionUser.id, householdId: sessionUser.householdId },
    _sum: { points: true }
  })
  const totalPoints = pointsResult._sum.points ?? 0

  // Calculate already-converted points from wallet transactions
  const convertedResult = await prisma.walletTransaction.aggregate({
    where: {
      type: 'POINTS_CONVERSION',
      createdById: sessionUser.id,
      wallet: { userId: sessionUser.id }
    },
    _sum: { pointsUsed: true }
  })
  const alreadyConverted = convertedResult._sum.pointsUsed ?? 0

  const availablePoints = totalPoints - alreadyConverted

  if (parsedPoints > availablePoints) {
    return res.status(400).json({
      error: `Not enough points. Available: ${availablePoints}`,
      availablePoints
    })
  }

  const nisAmount = parseFloat((parsedPoints * household.pointToNisRate).toFixed(2))

  const wallet = await prisma.wallet.upsert({
    where: { userId: sessionUser.id },
    create: { userId: sessionUser.id, balance: nisAmount },
    update: { balance: { increment: nisAmount } },
  })

  await prisma.walletTransaction.create({
    data: {
      walletId: wallet.id,
      amount: nisAmount,
      type: 'POINTS_CONVERSION',
      description: `🪙 Converted ${parsedPoints} pts → ₪${nisAmount} (₪${household.pointToNisRate}/pt)`,
      pointsUsed: parsedPoints,
      createdById: sessionUser.id
    }
  })

  const updatedWallet = await prisma.wallet.findUnique({ where: { userId: sessionUser.id } })

  return res.json({
    success: true,
    pointsUsed: parsedPoints,
    nisAdded: nisAmount,
    balance: updatedWallet!.balance
  })
}

export default withLogging(handler)
