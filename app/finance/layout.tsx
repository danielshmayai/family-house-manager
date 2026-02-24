'use client'
import './finance.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

const NAV_ITEMS = [
  { href: '/finance', icon: '🏠', labelHe: 'בית', labelEn: 'Home' },
  { href: '/finance/assets', icon: '💼', labelHe: 'נכסים', labelEn: 'Assets' },
  { href: '/finance/forecast', icon: '📈', labelHe: 'תחזית', labelEn: 'Forecast' },
  { href: '/finance/goals', icon: '🎯', labelHe: 'יעדים', labelEn: 'Goals' },
  { href: '/finance/settings', icon: '⚙️', labelHe: 'הגדרות', labelEn: 'Settings' },
]

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [lang, setLang] = useState<'he' | 'en'>('he')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const savedLang = localStorage.getItem('fs_lang') as 'he' | 'en' || 'he'
    const savedTheme = localStorage.getItem('fs_theme') as 'light' | 'dark' || 'light'
    setLang(savedLang)
    setTheme(savedTheme)
  }, [])

  useEffect(() => {
    if (!session) return
    fetch('/api/finance/notifications')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUnread(data.filter((n: any) => !n.isRead).length)
        }
      })
      .catch(() => {})
  }, [session, pathname])

  const isActive = (href: string) =>
    href === '/finance' ? pathname === '/finance' : pathname?.startsWith(href) ?? false

  return (
    <div className="fs-app" data-theme={theme} dir={lang === 'he' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="fs-header">
        <div className="fs-header-logo">FinanSee</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/finance/notifications" style={{ textDecoration: 'none', position: 'relative' }}>
            <span style={{ fontSize: 22 }}>🔔</span>
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: '#e02424', color: 'white',
                borderRadius: '50%', width: 16, height: 16,
                fontSize: 10, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontWeight: 700,
              }}>{unread > 9 ? '9+' : unread}</span>
            )}
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>

      {/* Bottom navigation */}
      <nav className="fs-nav">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`fs-nav-item ${isActive(item.href) ? 'active' : ''}`}
          >
            <span className="fs-nav-icon">{item.icon}</span>
            <span>{lang === 'he' ? item.labelHe : item.labelEn}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
