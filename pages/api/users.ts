import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  try{
    if (req.method === 'GET'){
      const { householdId } = req.query
      const where: any = {}
      if (householdId) where.householdId = String(householdId)
      const users = await prisma.user.findMany({ where })
      return res.json(users)
    }

    if (req.method === 'PUT'){
      const { id, name, role, householdId } = req.body
      if (!id) return res.status(400).json({ error: 'id required' })
      const u = await prisma.user.update({ where: { id }, data: { name, role, householdId } })
      return res.json(u)
    }

    res.status(405).end()
  }catch(e){
    console.error(e)
    res.status(500).json({ error: 'server error' })
  }
}
