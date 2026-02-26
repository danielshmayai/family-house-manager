'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<'login' | 'otp'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await signIn('credentials', {
        email, password, redirect: false,
      })
      if (res?.error) {
        setError('אימייל או סיסמה שגויים')
      } else {
        await fetch('/api/auth/otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        setStep('otp')
      }
    } catch {
      setError('שגיאת חיבור')
    } finally {
      setLoading(false)
    }
  }

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp }),
      })
      const data = await res.json()
      if (data.valid) {
        router.push('/')
      } else {
        setError('קוד שגוי או שפג תוקפו')
      }
    } catch {
      setError('שגיאת חיבור')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a56db 0%, #6d28d9 100%)',
      padding: 20, direction: 'rtl',
    }}>
      <div style={{
        background: 'white', borderRadius: 24, padding: 32,
        width: '100%', maxWidth: 360, boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>💼</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1a56db' }}>FinanSee</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
            ניהול תיק פיננסי חכם
          </p>
        </div>

        {step === 'login' ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                אימייל
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb',
                  borderRadius: 10, fontSize: 14, boxSizing: 'border-box',
                }}
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                סיסמה
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb',
                  borderRadius: 10, fontSize: 14, boxSizing: 'border-box',
                }}
                placeholder="••••••••"
              />
            </div>
            {error && <p style={{ color: '#e02424', fontSize: 13, textAlign: 'center' }}>{error}</p>}
            <button
              type="submit" disabled={loading}
              style={{
                background: '#1a56db', color: 'white', border: 'none',
                borderRadius: 12, padding: '12px', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4,
              }}
            >
              {loading ? 'מתחבר...' : 'כניסה'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
              אין חשבון?{' '}
              <a href="/register" style={{ color: '#1a56db', fontWeight: 600 }}>
                הרשמה
              </a>
            </p>
          </form>
        ) : (
          <form onSubmit={handleOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 36 }}>📱</div>
              <p style={{ color: '#374151', fontWeight: 600 }}>אימות דו-שלבי</p>
              <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
                קוד אימות נשלח לאימייל שלך: <strong>{email}</strong>
              </p>
              <p style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
                (בסביבת פיתוח, בדוק את הקונסול)
              </p>
            </div>
            <input
              type="text" value={otp} onChange={e => setOtp(e.target.value)}
              maxLength={6} required
              style={{
                width: '100%', padding: '14px', border: '1.5px solid #e5e7eb',
                borderRadius: 10, fontSize: 28, fontWeight: 700, textAlign: 'center',
                letterSpacing: 12, boxSizing: 'border-box',
              }}
              placeholder="000000"
            />
            {error && <p style={{ color: '#e02424', fontSize: 13, textAlign: 'center' }}>{error}</p>}
            <button
              type="submit" disabled={loading}
              style={{
                background: '#1a56db', color: 'white', border: 'none',
                borderRadius: 12, padding: '12px', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'מאמת...' : 'אמת קוד'}
            </button>
            <button
              type="button"
              onClick={() => setStep('login')}
              style={{
                background: 'transparent', border: 'none', color: '#6b7280',
                fontSize: 13, cursor: 'pointer',
              }}
            >
              חזור לכניסה
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
