'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'שגיאה בהרשמה')
      } else {
        router.push('/login')
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
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1a56db' }}>הרשמה ל-FinanSee</h1>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { key: 'name', label: 'שם מלא', type: 'text', placeholder: 'ישראל ישראלי' },
            { key: 'email', label: 'אימייל', type: 'email', placeholder: 'your@email.com' },
            { key: 'password', label: 'סיסמה', type: 'password', placeholder: '••••••••' },
          ].map(field => (
            <div key={field.key}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                {field.label}
              </label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={(form as any)[field.key]}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                required
                style={{
                  width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb',
                  borderRadius: 10, fontSize: 14, boxSizing: 'border-box',
                }}
              />
            </div>
          ))}

          {error && <p style={{ color: '#e02424', fontSize: 13, textAlign: 'center' }}>{error}</p>}

          <button type="submit" disabled={loading} style={{
            background: '#1a56db', color: 'white', border: 'none',
            borderRadius: 12, padding: '12px', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4,
          }}>
            {loading ? 'נרשם...' : 'הרשמה'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
            יש לך חשבון?{' '}
            <a href="/login" style={{ color: '#1a56db', fontWeight: 600 }}>כניסה</a>
          </p>
        </form>
      </div>
    </div>
  )
}
