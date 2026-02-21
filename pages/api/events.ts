import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  try{
    if (req.method === 'POST'){
      const payload = req.body
      if (!payload || !payload.eventType || !payload.recordedById) {
        return res.status(400).json({ error: 'eventType and recordedById are required' })
      }

      // Validate recordedBy user
      const user = await prisma.user.findUnique({ where: { id: payload.recordedById } })
      if (!user) return res.status(400).json({ error: 'Invalid recordedById' })

      const data: any = {
        eventType: payload.eventType,
        recordedById: payload.recordedById,
        occurredAt: payload.occurredAt ? new Date(payload.occurredAt) : new Date()
      }

      // Resolve householdId
      if (payload.householdId) {
        const hh = await prisma.household.findUnique({ where: { id: payload.householdId } })
        if (!hh) return res.status(400).json({ error: 'Invalid householdId' })
        data.householdId = payload.householdId
      } else {
        if (!user.householdId) return res.status(400).json({ error: 'No householdId provided and user has no household' })
        data.householdId = user.householdId
      }

      // Handle activityId — validate, deduplicate DAILY, resolve points
      if (payload.activityId) {
        const activity = await prisma.activity.findUnique({ where: { id: payload.activityId } })
        if (!activity) return res.status(400).json({ error: 'Invalid activityId' })

        // Deduplication: prevent completing a DAILY activity more than once per user per day
        if (activity.frequency === 'DAILY') {
          const startOfDay = new Date()
          startOfDay.setHours(0, 0, 0, 0)
          const endOfDay = new Date()
          endOfDay.setHours(23, 59, 59, 999)

          const existing = await prisma.event.findFirst({
            where: {
              activityId: payload.activityId,
              recordedById: payload.recordedById,
              occurredAt: { gte: startOfDay, lte: endOfDay }
            }
          })
          if (existing) {
            return res.status(409).json({ error: 'You already completed this activity today!' })
          }
        }

        data.activityId = payload.activityId
        data.points = payload.points !== undefined ? Number(payload.points) : activity.defaultPoints
      } else {
        data.points = payload.points !== undefined ? Number(payload.points) : 0
      }

      // Legacy taskId support
      if (payload.taskId) {
        const task = await prisma.task.findUnique({ where: { id: payload.taskId } })
        if (!task) return res.status(400).json({ error: 'Invalid taskId' })
        data.taskId = payload.taskId
      }

      if (payload.meta || payload.metadata) {
        const metaValue = payload.meta || payload.metadata
        data.metadata = typeof metaValue === 'string' ? metaValue : JSON.stringify(metaValue)
      }

      try {
        const e = await prisma.event.create({
          data,
          include: {
            activity: { select: { id: true, name: true, icon: true, defaultPoints: true } }
          }
        })
        return res.json(e)
      } catch(err: any) {
        console.error('prisma event.create error', err)
        if (err?.code === 'P2003') return res.status(400).json({ error: 'Foreign key constraint failed', details: err.meta })
        return res.status(500).json({ error: 'server error' })
      }
    }

    if (req.method === 'GET'){
      const { householdId, userId } = req.query
      const where: any = {}
      if (householdId) where.householdId = String(householdId)
      if (userId) where.recordedById = String(userId)
      const events = await prisma.event.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        take: 100,
        include: {
          activity: { select: { id: true, name: true, icon: true, defaultPoints: true } }
        }
      })
      return res.json(events)
    }

    if (req.method === 'DELETE') {
      const { id } = req.query

      if (!id) {
        return res.status(400).json({ error: 'id is required' })
      }

      const eventId = String(id)

      // Find the event first to return info about what was reverted
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          activity: { select: { id: true, name: true, icon: true, defaultPoints: true } },
          recordedBy: { select: { id: true, name: true } }
        }
      })

      if (!event) {
        return res.status(404).json({ error: 'Event not found' })
      }

      // Delete the event — this automatically reverts scoring since
      // leaderboard/points are computed dynamically from events
      await prisma.event.delete({ where: { id: eventId } })

      return res.json({
        success: true,
        reverted: {
          eventId: event.id,
          activityName: event.activity?.name || event.eventType,
          pointsReverted: event.points,
          user: event.recordedBy?.name || event.recordedById
        }
      })
    }

    res.status(405).end()
  }catch(e){
    console.error(e)
    res.status(500).json({ error: 'server error' })
  }
}
