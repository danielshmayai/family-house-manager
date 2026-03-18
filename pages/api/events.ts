import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { getSessionUser, verifyHouseholdAccess } from '../../lib/apiAuth'
import { rateLimit } from '../../lib/rateLimit'

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  try{
    if (req.method === 'POST'){
      if (rateLimit(req, res, { max: 30, windowMs: 60_000, keyPrefix: 'events-post' })) return
      const payload = req.body
      if (!payload || !payload.eventType || !payload.recordedById) {
        return res.status(400).json({ error: 'eventType and recordedById are required' })
      }

      // Auth check: verify session user matches recordedById or is a manager
      const sessionUser = await getSessionUser(req, res)
      if (sessionUser && sessionUser.id !== payload.recordedById) {
        const role = sessionUser.role
        if (role !== 'ADMIN' && role !== 'MANAGER') {
          return res.status(403).json({ error: 'You can only record events for yourself' })
        }
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

      // Permission check: user must belong to this household
      if (sessionUser) {
        const hasAccess = await verifyHouseholdAccess(sessionUser.id, data.householdId)
        if (!hasAccess) {
          return res.status(403).json({ error: 'You do not have access to this household' })
        }
      }

      // Handle activityId — validate, deduplicate DAILY, resolve points
      if (payload.activityId) {
        const activity = await prisma.activity.findUnique({ where: { id: payload.activityId } })
        if (!activity) return res.status(400).json({ error: 'Invalid activityId' })

        // Deduplication: prevent completing a DAILY activity more than once per user per day
        // Use client-provided day boundaries if available, otherwise use server time
        if (activity.frequency === 'DAILY') {
          let startOfDay: Date
          let endOfDay: Date

          if (payload.dayStart && payload.dayEnd) {
            // Client sends their local day boundaries as ISO strings
            startOfDay = new Date(payload.dayStart)
            endOfDay = new Date(payload.dayEnd)
            // Sanity check: boundaries should be within ~25 hours of each other
            const diff = endOfDay.getTime() - startOfDay.getTime()
            if (diff < 0 || diff > 25 * 60 * 60 * 1000) {
              return res.status(400).json({ error: 'Invalid day boundaries' })
            }
          } else {
            startOfDay = new Date()
            startOfDay.setHours(0, 0, 0, 0)
            endOfDay = new Date()
            endOfDay.setHours(23, 59, 59, 999)
          }

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

        // Enforce requiresNote
        if (activity.requiresNote && !payload.metadata) {
          return res.status(400).json({ error: 'This activity requires a note' })
        }

        // Enforce requiresPhoto
        if (activity.requiresPhoto) {
          let meta: any = {}
          try { meta = JSON.parse(payload.metadata || '{}') } catch {}
          if (!meta.photo) {
            return res.status(400).json({ error: 'This activity requires a photo' })
          }
        }

        data.activityId = payload.activityId

        // Resolve points: use activity default unless client provides a valid positive value
        const clientPoints = payload.points !== undefined && payload.points !== null ? Number(payload.points) : null
        data.points = (clientPoints !== null && clientPoints > 0) ? clientPoints : activity.defaultPoints
      } else {
        const clientPoints = payload.points !== undefined && payload.points !== null ? Number(payload.points) : 0
        data.points = clientPoints >= 0 ? clientPoints : 0
      }

      // Validate point range
      if (data.points < 0 || data.points > 10000) {
        return res.status(400).json({ error: 'Points must be between 0 and 10000' })
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

      // Permission check for GET
      const sessionUser = await getSessionUser(req, res)
      if (sessionUser && householdId) {
        const hasAccess = await verifyHouseholdAccess(sessionUser.id, String(householdId))
        if (!hasAccess) {
          return res.status(403).json({ error: 'You do not have access to this household' })
        }
      }

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

      // Permission check: only the user who recorded or a manager can delete
      const sessionUser = await getSessionUser(req, res)
      if (sessionUser && sessionUser.id !== event.recordedById) {
        if (sessionUser.role !== 'ADMIN' && sessionUser.role !== 'MANAGER') {
          return res.status(403).json({ error: 'You can only undo your own events' })
        }
      }

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
