import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { v4 as uuidv4 } from 'uuid'
import { getSessionUser } from '../../../lib/apiAuth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const sessionUser = await getSessionUser(req, res)
    if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' })
    if (sessionUser.role !== 'ADMIN' && sessionUser.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Managers only' })
    }
    if (!sessionUser.householdId) return res.status(400).json({ error: 'No household found' })

    const { name, email, role = 'MEMBER' } = req.body
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' })

    const exists = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
    if (exists) return res.status(400).json({ error: 'An account with this email already exists' })

    const setupToken = uuidv4()
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash: null,
        role: ['ADMIN', 'MANAGER', 'MEMBER'].includes(role) ? role : 'MEMBER',
        householdId: sessionUser.householdId,
        setupToken,
      }
    })

    const proto = (req.headers['x-forwarded-proto'] as string) || 'http'
    const host = req.headers.host || 'localhost:3000'
    const setupLink = `${proto}://${host}/auth/setup?token=${setupToken}`

    return res.json({ userId: user.id, setupLink })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
}
