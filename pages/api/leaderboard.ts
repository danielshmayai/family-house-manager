import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { computePointsFromEvents, computeStreakForUser } from '../../lib/rulesEngine'
import { subDays } from 'date-fns'

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  try{
    const { householdId, range = 'weekly' } = req.query
    if (!householdId) return res.status(400).json({ error: 'householdId required' })

    let since: Date | undefined
    if (range === 'daily') since = subDays(new Date(), 1)
    if (range === 'weekly') since = subDays(new Date(), 7)
    if (range === 'monthly') since = subDays(new Date(), 30)

    const members = await prisma.user.findMany({ where: { householdId: String(householdId) } })

    // Single query for all events in the household (fixes N+1)
    const eventsWhere: any = { householdId: String(householdId) }
    if (since) eventsWhere.occurredAt = { gte: since }
    const allEvents = await prisma.event.findMany({ where: eventsWhere })

    // Group events by user
    const eventsByUser = new Map<string, typeof allEvents>()
    for (const e of allEvents) {
      const list = eventsByUser.get(e.recordedById) || []
      list.push(e)
      eventsByUser.set(e.recordedById, list)
    }

    // Compute points per user from grouped events + compute streaks in parallel
    const results = await Promise.all(members.map(async (m) => {
      const userEvents = eventsByUser.get(m.id) || []
      const pts = computePointsFromEvents(m.id, userEvents)
      const streak = await computeStreakForUser(m.id, String(householdId))
      return {
        user: { id: m.id, name: m.name, email: m.email },
        points: pts.points,
        activities: pts.activitiesCount,
        streak,
        breakdown: pts.breakdown
      }
    }))

    results.sort((a,b) => b.points - a.points)
    const familyTotal = results.reduce((s,r) => s + r.points, 0)
    return res.json({ results, familyTotal })
  }catch(e){
    console.error(e)
    res.status(500).json({ error: 'server error' })
  }
}
