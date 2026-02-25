import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const { setupKey } = await req.json()
  if (setupKey !== process.env.SETUP_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const hash = await bcrypt.hash('demo123', 10)
    const user = await prisma.user.upsert({
      where: { email: 'demo@finansee.app' },
      update: {},
      create: {
        email: 'demo@finansee.app',
        name: 'ישראל ישראלי',
        passwordHash: hash,
        role: 'ADMIN',
        language: 'he',
        theme: 'light',
      },
    })

    const assets = [
      { type: 'INVESTMENT', name: 'תיק מניות IBI', institution: 'IBI', currency: 'ILS', currentValue: 185000, expectedReturnRate: 8 },
      { type: 'PENSION', name: 'קרן פנסיה הפניקס', institution: 'הפניקס', currency: 'ILS', currentValue: 420000, monthlyDeposit: 1800, employerContribution: 2700, expectedReturnRate: 5.5 },
      { type: 'PROVIDENT', name: 'קופת גמל מגדל', institution: 'מגדל', currency: 'ILS', currentValue: 85000, monthlyDeposit: 500, employerContribution: 750, expectedReturnRate: 5 },
      { type: 'STUDY_FUND', name: 'קרן השתלמות כלל', institution: 'כלל ביטוח', currency: 'ILS', currentValue: 62000, monthlyDeposit: 600, employerContribution: 1800, expectedReturnRate: 5.5 },
      { type: 'SAVINGS', name: 'פיקדון לאומי', institution: 'בנק לאומי', currency: 'ILS', currentValue: 100000, interestRate: 4.5, maturityDate: new Date('2026-06-01') },
      { type: 'CHECKING', name: 'חשבון עו"ש לאומי', institution: 'בנק לאומי', currency: 'ILS', currentValue: 28000 },
    ]

    for (const a of assets) {
      const asset = await prisma.financialAsset.upsert({
        where: { id: `demo-${a.type.toLowerCase()}` },
        update: { currentValue: a.currentValue },
        create: { id: `demo-${a.type.toLowerCase()}`, userId: user.id, ...a },
      })
      await prisma.assetSnapshot.create({
        data: { assetId: asset.id, userId: user.id, value: a.currentValue, date: new Date() },
      })
    }

    return NextResponse.json({ success: true, message: 'Demo data seeded' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
