import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { v4 as uuidv4 } from 'uuid'

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  try{
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
