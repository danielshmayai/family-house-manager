import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { method, nextUrl } = req
  const path = nextUrl.pathname + (nextUrl.search || '')

  // Skip health endpoint to avoid log spam
  if (path.startsWith('/api/health')) {
    return NextResponse.next()
  }

  const ts = new Date().toISOString()
  console.log(`[req] ${ts} ${method} ${path}`)

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
