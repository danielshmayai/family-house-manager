import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { getSessionUser, verifyHouseholdAccess } from '../../../lib/apiAuth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const sessionUser = await getSessionUser(req, res)
    if (!sessionUser?.householdId) return res.status(401).json({ error: 'Unauthorized' })

    const householdId = sessionUser.householdId
    const hasAccess = await verifyHouseholdAccess(sessionUser.id, householdId)
    if (!hasAccess) return res.status(403).json({ error: 'No access' })

    const { startDate, endDate, userId, activityId, categoryId, limit: lim, offset: off } = req.query

    console.log('[history API] query params:', { startDate, endDate, userId, activityId, categoryId, lim, off })

    // groupBy doesn't support relation filters — resolve activityIds for the category upfront
    let categoryActivityIds: string[] | undefined
    if (categoryId && !activityId) {
      console.log('[history API] resolving activityIds for categoryId:', categoryId)
      const catActivities = await prisma.activity.findMany({
        where: { categoryId: String(categoryId) },
        select: { id: true }
      })
      categoryActivityIds = catActivities.map((a: { id: string }) => a.id)
      console.log('[history API] categoryActivityIds:', categoryActivityIds)
    }

    const where: any = { householdId }

    if (startDate) where.occurredAt = { ...where.occurredAt, gte: new Date(String(startDate)) }
    if (endDate) where.occurredAt = { ...where.occurredAt, lte: new Date(String(endDate)) }
    if (userId) where.recordedById = String(userId)
    if (activityId) where.activityId = String(activityId)
    else if (categoryActivityIds) where.activityId = { in: categoryActivityIds }

    const take = Math.min(Number(lim) || 200, 500)
    const skip = Number(off) || 0

    console.log('[history API] main where:', JSON.stringify(where))
    console.log('[history API] calling findMany + count...')
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        take,
        skip,
        include: {
          activity: {
            select: { id: true, name: true, icon: true, defaultPoints: true, categoryId: true,
              category: { select: { id: true, name: true, icon: true, color: true } }
            }
          },
          recordedBy: { select: { id: true, name: true, email: true } },
        }
      }),
      prisma.event.count({ where }),
    ])

    // Activity frequency stats (top activities by count in the filtered range)
    const statsWhere: any = { householdId }
    if (startDate) statsWhere.occurredAt = { ...statsWhere.occurredAt, gte: new Date(String(startDate)) }
    if (endDate) statsWhere.occurredAt = { ...statsWhere.occurredAt, lte: new Date(String(endDate)) }
    if (userId) statsWhere.recordedById = String(userId)
    if (categoryActivityIds) statsWhere.activityId = { in: categoryActivityIds }

    console.log('[history API] statsWhere before groupBy:', JSON.stringify(statsWhere))
    const groupByWhere = categoryActivityIds
      ? { ...statsWhere, activityId: { in: categoryActivityIds } }
      : { ...statsWhere, activityId: { not: null } }
    console.log('[history API] groupByWhere:', JSON.stringify(groupByWhere))
    console.log('[history API] calling activityStats groupBy...')
    let activityStats: any[] = []
    try {
      activityStats = await prisma.event.groupBy({
        by: ['activityId'],
        where: groupByWhere,
        _count: { id: true },
        _sum: { points: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      })
      console.log('[history API] activityStats groupBy OK, rows:', activityStats.length)
    } catch (gbErr: any) {
      console.error('[history API] activityStats groupBy FAILED:', gbErr?.message, gbErr?.stack)
      // Non-fatal: continue with empty stats
    }

    // Resolve activity names for stats
    const activityIds = activityStats.map((s: any) => s.activityId).filter(Boolean) as string[]
    const activities = activityIds.length > 0
      ? await prisma.activity.findMany({
          where: { id: { in: activityIds } },
          select: { id: true, name: true, icon: true, categoryId: true,
            category: { select: { name: true, icon: true, color: true } }
          }
        })
      : []
    const actMap = Object.fromEntries(activities.map((a: any) => [a.id, a]))

    const topActivities = activityStats.map((s: any) => ({
      activityId: s.activityId,
      count: s._count.id,
      totalPoints: s._sum.points || 0,
      activity: s.activityId ? actMap[s.activityId] || null : null,
    }))

    // Per-user stats
    console.log('[history API] calling userStats groupBy...')
    let userStats: any[] = []
    try {
      userStats = await prisma.event.groupBy({
        by: ['recordedById'],
        where: statsWhere,
        _count: { id: true },
        _sum: { points: true },
        orderBy: { _sum: { points: 'desc' } },
      })
      console.log('[history API] userStats groupBy OK, rows:', userStats.length)
    } catch (gbErr: any) {
      console.error('[history API] userStats groupBy FAILED:', gbErr?.message, gbErr?.stack)
      // Non-fatal: continue with empty stats
    }

    const userIds = userStats.map((s: any) => s.recordedById)
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true }
        })
      : []
    const userMap = Object.fromEntries(users.map((u: any) => [u.id, u]))

    const perUser = userStats.map((s: any) => ({
      userId: s.recordedById,
      count: s._count.id,
      totalPoints: s._sum.points || 0,
      user: userMap[s.recordedById] || null,
    }))

    // Household members (for filter dropdowns)
    const members = await prisma.user.findMany({
      where: { householdId },
      select: { id: true, name: true, email: true }
    })

    // Categories (for filter dropdowns)
    console.log('[history API] fetching categories for householdId:', householdId)
    const categories = await prisma.category.findMany({
      where: { householdId },
      select: { id: true, name: true, icon: true, color: true },
      orderBy: { position: 'asc' }
    })
    console.log('[history API] categories found:', categories.length, categories.map((c: any) => ({ id: c.id, name: c.name })))

    // Debug: also count ALL categories in DB and those with null householdId
    const [totalCatsInDb, nullHouseholdCats] = await Promise.all([
      prisma.category.count({}),
      prisma.category.count({ where: { householdId: null } }),
    ])
    console.log('[history API] DEBUG — total categories in DB:', totalCatsInDb, '| householdId=null:', nullHouseholdCats)

    // Activities for the given category (for filter dropdown)
    const allActivities = await prisma.activity.findMany({
      where: { category: { householdId } },
      select: { id: true, name: true, icon: true, categoryId: true },
      orderBy: { position: 'asc' }
    })
    console.log('[history API] activities found:', allActivities.length)

    console.log('[history API] all queries done, returning response')
    return res.json({
      events,
      total,
      topActivities,
      perUser,
      members,
      categories,
      activities: allActivities,
    })
  } catch (e: any) {
    console.error('[history API] CRASH:', e?.message, e?.stack)
    return res.status(500).json({ error: 'Server error', detail: e?.message ?? String(e) })
  }
}
