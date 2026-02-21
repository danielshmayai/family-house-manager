import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  try{
    if (req.method === 'GET'){
      const { id, householdId, includeInactive } = req.query
      
      if (id) {
        const category = await prisma.category.findUnique({
          where: { id: String(id) },
          include: { 
            activities: {
              where: includeInactive ? {} : { isActive: true },
              orderBy: [{ position: 'asc' }, { createdAt: 'asc' }]
            }
          }
        })
        return res.json(category)
      }

      const where: any = {}
      if (householdId) where.householdId = String(householdId)
      if (!includeInactive) where.isActive = true

      const cats = await prisma.category.findMany({ 
        where,
        include: { 
          activities: {
            where: includeInactive ? {} : { isActive: true },
            orderBy: [{ position: 'asc' }, { createdAt: 'asc' }]
          }
        },
        orderBy: [
          { position: 'asc' },
          { createdAt: 'asc' }
        ]
      })
      return res.json(cats)
    }

    if (req.method === 'POST'){
      const { key, name, description, icon, color, position, isActive, householdId } = req.body
      if (!name) return res.status(400).json({ error: 'name is required' })
      
      const c = await prisma.category.create({ 
        data: {
          key: key || `category_${Date.now()}`,
          name,
          description,
          icon,
          color,
          position: position || 0,
          isActive: isActive !== undefined ? isActive : true,
          householdId
        }
      })
      return res.json(c)
    }

    if (req.method === 'PUT' || req.method === 'PATCH'){
      const payload = req.body || {}
      const id = payload.id || req.query.id
      if (!id) return res.status(400).json({ error: 'missing id' })
      
      const updateData: any = {}
      if (payload.name !== undefined) updateData.name = payload.name
      if (payload.description !== undefined) updateData.description = payload.description
      if (payload.icon !== undefined) updateData.icon = payload.icon
      if (payload.color !== undefined) updateData.color = payload.color
      if (payload.position !== undefined) updateData.position = payload.position
      if (payload.isActive !== undefined) updateData.isActive = payload.isActive
      
      const updated = await prisma.category.update({ 
        where: { id: String(id) }, 
        data: updateData,
        include: { activities: true }
      })
      return res.json(updated)
    }

    if (req.method === 'DELETE'){
      const id = req.query.id
      if (!id) return res.status(400).json({ error: 'missing id' })
      await prisma.category.delete({ where: { id: String(id) } })
      return res.json({ ok: true })
    }

    res.status(405).end()
  }catch(e: any){
    console.error(e)
    res.status(500).json({ error: e.message || 'server error' })
  }
}
