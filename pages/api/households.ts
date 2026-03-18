import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { v4 as uuidv4 } from 'uuid'
import { getSessionUser } from '../../lib/apiAuth'

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  try{
    if (req.method === 'DELETE') {
      const sessionUser = await getSessionUser(req, res)
      if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' })
      if (sessionUser.role !== 'ADMIN') return res.status(403).json({ error: 'Only admin can delete the household' })
      const householdId = sessionUser.householdId
      if (!householdId) return res.status(400).json({ error: 'No household found' })

      // Delete in correct FK order
      await prisma.event.deleteMany({ where: { householdId } })
      const categories = await prisma.category.findMany({ where: { householdId }, select: { id: true } })
      const catIds = categories.map((c: { id: string }) => c.id)
      if (catIds.length > 0) {
        await prisma.activity.deleteMany({ where: { categoryId: { in: catIds } } })
      }
      await prisma.category.deleteMany({ where: { householdId } })
      await prisma.invite.deleteMany({ where: { householdId } })
      await prisma.user.updateMany({ where: { householdId }, data: { householdId: null, role: 'MEMBER' } })
      await prisma.household.delete({ where: { id: householdId } })

      return res.json({ success: true })
    }

    if (req.method === 'POST'){
      const { name, createdById, action, householdId, email } = req.body
      
      // Generate invite code for existing household
      if (action === 'generateInvite') {
        if (!householdId) return res.status(400).json({ error: 'householdId required' })
        
        const code = uuidv4().substring(0, 8).toUpperCase()
        const invite = await prisma.invite.create({ 
          data: { 
            householdId, 
            code, 
            createdById: createdById || 'system',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
          } 
        })
        return res.json({ code: invite.code, expiresAt: invite.expiresAt })
      }
      
      // Create new household
      const h = await prisma.household.create({ data: { name } })
      // create invite code
      const code = uuidv4()
      await prisma.invite.create({ data: { householdId: h.id, code, createdById } })
      return res.json({ household: h, inviteCode: code })
    }

    if (req.method === 'GET'){
      const { id } = req.query
      const h = await prisma.household.findUnique({ where: { id: String(id) }, include: { members: true } })
      return res.json(h)
    }

    res.status(405).end()
  }catch(e){
    console.error(e)
    res.status(500).json({ error: 'server error' })
  }
}
