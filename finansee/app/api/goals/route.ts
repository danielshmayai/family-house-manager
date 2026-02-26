import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const goals = await prisma.financialGoal.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(goals)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await req.json()
  const goal = await prisma.financialGoal.create({
    data: {
      userId: user.id,
      name: body.name,
      targetAmount: parseFloat(body.targetAmount),
      currentAmount: parseFloat(body.currentAmount || 0),
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
      category: body.category,
      notes: body.notes,
    },
  })
  return NextResponse.json(goal, { status: 201 })
}
