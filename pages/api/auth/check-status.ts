/**
 * GET /api/auth/check-status?email=...
 * Returns the approvalStatus for an email — used by the login page
 * to show a friendlier "pending approval" message instead of "wrong credentials".
 * No sensitive data is exposed (only the approval status).
 */
import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { email } = req.query
  if (!email || typeof email !== 'string') return res.status(400).json({ status: 'unknown' })

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { approvalStatus: true },
  })

  if (!user) return res.json({ status: 'not_found' })
  return res.json({ status: user.approvalStatus })
}
