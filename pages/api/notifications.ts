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

    // Find tasks that are overdue or due soon
    const tasks = await prisma.task.findMany({
      where: {
        householdId: user.householdId,
        dueDate: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        dueDate: true
      }
    })

    const notifications: any[] = []

    for (const task of tasks) {
      if (!task.dueDate) continue
      
      const dueDate = new Date(task.dueDate)
      
      if (dueDate < today) {
        notifications.push({
          id: `overdue-${task.id}`,
          type: 'overdue',
          taskId: task.id,
          taskName: task.name,
          dueDate: task.dueDate,
          message: `${task.name} is overdue`
        })
      } else if (dueDate <= nextWeek) {
        notifications.push({
          id: `due-soon-${task.id}`,
          type: 'due-soon',
          taskId: task.id,
          taskName: task.name,
          dueDate: task.dueDate,
          message: `${task.name} is due soon`
        })
      }
    }

    return res.json({ notifications })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
