import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password, name } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
  if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Please provide your name (at least 2 characters)' })

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) return res.status(400).json({ error: 'An account with this email already exists' })

  const hash = await bcrypt.hash(password, 10)

  try {
    const user = await prisma.user.create({
      data: { email, name: name.trim(), passwordHash: hash },
    })
    return res.json({ id: user.id, email: user.email, name: user.name })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Server error. Please try again.' })
  }
}
