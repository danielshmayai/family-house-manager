import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { runForecast } from '@/lib/forecasting'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await req.json()
  const { currentAge = 35, retirementAge = 67, targetMonthlyIncome = 15000 } = body

  const assets = await prisma.financialAsset.findMany({
    where: { userId: user.id, isActive: true },
  })

  const result = runForecast({
    currentAge,
    retirementAge,
    targetMonthlyIncome,
    assets: assets.map((a: any) => ({
      type: a.type,
      currentValue: a.currentValue,
      monthlyDeposit: a.monthlyDeposit ?? 0,
      employerContribution: a.employerContribution ?? 0,
      expectedReturnRate: a.expectedReturnRate ?? undefined,
      interestRate: a.interestRate ?? undefined,
      maturityDate: a.maturityDate?.toISOString(),
    })),
  })

  return NextResponse.json(result)
}
