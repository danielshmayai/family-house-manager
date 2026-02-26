import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'
import prisma from '../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const userId = (session.user as any).id
  if (!userId) {
    return res.status(400).json({ error: 'User ID not found' })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { householdId: true }
    })

    if (!user?.householdId) {
      return res.json({ notifications: [] })
    }

    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    // Query activities that may need attention (using actual schema fields)
    // Task model does not have householdId or dueDate — use Activity instead
    const activities = await prisma.activity.findMany({
      where: {
        category: { householdId: user.householdId },
        isActive: true,
      },
      select: { id: true, name: true, frequency: true },
      take: 50,
    })

    const notifications: any[] = []

    // Notify about DAILY activities that haven't been completed today
    const startOfDay = new Date(today)
    startOfDay.setHours(0, 0, 0, 0)

    for (const activity of activities) {
      if (activity.frequency !== 'DAILY') continue

      const completedToday = await prisma.event.findFirst({
        where: {
          activityId: activity.id,
          occurredAt: { gte: startOfDay },
          recordedBy: { householdId: user.householdId },
        },
      })

      if (!completedToday) {
        notifications.push({
          id: `pending-${activity.id}`,
          type: 'pending-activity',
          activityId: activity.id,
          activityName: activity.name,
          message: `${activity.name} hasn't been done today`,
        })
      }
    }

    return res.json({ notifications })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
