import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const asset = await prisma.financialAsset.findFirst({
    where: { id, userId: user.id },
  })
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const prevValue = asset.currentValue

  // Explicitly pick only user-editable fields — never allow overwriting id, userId, createdAt
  const updated = await prisma.financialAsset.update({
    where: { id },
    data: {
      name: body.name ?? asset.name,
      institution: body.institution ?? asset.institution,
      accountNumber: body.accountNumber ?? asset.accountNumber,
      notes: body.notes ?? asset.notes,
      ticker: body.ticker ?? asset.ticker,
      bankCode: body.bankCode ?? asset.bankCode,
      branchCode: body.branchCode ?? asset.branchCode,
      currentValue: body.currentValue != null ? parseFloat(body.currentValue) : asset.currentValue,
      interestRate: body.interestRate != null ? parseFloat(body.interestRate) : asset.interestRate,
      monthlyDeposit: body.monthlyDeposit != null ? parseFloat(body.monthlyDeposit) : asset.monthlyDeposit,
      employerContribution: body.employerContribution != null ? parseFloat(body.employerContribution) : asset.employerContribution,
      expectedReturnRate: body.expectedReturnRate != null ? parseFloat(body.expectedReturnRate) : asset.expectedReturnRate,
      quantity: body.quantity != null ? parseFloat(body.quantity) : asset.quantity,
      purchasePrice: body.purchasePrice != null ? parseFloat(body.purchasePrice) : asset.purchasePrice,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : asset.purchaseDate,
      maturityDate: body.maturityDate ? new Date(body.maturityDate) : asset.maturityDate,
      updatedAt: new Date(),
    },
  })

  // If value changed significantly, add snapshot
  const newValue = updated.currentValue
  if (Math.abs(newValue - prevValue) / Math.max(prevValue, 1) > 0.001) {
    await prisma.assetSnapshot.create({
      data: {
        assetId: id,
        userId: user.id,
        value: newValue,
        date: new Date(),
      },
    })

    // Check for big changes and create notification
    const changePct = ((newValue - prevValue) / Math.max(prevValue, 1)) * 100
    if (Math.abs(changePct) >= 5) {
      const direction = changePct > 0 ? 'עלה' : 'ירד'
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'VALUE_CHANGE',
          title: `שינוי גדול: ${asset.name}`,
          titleHe: `שינוי גדול: ${asset.name}`,
          message: `${asset.name} ${direction} ב-${Math.abs(changePct).toFixed(1)}%`,
          messageHe: `${asset.name} ${direction} ב-${Math.abs(changePct).toFixed(1)}%`,
        },
      })
    }
  }

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  await prisma.financialAsset.updateMany({
    where: { id, userId: user.id },
    data: { isActive: false },
  })
  return NextResponse.json({ success: true })
}
