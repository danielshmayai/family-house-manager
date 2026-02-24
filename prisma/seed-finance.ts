import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding FinanSee demo data...')

  // Create demo user
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
  console.log('Created demo user:', user.email)

  // Create demo financial assets
  const assets = [
    {
      type: 'INVESTMENT',
      name: 'תיק מניות IBI',
      institution: 'IBI',
      currency: 'ILS',
      currentValue: 185000,
      ticker: 'MIXED',
      quantity: 1,
      purchasePrice: 150000,
      purchaseDate: new Date('2021-01-01'),
      expectedReturnRate: 8,
    },
    {
      type: 'INVESTMENT',
      name: 'S&P 500 ETF',
      institution: 'IBI',
      currency: 'USD',
      currentValue: 95000,
      ticker: 'SPY',
      quantity: 50,
      purchasePrice: 1500,
      purchaseDate: new Date('2020-06-01'),
      expectedReturnRate: 10,
    },
    {
      type: 'PENSION',
      name: 'קרן פנסיה הפניקס',
      institution: 'הפניקס',
      currency: 'ILS',
      currentValue: 420000,
      monthlyDeposit: 1800,
      employerContribution: 2700,
      expectedReturnRate: 5.5,
    },
    {
      type: 'PROVIDENT',
      name: 'קופת גמל מגדל',
      institution: 'מגדל',
      currency: 'ILS',
      currentValue: 85000,
      monthlyDeposit: 500,
      employerContribution: 750,
      expectedReturnRate: 5.0,
    },
    {
      type: 'STUDY_FUND',
      name: 'קרן השתלמות כלל',
      institution: 'כלל ביטוח',
      currency: 'ILS',
      currentValue: 62000,
      monthlyDeposit: 600,
      employerContribution: 1800,
      expectedReturnRate: 5.5,
    },
    {
      type: 'SAVINGS',
      name: 'פיקדון לאומי 5 שנים',
      institution: 'בנק לאומי',
      currency: 'ILS',
      currentValue: 100000,
      interestRate: 4.5,
      maturityDate: new Date('2026-06-01'),
    },
    {
      type: 'SAVINGS',
      name: 'פיקדון קצר - הפועלים',
      institution: 'בנק הפועלים',
      currency: 'ILS',
      currentValue: 30000,
      interestRate: 3.8,
      maturityDate: new Date('2026-04-15'),
    },
    {
      type: 'CHECKING',
      name: 'חשבון עו"ש - לאומי',
      institution: 'בנק לאומי',
      currency: 'ILS',
      currentValue: 28000,
      bankCode: '10',
      branchCode: '700',
    },
  ]

  for (const assetData of assets) {
    const asset = await prisma.financialAsset.create({
      data: {
        userId: user.id,
        ...assetData,
      },
    })

    // Create historical snapshots (monthly for past 12 months)
    const now = new Date()
    for (let m = 12; m >= 0; m--) {
      const date = new Date(now.getFullYear(), now.getMonth() - m, 1)
      const fluctuation = 1 + (Math.random() * 0.1 - 0.05)
      const historicalValue = asset.currentValue * (1 - m * 0.01) * fluctuation
      await prisma.assetSnapshot.create({
        data: {
          assetId: asset.id,
          userId: user.id,
          value: Math.max(0, historicalValue),
          date,
        },
      })
    }
    console.log(`Created asset: ${asset.name}`)
  }

  // Create demo goals
  const goals = [
    {
      name: 'קרן פרישה',
      targetAmount: 3000000,
      currentAmount: 420000,
      category: 'RETIREMENT',
      targetDate: new Date('2050-01-01'),
      notes: 'יעד לפרישה בגיל 67',
    },
    {
      name: 'רכישת דירה',
      targetAmount: 400000,
      currentAmount: 213000,
      category: 'PROPERTY',
      targetDate: new Date('2028-01-01'),
      notes: 'הון עצמי לרכישת דירה',
    },
    {
      name: 'קרן חירום',
      targetAmount: 60000,
      currentAmount: 28000,
      category: 'EMERGENCY',
      notes: '6 חודשי מחיה כרזרבה',
    },
    {
      name: 'לימודי MBA',
      targetAmount: 120000,
      currentAmount: 45000,
      category: 'EDUCATION',
      targetDate: new Date('2027-09-01'),
    },
  ]

  for (const goalData of goals) {
    await prisma.financialGoal.create({
      data: { userId: user.id, ...goalData },
    })
    console.log(`Created goal: ${goalData.name}`)
  }

  // Create demo notifications
  const notifData = [
    {
      userId: user.id,
      type: 'VALUE_CHANGE',
      title: 'S&P 500 ETF עלה ב-7.2%',
      titleHe: 'S&P 500 ETF עלה ב-7.2%',
      message: 'ה-ETF שלך עלה ב-7.2% החודש',
      messageHe: 'ה-ETF שלך עלה ב-7.2% החודש',
      isRead: false,
    },
    {
      userId: user.id,
      type: 'DEPOSIT_EXPIRY',
      title: 'פיקדון לאומי פוקע בעוד 3 חודשים',
      titleHe: 'פיקדון לאומי פוקע בעוד 3 חודשים',
      message: 'הפיקדון בסך ₪100,000 פוקע ב-01/06/2026',
      messageHe: 'הפיקדון בסך ₪100,000 פוקע ב-01/06/2026',
      isRead: false,
    },
    {
      userId: user.id,
      type: 'WEEKLY_SUMMARY',
      title: 'סיכום שבועי - תיק עלה ב-1.3%',
      titleHe: 'סיכום שבועי - תיק עלה ב-1.3%',
      message: 'השבוע התיק שלך עלה ב-1.3%, שווי כולל: ₪1,005,000',
      messageHe: 'השבוע התיק שלך עלה ב-1.3%, שווי כולל: ₪1,005,000',
      isRead: true,
    },
  ]
  for (const n of notifData) {
    await prisma.notification.create({ data: n })
  }

  console.log('✅ Finance seed complete!')
  console.log('Demo login: demo@finansee.app / demo123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
