import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../pages/api/auth/[...nextauth]'
import prisma from './prisma'

export type SessionUser = {
  id: string
  name: string | null
  email: string
  role: string
  householdId: string | null
}

/**
 * Get the authenticated user from the session.
 * Returns null if not authenticated.
 */
export async function getSessionUser(req: NextApiRequest, res: NextApiResponse): Promise<SessionUser | null> {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) return null
  return (session.user as any) as SessionUser
}

/**
 * Verify that a user belongs to the given household.
 */
export async function verifyHouseholdAccess(userId: string, householdId: string): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { id: userId, householdId },
    select: { id: true }
  })
  return !!user
}

/**
 * Check if user has manager-level permissions (ADMIN or MANAGER role).
 */
export function isManager(role: string): boolean {
  return role === 'ADMIN' || role === 'MANAGER'
}
