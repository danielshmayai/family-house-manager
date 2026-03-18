import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'

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
      const data: any = {}
      if (name !== undefined) data.name = name
      if (role !== undefined) data.role = role
      if ('householdId' in req.body) data.householdId = householdId
      const u = await prisma.user.update({ where: { id }, data, select: SAFE_USER_FIELDS })
      return res.json(u)
    }

    if (req.method === 'PATCH'){
      // Admin resets another user's password
      const session = await getServerSession(req, res, authOptions)
      const callerRole = (session?.user as any)?.role
      if (!session || (callerRole !== 'ADMIN' && callerRole !== 'MANAGER')) {
        return res.status(403).json({ error: 'Forbidden' })
      }
      const { id, newPassword } = req.body
      if (!id || !newPassword) return res.status(400).json({ error: 'id and newPassword required' })
      if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
      const hash = await bcrypt.hash(newPassword, 10)
      await prisma.user.update({ where: { id }, data: { passwordHash: hash } })
      return res.json({ success: true })
    }

    if (req.method === 'DELETE'){
      const id = req.body?.id || req.query?.id
      if (!id) return res.status(400).json({ error: 'id required' })
      // Delete non-cascade relations first
      await prisma.event.deleteMany({ where: { recordedById: String(id) } })
      await prisma.user.delete({ where: { id: String(id) } })
      return res.json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  }catch(e){
    console.error(e)
    res.status(500).json({ error: 'server error' })
  }
}
