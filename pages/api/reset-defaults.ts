import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { getSessionUser, isManager } from '../../lib/apiAuth'
import { seedHouseholdDefaults } from '../../lib/defaultActivities'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const sessionUser = await getSessionUser(req, res)
    if (!sessionUser || !sessionUser.householdId) {
      return res.status(401).json({ error: 'Not authenticated or no household' })
    }
    if (!isManager(sessionUser.role)) {
      return res.status(403).json({ error: 'Only admins and managers can reset defaults' })
    }

    const householdId = sessionUser.householdId

    // Delete all existing events, activities, and categories for this household
    // Events first (depends on activities), then activities (depends on categories), then categories
    await prisma.event.deleteMany({ where: { householdId } })

    // Get all categories for this household to find their activities
    const categories = await prisma.category.findMany({
      where: { householdId },
      select: { id: true }
    })
    const categoryIds = categories.map(c => c.id)

    if (categoryIds.length > 0) {
      await prisma.activity.deleteMany({ where: { categoryId: { in: categoryIds } } })
    }
    await prisma.category.deleteMany({ where: { householdId } })

    // Re-seed with defaults
    await seedHouseholdDefaults(prisma, householdId, sessionUser.id)

    return res.json({
      success: true,
      message: 'All categories and activities have been reset to defaults. Event history has been cleared.'
    })
  } catch (e) {
    console.error('Reset defaults error:', e)
    return res.status(500).json({ error: 'Failed to reset defaults' })
  }
}
