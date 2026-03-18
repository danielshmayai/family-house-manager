import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { language } = await req.json()
  if (language !== 'en' && language !== 'he') {
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 })
  }

  const cookieStore = await cookies()
  cookieStore.set('lang', language, { maxAge: 60 * 60 * 24 * 365, path: '/' })

  try {
    const session = await getServerSession(authOptions)
    if (session?.user) {
      await prisma.user.update({
        where: { id: (session.user as any).id },
        data: { language },
      })
    }
  } catch {}

  return NextResponse.json({ ok: true })
}
