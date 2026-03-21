import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { getSessionUser, isManager } from '../../lib/apiAuth'

const TASKS_BONUS_POINTS = 20

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sessionUser = await getSessionUser(req, res)
  if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' })
  if (!sessionUser.householdId) return res.status(400).json({ error: 'No household' })

  // ── GET: fetch tasks for a user ───────────────────────────────────────────
  if (req.method === 'GET') {
    const targetUserId = (req.query.userId as string) || sessionUser.id

    // Only managers can view other users' tasks
    if (targetUserId !== sessionUser.id && !isManager(sessionUser.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const tasks = await prisma.userTask.findMany({
      where: {
        assignedToId: targetUserId,
        householdId: sessionUser.householdId
      },
      include: {
        assignedBy: { select: { id: true, name: true, role: true } },
        assignedTo: { select: { id: true, name: true } },
        activity: { select: { id: true, name: true, icon: true, defaultPoints: true } }
      },
      orderBy: [{ isCompleted: 'asc' }, { createdAt: 'desc' }]
    })

    return res.status(200).json(tasks)
  }

  // ── POST: create a new task ───────────────────────────────────────────────
  if (req.method === 'POST') {
    const { title, description, assignedToId, activityId } = req.body

    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' })

    const targetId = assignedToId || sessionUser.id

    // Members can only assign tasks to themselves
    if (targetId !== sessionUser.id && !isManager(sessionUser.role)) {
      return res.status(403).json({ error: 'Members can only create tasks for themselves' })
    }

    // Verify target user belongs to same household
    const targetUser = await prisma.user.findFirst({
      where: { id: targetId, householdId: sessionUser.householdId }
    })
    if (!targetUser) return res.status(400).json({ error: 'Target user not found in household' })

    const task = await prisma.userTask.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        activityId: activityId || null,
        assignedById: sessionUser.id,
        assignedToId: targetId,
        householdId: sessionUser.householdId
      },
      include: {
        assignedBy: { select: { id: true, name: true, role: true } },
        assignedTo: { select: { id: true, name: true } },
        activity: { select: { id: true, name: true, icon: true, defaultPoints: true } }
      }
    })

    return res.status(201).json(task)
  }

  // ── PUT: toggle task completion ───────────────────────────────────────────
  if (req.method === 'PUT') {
    const { id, isCompleted } = req.body

    if (!id) return res.status(400).json({ error: 'Task id is required' })

    const task = await prisma.userTask.findUnique({
      where: { id },
      include: {
        assignedBy: { select: { role: true } },
        activity: { select: { id: true, defaultPoints: true } }
      }
    })
    if (!task) return res.status(404).json({ error: 'Task not found' })
    if (task.householdId !== sessionUser.householdId) return res.status(403).json({ error: 'Forbidden' })

    // Only the assigned user or a manager can toggle completion
    if (task.assignedToId !== sessionUser.id && !isManager(sessionUser.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const updatedTask = await prisma.userTask.update({
      where: { id },
      data: {
        isCompleted: !!isCompleted,
        completedAt: isCompleted ? new Date() : null
      },
      include: {
        assignedBy: { select: { id: true, name: true, role: true } },
        assignedTo: { select: { id: true, name: true } },
        activity: { select: { id: true, name: true, icon: true, defaultPoints: true } }
      }
    })

    // If completing a task linked to an activity, fire an Event for it
    if (isCompleted && task.activityId && task.activity) {
      await prisma.event.create({
        data: {
          eventType: 'ACTIVITY_COMPLETED',
          recordedById: task.assignedToId,
          householdId: task.householdId,
          activityId: task.activityId,
          points: task.activity.defaultPoints,
          metadata: JSON.stringify({ source: 'task', taskId: task.id })
        }
      })
    }

    // Check if bonus should be awarded (only when completing, not un-completing)
    let bonusGranted = false
    if (isCompleted) {
      // Manager-assigned tasks = tasks where assignedById !== assignedToId
      const allManagerTasks = await prisma.userTask.findMany({
        where: {
          assignedToId: task.assignedToId,
          householdId: task.householdId,
          // exclude self-assigned
          NOT: { assignedById: task.assignedToId }
        }
      })

      const allComplete = allManagerTasks.length > 0 && allManagerTasks.every((ut: { isCompleted: boolean }) => ut.isCompleted)

      if (allComplete) {
        // Check if bonus was already awarded for this user (not yet revoked)
        const existingBonus = await prisma.event.findFirst({
          where: {
            recordedById: task.assignedToId,
            householdId: task.householdId,
            eventType: 'BONUS_TASKS_COMPLETED'
          }
        })

        if (!existingBonus) {
          await prisma.event.create({
            data: {
              eventType: 'BONUS_TASKS_COMPLETED',
              recordedById: task.assignedToId,
              householdId: task.householdId,
              points: TASKS_BONUS_POINTS,
              metadata: JSON.stringify({ tasksBonus: true })
            }
          })
          bonusGranted = true
        }
      }
    }

    // If un-completing a manager task, revoke the bonus event so it can be earned again
    if (!isCompleted && task.assignedById !== task.assignedToId) {
      await prisma.event.deleteMany({
        where: {
          recordedById: task.assignedToId,
          householdId: task.householdId,
          eventType: 'BONUS_TASKS_COMPLETED'
        }
      })
    }

    return res.status(200).json({ task: updatedTask, bonusGranted })
  }

  // ── DELETE: delete a task ─────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.query

    if (!id) return res.status(400).json({ error: 'Task id is required' })

    const task = await prisma.userTask.findUnique({ where: { id: id as string } })
    if (!task) return res.status(404).json({ error: 'Task not found' })
    if (task.householdId !== sessionUser.householdId) return res.status(403).json({ error: 'Forbidden' })

    // Managers can delete any task; any user can cancel/delete tasks assigned to them
    if (!isManager(sessionUser.role) && task.assignedToId !== sessionUser.id) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    await prisma.userTask.delete({ where: { id: id as string } })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
