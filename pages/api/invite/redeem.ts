import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  try{
    if (req.method !== 'POST') return res.status(405).end()
    const { code, userId } = req.body
    if (!code || !userId) return res.status(400).json({ error: 'code and userId required' })
    const invite = await prisma.invite.findUnique({ where: { code } })
    if (!invite) return res.status(404).json({ error: 'invite not found' })
    // join household
    const user = await prisma.user.update({ where: { id: userId }, data: { householdId: invite.householdId } })
    await prisma.invite.update({ where: { code }, data: { usedById: userId } })
    return res.json({ ok: true, householdId: invite.householdId })
  }catch(e){
    console.error(e)
    res.status(500).json({ error: 'server error' })
  }
}
