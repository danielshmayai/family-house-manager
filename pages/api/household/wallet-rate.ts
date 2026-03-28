import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { getSessionUser, verifyHouseholdAccess, isManager } from '../../../lib/apiAuth'
import { rateLimit } from '../../../lib/rateLimit'
import { withLogging } from '../../../lib/withLogging'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sessionUser = await getSessionUser(req, res)
  if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' })

  if (!sessionUser.householdId) {
    return res.status(400).json({ error: 'You are not in a household' })
  }

  // GET — return current rate
  if (req.method === 'GET') {
    const household = await prisma.household.findUnique({
      where: { id: sessionUser.householdId },
      select: { pointToNisRate: true }
    })
    return res.json({ pointToNisRate: household?.pointToNisRate ?? 0 })
  }

  // PUT — manager updates the rate
  if (req.method === 'PUT') {
    if (rateLimit(req, res, { max: 10, windowMs: 60_000, keyPrefix: 'wallet-rate' })) return

    if (!isManager(sessionUser.role)) {
      return res.status(403).json({ error: 'Only managers can set the conversion rate' })
    }

    const hasAccess = await verifyHouseholdAccess(sessionUser.id, sessionUser.householdId)
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' })

    const { pointToNisRate } = req.body
    const rate = parseFloat(pointToNisRate)

    if (isNaN(rate) || rate < 0) {
      return res.status(400).json({ error: 'pointToNisRate must be a non-negative number' })
    }

    const household = await prisma.household.update({
      where: { id: sessionUser.householdId },
      data: { pointToNisRate: rate },
      select: { pointToNisRate: true }
    })

    return res.json({ success: true, pointToNisRate: household.pointToNisRate })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withLogging(handler)
