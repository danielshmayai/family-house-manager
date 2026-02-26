import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  try{
    const SAFE_USER_FIELDS = {
      id: true, email: true, name: true, householdId: true,
      role: true, language: true, theme: true, otpEnabled: true, createdAt: true,
    } as const

    if (req.method === 'GET'){
      const { householdId } = req.query
      const where: any = {}
      if (householdId) where.householdId = String(householdId)
      const users = await prisma.user.findMany({ where, select: SAFE_USER_FIELDS })
      return res.json(users)
    }

    if (req.method === 'PUT'){
      const { id, name, role, householdId } = req.body
      if (!id) return res.status(400).json({ error: 'id required' })
      const u = await prisma.user.update({ where: { id }, data: { name, role, householdId }, select: SAFE_USER_FIELDS })
      return res.json(u)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  }catch(e){
    console.error(e)
    res.status(500).json({ error: 'server error' })
  }
}
