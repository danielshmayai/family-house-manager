import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import bcrypt from 'bcryptjs'
import { rateLimit } from '../../../lib/rateLimit'
import { seedHouseholdDefaults } from '../../../lib/defaultActivities'

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  try{
    if (req.method !== 'POST') return res.status(405).end()
    if (rateLimit(req, res, { max: 5, windowMs: 60_000, keyPrefix: 'register' })) return

    const { email, password, name, inviteCode, familyName } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
    if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Please provide your name (at least 2 characters)' })

    // Check if email already exists
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return res.status(400).json({ error: 'An account with this email already exists' })

    const hash = await bcrypt.hash(password, 10)

    // --- Path A: Join existing family with invite code ---
    if (inviteCode && inviteCode.trim()) {
      const code = inviteCode.trim().toUpperCase()
      const invite = await prisma.invite.findUnique({ where: { code } })

      if (!invite) return res.status(400).json({ error: 'Invalid invite code. Please check and try again.' })
      if (invite.usedById) return res.status(400).json({ error: 'This invite code has already been used.' })
      if (invite.expiresAt && invite.expiresAt < new Date()) {
        return res.status(400).json({ error: 'This invite code has expired. Ask your family manager for a new one.' })
      }

      const user = await prisma.user.create({
        data: {
          email,
          name: name.trim(),
          passwordHash: hash,
          householdId: invite.householdId,
          role: 'MEMBER'
        }
      })

      // Mark invite as used
      await prisma.invite.update({ where: { id: invite.id }, data: { usedById: user.id } })

      return res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        householdId: user.householdId,
        role: user.role
      })
    }

    // --- Path B: Create a new family (become ADMIN) ---
    const user = await prisma.user.create({
      data: {
        email,
        name: name.trim(),
        passwordHash: hash,
        role: 'ADMIN'
      }
    })

    try {
      const hhName = (familyName && familyName.trim()) ? familyName.trim() : `${name.trim()}'s Family`
      const hh = await prisma.household.create({ data: { name: hhName } })
      await prisma.user.update({ where: { id: user.id }, data: { householdId: hh.id } })

      // Seed default categories and activities for the new household
      try {
        await seedHouseholdDefaults(prisma, hh.id, user.id)
      } catch (seedErr) {
        console.error('Failed to seed defaults (non-fatal):', seedErr)
      }

      return res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        householdId: hh.id,
        role: 'ADMIN'
      })
    } catch (hhErr) {
      console.error('household creation failed', hhErr)
      return res.json({ id: user.id, email: user.email, name: user.name })
    }

  }catch(e){
    console.error(e)
    res.status(500).json({ error: 'Server error. Please try again.' })
  }
}
