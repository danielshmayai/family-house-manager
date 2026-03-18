import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { email, code, newPassword } = await req.json()

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: 'Email, code and new password are required' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const otp = await prisma.otpCode.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        code,
        type: 'password-reset',
        used: false,
        expiresAt: { gt: new Date() },
      },
    })

    if (!otp) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
    }

    // Mark code as used
    await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } })

    // Update password
    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { email: email.toLowerCase().trim() },
      data: { passwordHash },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[reset-password]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
