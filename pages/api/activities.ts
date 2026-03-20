import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/apiAuth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sessionUser = await getSessionUser(req, res)
  if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' })
  if (!sessionUser.householdId) return res.status(400).json({ error: 'No household' })

  const householdId = sessionUser.householdId

  if (req.method === 'GET') {
    try {
      const { id, categoryId, includeInactive } = req.query

      if (id) {
        const activity = await prisma.activity.findFirst({
          where: { id: String(id), householdId },
          include: { category: true }
        })
        if (!activity) return res.status(404).json({ error: 'Not found' })
        return res.status(200).json(activity)
      }

      const where: any = { householdId }
      if (categoryId) where.categoryId = String(categoryId)
      if (!includeInactive) where.isActive = true

      const activities = await prisma.activity.findMany({
        where,
        include: { category: true },
        orderBy: [
          { position: 'asc' },
          { createdAt: 'asc' }
        ]
      })

      return res.status(200).json(activities)
    } catch (error: any) {
      console.error('GET /api/activities error:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        key,
        categoryId,
        name,
        description,
        icon,
        defaultPoints,
        frequency,
        position,
        isActive,
        requiresNote,
        requiresPhoto,
        config,
        createdById
      } = req.body

      if (!name || !categoryId) {
        return res.status(400).json({ error: 'name and categoryId are required' })
      }

      // Validate point values
      if (defaultPoints !== undefined && (defaultPoints < 1 || defaultPoints > 1000)) {
        return res.status(400).json({ error: 'defaultPoints must be between 1 and 1000' })
      }

      const activity = await prisma.activity.create({
        data: {
          key: key || `activity_${Date.now()}`,
          categoryId,
          householdId,
          name,
          description,
          icon,
          defaultPoints: defaultPoints || 10,
          frequency: frequency || 'DAILY',
          position: position || 0,
          isActive: isActive !== undefined ? isActive : true,
          requiresNote: requiresNote || false,
          requiresPhoto: requiresPhoto || false,
          config: config ? JSON.stringify(config) : null,
          createdById: createdById || sessionUser.id
        },
        include: { category: true }
      })

      return res.status(201).json(activity)
    } catch (error: any) {
      console.error('POST /api/activities error:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method === 'PUT') {
    try {
      const {
        id,
        name,
        description,
        icon,
        defaultPoints,
        frequency,
        position,
        isActive,
        requiresNote,
        requiresPhoto,
        config
      } = req.body

      if (!id) {
        return res.status(400).json({ error: 'id is required' })
      }

      if (defaultPoints !== undefined && (defaultPoints < 1 || defaultPoints > 1000)) {
        return res.status(400).json({ error: 'defaultPoints must be between 1 and 1000' })
      }

      const updateData: any = {}
      if (name !== undefined) updateData.name = name
      if (description !== undefined) updateData.description = description
      if (icon !== undefined) updateData.icon = icon
      if (defaultPoints !== undefined) updateData.defaultPoints = defaultPoints
      if (frequency !== undefined) updateData.frequency = frequency
      if (position !== undefined) updateData.position = position
      if (isActive !== undefined) updateData.isActive = isActive
      if (requiresNote !== undefined) updateData.requiresNote = requiresNote
      if (requiresPhoto !== undefined) updateData.requiresPhoto = requiresPhoto
      if (config !== undefined) updateData.config = JSON.stringify(config)

      const activity = await prisma.activity.update({
        where: { id },
        data: updateData,
        include: { category: true }
      })

      return res.status(200).json(activity)
    } catch (error: any) {
      console.error('PUT /api/activities error:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query

      if (!id) {
        return res.status(400).json({ error: 'id is required' })
      }

      const activityId = String(id)

      // First, delete all events referencing this activity (cascade effect on scoring)
      const deletedEvents = await prisma.event.deleteMany({
        where: { activityId }
      })

      // Then delete the activity itself
      await prisma.activity.delete({
        where: { id: activityId }
      })

      return res.status(200).json({
        success: true,
        cascaded: { eventsDeleted: deletedEvents.count }
      })
    } catch (error: any) {
      console.error('DELETE /api/activities error:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
