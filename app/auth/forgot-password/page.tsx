'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/language-context'
import { t } from '@/lib/i18n'
import LanguageToggle from '@/components/LanguageToggle'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [msg, setMsg] = useState('')
  const router = useRouter()
  const { lang } = useLang()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg(data.error || t(lang, 'networkError') as string)
        setLoading(false)
        return
      }
      setEmailSent(data.emailSent)
      setSent(true)
    } catch {
      setMsg(t(lang, 'networkError') as string)
    } finally {
      setLoading(false)
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
    background: 'white',
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
    }}>
      <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 100 }}>
        <LanguageToggle />
      </div>

      <div style={{
        background: 'white',
        borderRadius: '28px',
        padding: 'clamp(24px, 6vw, 48px)',
        maxWidth: '440px',
        width: '100%',
        boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
        textAlign: 'center',
      }}>
        {!sent ? (
          <>
            <div style={{ fontSize: 'clamp(48px, 12vw, 64px)', marginBottom: '16px' }}>🔑</div>
            <h1 style={{
              margin: '0 0 8px',
              fontSize: 'clamp(22px, 5.5vw, 28px)',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {t(lang, 'forgotPasswordTitle')}
            </h1>
            <p style={{ color: '#6B7280', fontSize: 'clamp(14px, 3.5vw, 16px)', margin: '0 0 32px', lineHeight: '1.5' }}>
              {t(lang, 'forgotPasswordDesc')}
            </p>

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '700', color: '#374151' }}>
                  {t(lang, 'emailAddress')}
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

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
                  fontSize: 'clamp(15px, 3.5vw, 17px)',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  boxShadow: '0 8px 20px rgba(102,126,234,0.4)',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {loading ? t(lang, 'sendingCode') : t(lang, 'sendResetCode')}
              </button>
            </form>

            {msg && (
              <div style={{
                marginTop: '16px',
                padding: '14px',
                borderRadius: '12px',
                background: '#FEE2E2',
                color: '#991B1B',
                fontWeight: '600',
                fontSize: '14px',
              }}>
                {msg}
              </div>
            )}

            <p style={{ color: '#9CA3AF', fontSize: '14px', margin: '20px 0 0' }}>
              <a href="/auth/login" style={{ color: '#667eea', fontWeight: '700', textDecoration: 'none' }}>
                {t(lang, 'backToLogin')}
              </a>
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 'clamp(48px, 12vw, 64px)', marginBottom: '16px' }}>
              {emailSent ? '📬' : '🖥️'}
            </div>
            <h1 style={{
              margin: '0 0 16px',
              fontSize: 'clamp(22px, 5.5vw, 28px)',
              fontWeight: '800',
              color: '#1F2937',
            }}>
              {t(lang, 'checkEmailTitle')}
            </h1>
            <p style={{ color: '#6B7280', fontSize: 'clamp(14px, 3.5vw, 16px)', margin: '0 0 24px', lineHeight: '1.6' }}>
              {emailSent
                ? (t(lang, 'checkEmailDesc') as (e: string) => string)(email)
                : (t(lang, 'checkEmailNoProvider') as (e: string) => string)(email)
              }
            </p>

            <button
              onClick={() => router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`)}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '14px',
                border: 'none',
                fontWeight: '800',
                cursor: 'pointer',
                fontSize: 'clamp(15px, 3.5vw, 17px)',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                boxShadow: '0 8px 20px rgba(102,126,234,0.4)',
                marginBottom: '12px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {t(lang, 'enterCode')} →
            </button>

            <button
              onClick={() => { setSent(false); setEmail('') }}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                textDecoration: 'underline',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {t(lang, 'resendCode')}
            </button>

            <p style={{ color: '#9CA3AF', fontSize: '14px', margin: '16px 0 0' }}>
              <a href="/auth/login" style={{ color: '#667eea', fontWeight: '700', textDecoration: 'none' }}>
                {t(lang, 'backToLogin')}
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
