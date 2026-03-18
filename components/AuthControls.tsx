"use client"
import React from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

export default function AuthControls() {
  const { data: session } = useSession()

  if (session?.user) {
    const user = session.user as any
    const roleBadge = user.role === 'ADMIN' ? '👑' : user.role === 'MANAGER' ? '⭐' : '👤'
    return (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {roleBadge} {user.name || user.email}
        </span>
        <button
          onClick={async () => { await signOut({ redirect: false }); window.location.href = '/auth/login' }}
          style={{
            padding: '6px 14px', background: 'rgba(255,255,255,0.25)',
            border: '1px solid rgba(255,255,255,0.4)', borderRadius: '8px',
            color: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <Link href="/auth/login">
        <button style={{
          padding: '6px 14px', background: 'rgba(255,255,255,0.25)',
          border: '1px solid rgba(255,255,255,0.4)', borderRadius: '8px',
          color: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent'
        }}>Sign in</button>
      </Link>
      <Link href="/auth/register">
        <button style={{
          padding: '6px 14px', background: 'white', border: 'none',
          borderRadius: '8px', color: '#667eea', fontSize: '12px',
          fontWeight: '700', cursor: 'pointer', WebkitTapHighlightColor: 'transparent'
        }}>Sign up</button>
      </Link>
    </div>
  )
}
