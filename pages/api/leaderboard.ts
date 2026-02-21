import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { computePointsForUser } from '../../lib/rulesEngine'
import { subDays } from 'date-fns'

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  try{
    const { householdId, range = 'weekly' } = req.query
    if (!householdId) return res.status(400).json({ error: 'householdId required' })

    let since: Date | undefined
    if (range === 'daily') since = subDays(new Date(), 1)
    if (range === 'weekly') since = subDays(new Date(), 7)
    if (range === 'monthly') since = subDays(new Date(), 30)
    // 'all-time' has no since filter

    const members = await prisma.user.findMany({ where: { householdId: String(householdId) } })
    const results = [] as any[]

    for(const m of members){
      const pts = await computePointsForUser(m.id, String(householdId), since)
      results.push({
        user: { id: m.id, name: m.name, email: m.email },
        points: pts.points,
        activities: pts.activitiesCount,
        streak: 0,
        breakdown: pts.breakdown
      })
    }

    results.sort((a,b) => b.points - a.points)
    const familyTotal = results.reduce((s,r) => s + r.points, 0)
    return res.json({ results, familyTotal })
  }catch(e){
    console.error(e)
    res.status(500).json({ error: 'server error' })
  }
}
