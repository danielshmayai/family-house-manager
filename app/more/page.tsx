"use client"
import React from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/language-context'
import { t } from '@/lib/i18n'
import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'

type HubLink = {
  path: string
  icon: string
  label: string
  desc?: string
}

function HubRow({ icon, label, desc, onClick, trailing }: {
  icon: string; label: string; desc?: string; onClick?: () => void; trailing?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, width: '100%',
        background: 'none', border: 'none', borderBottom: '1px solid var(--color-line)',
        padding: '14px 4px', cursor: onClick ? 'pointer' : 'default', textAlign: 'start',
        WebkitTapHighlightColor: 'transparent', fontFamily: 'inherit',
      }}
    >
      <span style={{ fontSize: 22, flexShrink: 0 }} aria-hidden="true">{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 700, fontSize: 'clamp(14px,3.8vw,15px)', color: 'var(--color-ink)' }}>
          {label}
        </span>
        {desc && (
          <span style={{ display: 'block', fontSize: 'clamp(11px,3vw,12.5px)', color: 'var(--color-muted)' }}>
            {desc}
          </span>
        )}
      </span>
      {trailing ?? <span style={{ color: 'var(--color-muted)', fontSize: 18 }} aria-hidden="true">›</span>}
    </button>
  )
}

export default function MorePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { lang, setLang } = useLang()

  React.useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login')
  }, [status, router])

  if (status !== 'authenticated') return null

  const sessionUser = session?.user as any
  const isManager = sessionUser?.role === 'ADMIN' || sessionUser?.role === 'MANAGER'
  const isProductAdmin = sessionUser?.email === (process.env.NEXT_PUBLIC_PRODUCT_ADMIN_EMAIL || 'danielshmayai@gmail.com')

  const managementLinks: HubLink[] = [
    { path: '/users', icon: '👥', label: t(lang, 'navFamily'), desc: t(lang, 'moreFamilyDesc') },
    ...(isManager ? [
      { path: '/history', icon: '📜', label: t(lang, 'navHistory'), desc: t(lang, 'moreHistoryDesc') },
      { path: '/admin', icon: '⚙️', label: t(lang, 'navManage'), desc: t(lang, 'moreManageDesc') },
    ] : []),
    ...(isProductAdmin ? [
      { path: '/product-admin', icon: '🛡️', label: t(lang, 'moreProductAdmin') },
    ] : []),
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-surface)' }}>
      <PageHeader title={t(lang, 'moreTitle')} subtitle={t(lang, 'moreSubtitle')} />

      <div style={{ maxWidth: 'var(--page-max-width)', margin: '0 auto', padding: 'clamp(16px,4vw,24px)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card padding="sm">
          <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted)' }}>
            {t(lang, 'moreManagement')}
          </p>
          {managementLinks.map(link => (
            <HubRow
              key={link.path}
              icon={link.icon}
              label={link.label}
              desc={link.desc}
              onClick={() => router.push(link.path)}
            />
          ))}
        </Card>

        <Card padding="sm">
          <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted)' }}>
            {t(lang, 'moreSettings')}
          </p>
          <HubRow
            icon="🌐"
            label={t(lang, 'moreLanguage')}
            onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
            trailing={
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-brand)' }}>
                {lang === 'he' ? 'עברית → English' : 'English → עברית'}
              </span>
            }
          />
          <HubRow
            icon="🚪"
            label={t(lang, 'signOut')}
            onClick={async () => { await signOut({ redirect: false }); window.location.href = '/auth/login' }}
            trailing={<span aria-hidden="true" />}
          />
        </Card>
      </div>
    </div>
  )
}
