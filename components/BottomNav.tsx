"use client"
import React from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useLang } from '@/lib/language-context'
import { t } from '@/lib/i18n'

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/auth/setup']

export default function BottomNav() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { lang } = useLang()

  if (status !== 'authenticated') return null
  if (pathname && AUTH_PATHS.some(p => pathname.startsWith(p))) return null

  const sessionUser = session?.user as any
  const isManager = sessionUser?.role === 'ADMIN' || sessionUser?.role === 'MANAGER'
  const isProductAdmin = sessionUser?.email === (process.env.NEXT_PUBLIC_PRODUCT_ADMIN_EMAIL || 'danielshmayai@gmail.com')

  const links = [
    { path: '/', icon: '🏠', labelKey: 'navHome' as const },
    { path: '/my-tasks', icon: '✅', labelKey: 'navMyTasks' as const },
    { path: '/history', icon: '📜', labelKey: 'navHistory' as const },
    { path: '/wallet', icon: '💰', labelKey: 'navWallet' as const },
    { path: '/leaderboard', icon: '🏆', labelKey: 'navRankings' as const },
    { path: '/users', icon: '👥', labelKey: 'navFamily' as const },
    ...(isManager ? [{ path: '/admin', icon: '⚙️', labelKey: 'navManage' as const }] : []),
    ...(isProductAdmin ? [{ path: '/product-admin', icon: '🛡️', labelKey: 'navHome' as const, label: 'ניהול' }] : []),
  ]

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'white', borderTop: '1px solid #E5E7EB',
      padding: 'clamp(6px, 2vw, 10px) 0',
      boxShadow: '0 -4px 16px rgba(0,0,0,0.08)', zIndex: 100,
    }}>
      <div style={{
        maxWidth: '600px', margin: '0 auto',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      }}>
        {links.map(item => {
          const isActive = item.path === '/' ? pathname === '/' : (pathname ?? '').startsWith(item.path)
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                padding: 'clamp(4px, 1.5vw, 6px) clamp(6px, 2vw, 14px)',
                minHeight: '48px', minWidth: '48px',
                color: isActive ? '#1a56db' : '#9CA3AF',
                fontWeight: isActive ? '800' : '600',
                fontSize: 'clamp(10px, 2.5vw, 12px)',
                WebkitTapHighlightColor: 'transparent',
                position: 'relative',
              }}
            >
              {isActive && (
                <span style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: '24px', height: '3px', background: '#1a56db', borderRadius: '0 0 3px 3px',
                }} />
              )}
              <span style={{ fontSize: 'clamp(20px, 5vw, 24px)' }}>{item.icon}</span>
              {(item as any).label || t(lang, item.labelKey)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
