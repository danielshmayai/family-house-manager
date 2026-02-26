'use client'
import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Lang, t } from '@/lib/i18n'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('he')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    const savedLang = localStorage.getItem('fs_lang') as Lang || 'he'
    const savedTheme = localStorage.getItem('fs_theme') as 'light' | 'dark' || 'light'
    setLang(savedLang)
    setTheme(savedTheme)
  }, [status, router])

  const toggleLang = () => {
    const newLang: Lang = lang === 'he' ? 'en' : 'he'
    setLang(newLang)
    localStorage.setItem('fs_lang', newLang)
    window.location.reload()
  }

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('fs_theme', newTheme)
    document.querySelector('.fs-app')?.setAttribute('data-theme', newTheme)
  }

  const user = session?.user as any

  return (
    <div className="fs-page">
      <h1 style={{ fontWeight: 800, fontSize: 22 }}>⚙️ {t(lang, 'settings')}</h1>

      <div className="fs-card">
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--fs-primary-light)', color: 'var(--fs-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700,
          }}>
            {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{user?.name || 'משתמש'}</div>
            <div style={{ fontSize: 13, color: 'var(--fs-text-muted)' }}>{user?.email}</div>
          </div>
        </div>
      </div>

      <div className="fs-card">
        <div className="fs-section-title" style={{ marginBottom: 14 }}>🎨 מראה</div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {theme === 'light' ? t(lang, 'lightMode') : t(lang, 'darkMode')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--fs-text-muted)' }}>
              {theme === 'light' ? 'עבור למצב כהה' : 'עבור למצב בהיר'}
            </div>
          </div>
          <button onClick={toggleTheme} style={{
            background: theme === 'dark' ? '#1a56db' : '#e5e7eb',
            border: 'none', borderRadius: 20, width: 52, height: 28,
            position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
          }}>
            <div style={{
              position: 'absolute', top: 3, width: 22, height: 22,
              borderRadius: '50%', background: 'white', transition: 'left 0.2s',
              left: theme === 'dark' ? 27 : 3,
            }} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{t(lang, 'language')}</div>
            <div style={{ fontSize: 12, color: 'var(--fs-text-muted)' }}>
              {lang === 'he' ? 'עברית / Hebrew' : 'English / עברית'}
            </div>
          </div>
          <button onClick={toggleLang} className="fs-btn fs-btn-outline" style={{ padding: '6px 16px' }}>
            {lang === 'he' ? 'EN' : 'עב'}
          </button>
        </div>
      </div>

      <div className="fs-card">
        <div className="fs-section-title" style={{ marginBottom: 14 }}>🔔 התראות</div>
        {[
          { key: 'notif_value_change', label: 'שינויים גדולים בשווי (±5%)', enabled: true },
          { key: 'notif_goal', label: 'חריגה מיעד פיננסי', enabled: true },
          { key: 'notif_weekly', label: 'עדכון שבועי', enabled: true },
          { key: 'notif_expiry', label: 'פיקדונות עומדים לפקוע', enabled: true },
        ].map(item => (
          <div key={item.key} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0', borderBottom: '1px solid var(--fs-border)',
          }}>
            <span style={{ fontSize: 14 }}>{item.label}</span>
            <div style={{
              background: item.enabled ? '#1a56db' : '#e5e7eb',
              border: 'none', borderRadius: 20, width: 44, height: 24,
              position: 'relative', cursor: 'pointer',
            }}>
              <div style={{
                position: 'absolute', top: 2, width: 20, height: 20,
                borderRadius: '50%', background: 'white',
                left: item.enabled ? 22 : 2,
              }} />
            </div>
          </div>
        ))}
      </div>

      <div className="fs-card">
        <div className="fs-section-title" style={{ marginBottom: 14 }}>ℹ️ אודות</div>
        <div style={{ fontSize: 13, color: 'var(--fs-text-muted)', lineHeight: 1.8 }}>
          <div>FinanSee v1.0</div>
          <div>ניהול תיק פיננסי חכם</div>
          <div style={{ marginTop: 8, fontSize: 12 }}>
            ⚠️ האפליקציה מיועדת למעקב אישי בלבד ואינה מהווה ייעוץ פיננסי מקצועי.
          </div>
        </div>
      </div>

      <div className="fs-card">
        <div className="fs-section-title" style={{ marginBottom: 14 }}>🔒 אבטחה</div>
        <div style={{ fontSize: 13, color: 'var(--fs-text-muted)', marginBottom: 10 }}>
          ✅ אימות דו-שלבי פעיל (OTP)
        </div>
        <div style={{ fontSize: 13, color: 'var(--fs-text-muted)' }}>
          ✅ חיבור מאובטח HTTPS
        </div>
      </div>

      <button
        className="fs-btn fs-btn-danger fs-btn-block"
        onClick={() => signOut({ callbackUrl: '/login' })}
      >
        🚪 {t(lang, 'logout')}
      </button>

      <div style={{ height: 16 }} />
    </div>
  )
}
