import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import bcrypt from 'bcryptjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { token } = req.query
      if (!token) return res.status(400).json({ error: 'Token required' })

      const user = await prisma.user.findUnique({ where: { setupToken: String(token) } })
      if (!user) return res.status(404).json({ error: 'Invalid or expired setup link' })

      return res.json({ name: user.name, email: user.email })
    }

    if (req.method === 'POST') {
      const { token, password } = req.body
      if (!token || !password) return res.status(400).json({ error: 'Token and password required' })
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

      const user = await prisma.user.findUnique({ where: { setupToken: String(token) } })
      if (!user) return res.status(404).json({ error: 'Invalid or expired setup link' })

      const passwordHash = await bcrypt.hash(password, 10)
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, setupToken: null }
      })

      return res.json({ success: true, email: user.email })
    }

    res.status(405).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
}
