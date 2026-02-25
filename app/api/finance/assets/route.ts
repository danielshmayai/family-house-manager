import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  const assets = await prisma.financialAsset.findMany({
    where: { userId: user.id, isActive: true, ...(type ? { type } : {}) },
    orderBy: { currentValue: 'desc' },
    include: {
      snapshots: {
        orderBy: { date: 'asc' },
        take: 24,
      },
    },
  })
  return NextResponse.json(assets)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await req.json()
  const {
    type, name, institution, accountNumber, currency = 'ILS',
    currentValue, ticker, quantity, purchasePrice, purchaseDate,
    interestRate, maturityDate, monthlyDeposit, employerContribution,
    expectedReturnRate, bankCode, branchCode, notes,
  } = body

  const asset = await prisma.financialAsset.create({
    data: {
      userId: user.id,
      type, name, institution, accountNumber, currency,
      currentValue: parseFloat(currentValue) || 0,
      ticker, quantity: quantity ? parseFloat(quantity) : null,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      interestRate: interestRate ? parseFloat(interestRate) : null,
      maturityDate: maturityDate ? new Date(maturityDate) : null,
      monthlyDeposit: monthlyDeposit ? parseFloat(monthlyDeposit) : null,
      employerContribution: employerContribution ? parseFloat(employerContribution) : null,
      expectedReturnRate: expectedReturnRate ? parseFloat(expectedReturnRate) : null,
      bankCode, branchCode, notes,
    },
  })

  // Create initial snapshot
  await prisma.assetSnapshot.create({
    data: {
      assetId: asset.id,
      userId: user.id,
      value: asset.currentValue,
      date: new Date(),
    },
  })

  return NextResponse.json(asset, { status: 201 })
}
