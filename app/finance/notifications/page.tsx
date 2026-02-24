'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Lang, t } from '@/lib/finance/i18n'

const NOTIF_ICONS: Record<string, string> = {
  VALUE_CHANGE: '📊',
  GOAL_ALERT: '🎯',
  WEEKLY_SUMMARY: '📅',
  DEPOSIT_EXPIRY: '⚠️',
  RISK_ALERT: '⚖️',
}

export default function NotificationsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('he')
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLang(localStorage.getItem('fs_lang') as Lang || 'he')
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/finance/login')
    if (status === 'authenticated') loadNotifications()
  }, [status])

  const loadNotifications = async () => {
    const res = await fetch('/api/finance/notifications')
    if (res.ok) setNotifications(await res.json())
    setLoading(false)
  }

  const markAllRead = async () => {
    await fetch('/api/finance/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  if (loading) return (
    <div className="fs-page" style={{ alignItems: 'center', paddingTop: 80 }}>
      <p style={{ color: 'var(--fs-text-muted)' }}>{t(lang, 'loading')}</p>
    </div>
  )

  return (
    <div className="fs-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontWeight: 800, fontSize: 22 }}>🔔 {t(lang, 'notifications')}</h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} style={{
            background: 'none', border: 'none', color: 'var(--fs-primary)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            {t(lang, 'markAllRead')}
          </button>
        )}
      </div>

      {unreadCount > 0 && (
        <div style={{
          background: 'var(--fs-primary-light)', borderRadius: 10, padding: '8px 14px',
          fontSize: 13, color: 'var(--fs-primary)', fontWeight: 500,
        }}>
          {unreadCount} התראות שלא נקראו
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="fs-empty">
          <div className="fs-empty-icon">🔔</div>
          <div className="fs-empty-title">{t(lang, 'noNotifications')}</div>
          <div className="fs-empty-text">כשיהיו שינויים בתיק תקבל התראות כאן</div>
        </div>
      ) : (
        <div className="fs-card" style={{ padding: '4px 16px' }}>
          {notifications.map((notif, i) => (
            <div key={notif.id} className="fs-notif-item"
              style={{ borderBottom: i < notifications.length - 1 ? undefined : 'none' }}>
              <div style={{ fontSize: 20, flexShrink: 0 }}>
                {NOTIF_ICONS[notif.type] || '📌'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: notif.isRead ? 500 : 700,
                  fontSize: 14,
                  color: notif.isRead ? 'var(--fs-text-muted)' : 'var(--fs-text)',
                }}>
                  {lang === 'he' ? (notif.titleHe || notif.title) : notif.title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--fs-text-muted)', marginTop: 2 }}>
                  {lang === 'he' ? (notif.messageHe || notif.message) : notif.message}
                </div>
                <div style={{ fontSize: 11, color: 'var(--fs-text-muted)', marginTop: 4 }}>
                  {new Date(notif.createdAt).toLocaleDateString('he-IL', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>
              <div className={`fs-notif-dot ${notif.isRead ? 'read' : ''}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
