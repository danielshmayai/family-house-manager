import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendPasswordResetEmail, emailConfigured } from '@/lib/email'

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })

    // Always respond success to avoid leaking which emails are registered
    if (!user) {
      return NextResponse.json({ success: true, emailSent: emailConfigured })
    }

    const code = generateCode()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 min

    // Invalidate any existing password-reset codes for this email
    await prisma.otpCode.updateMany({
      where: { email: user.email, type: 'password-reset', used: false },
      data: { used: true },
    })

    await prisma.otpCode.create({
      data: { email: user.email, code, type: 'password-reset', expiresAt },
    })

    await sendPasswordResetEmail(user.email, code)

    return NextResponse.json({ success: true, emailSent: emailConfigured })
  } catch (err) {
    console.error('[forgot-password]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
