import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendOtpEmail } from '@/lib/email'

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const code = generateOtp()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 min

  // Invalidate old codes
  await prisma.otpCode.updateMany({
    where: { email, used: false },
    data: { used: true },
  })

  await prisma.otpCode.create({
    data: { email, code, expiresAt },
  })

  await sendOtpEmail(email, code)

  return NextResponse.json({ success: true, message: 'OTP sent' })
}

export async function PUT(req: NextRequest) {
  const { email, code } = await req.json()
  if (!email || !code) return NextResponse.json({ error: 'Email and code required' }, { status: 400 })

  const otp = await prisma.otpCode.findFirst({
    where: {
      email,
      code,
      used: false,
      expiresAt: { gt: new Date() },
    },
  })

  if (!otp) return NextResponse.json({ valid: false, error: 'Invalid or expired code' }, { status: 400 })

  await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } })
  return NextResponse.json({ valid: true })
}
