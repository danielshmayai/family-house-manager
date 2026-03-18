'use client'
import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'

type UserInfo = { name: string | null; email: string }

function SetupForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams?.get('token') ?? null

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) { setError('קישור לא תקין'); setValidating(false); return }
    fetch(`/api/auth/setup?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setUserInfo(data)
        setValidating(false)
      })
      .catch(() => { setError('שגיאת רשת, נסה שוב'); setValidating(false) })
  }, [token])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) { setError('הסיסמאות אינן תואמות'); return }
    if (password.length < 6) { setError('הסיסמה חייבת להכיל לפחות 6 תווים'); return }
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'שגיאה, נסה שוב'); setLoading(false); return }

    setDone(true)
    const result = await signIn('credentials', { redirect: false, email: data.email, password })
    if (result?.error) {
      router.push('/auth/login')
    } else {
      router.push('/')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '14px',
    border: '2px solid #E5E7EB',
    fontSize: '16px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    background: 'white'
  }

  if (validating) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <div>מאמת קישור...</div>
      </div>
    )
  }

  if (error && !userInfo) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
        <div style={{ color: '#991B1B', fontWeight: '600', marginBottom: '20px' }}>{error}</div>
        <a href="/auth/login" style={{ color: '#667eea', fontWeight: '700', textDecoration: 'none' }}>
          → מעבר להתחברות
        </a>
      </div>
    )
  }

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
        <div style={{ fontWeight: '700', fontSize: '20px', color: '#065F46' }}>ברוכים הבאים!</div>
        <div style={{ color: '#666', marginTop: '8px' }}>מתחבר לחשבון...</div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui',
      direction: 'rtl'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '28px',
        padding: 'clamp(24px, 6vw, 48px)',
        maxWidth: '440px',
        width: '100%',
        boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🏡</div>
        <h1 style={{
          margin: '0 0 8px',
          fontSize: 'clamp(22px, 5.5vw, 28px)',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          ברוכים הבאים למשפחה!
        </h1>
        <p style={{ color: '#6B7280', margin: '0 0 8px', fontSize: '15px' }}>
          היי {userInfo?.name || userInfo?.email}! 👋
        </p>
        <p style={{ color: '#9CA3AF', margin: '0 0 28px', fontSize: '14px' }}>
          בחרו סיסמה להתחברות לחשבון שלכם
        </p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'right' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '700', color: '#374151' }}>
              סיסמה
            </label>
            <input
              type="password"
              placeholder="לפחות 6 תווים"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
              required
              minLength={6}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '700', color: '#374151' }}>
              אישור סיסמה
            </label>
            <input
              type="password"
              placeholder="הזן סיסמה שוב"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              style={inputStyle}
              required
              minLength={6}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px',
              borderRadius: '10px',
              background: '#FEE2E2',
              color: '#991B1B',
              fontWeight: '600',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '16px',
              borderRadius: '14px',
              border: 'none',
              fontWeight: '800',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
              fontSize: '17px',
              marginTop: '8px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              boxShadow: '0 8px 20px rgba(102,126,234,0.4)'
            }}
          >
            {loading ? '✨ מגדיר חשבון...' : '🚀 כניסה למשפחה!'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function SetupPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '48px' }}>⏳</div>
      </div>
    }>
      <SetupForm />
    </Suspense>
  )
}
