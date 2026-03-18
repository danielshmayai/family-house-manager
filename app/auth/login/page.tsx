'use client'
import React, { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/language-context'
import { t } from '@/lib/i18n'
import LanguageToggle from '@/components/LanguageToggle'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { lang } = useLang()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    try {
      const res = await signIn('credentials', { redirect: false, email, password })
      if ((res as any)?.ok) {
        setMsg(t(lang, 'welcomeBackMsg'))
        setTimeout(() => router.push('/'), 500)
      } else {
        setMsg(t(lang, 'wrongCredentials'))
        setLoading(false)
      }
    } catch (err) {
      setMsg(t(lang, 'networkError'))
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
    background: 'white'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #fda085 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui'
    }}>
      {/* Language toggle top-right */}
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
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 'clamp(48px, 12vw, 72px)', marginBottom: '16px' }}>👋</div>
        <h1 style={{
          margin: '0 0 8px',
          fontSize: 'clamp(24px, 6vw, 32px)',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #f5576c, #fda085)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {t(lang, 'welcomeBack')}
        </h1>
        <p style={{ color: '#6B7280', fontSize: 'clamp(14px, 3.5vw, 16px)', margin: '0 0 32px' }}>
          {t(lang, 'familyWaiting')}
        </p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '700', color: '#374151' }}>
              {t(lang, 'emailAddress')}
            </label>
            <input
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '700', color: '#374151' }}>
              {t(lang, 'passwordLabel')}
            </label>
            <input
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
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
              marginTop: '8px',
              background: 'linear-gradient(135deg, #f5576c 0%, #fda085 100%)',
              color: 'white',
              boxShadow: '0 8px 20px rgba(245,87,108,0.4)',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            {loading ? t(lang, 'signingIn') : t(lang, 'letsGo')}
          </button>
        </form>

        {msg && (
          <div style={{
            marginTop: '16px',
            padding: '14px',
            borderRadius: '12px',
            background: msg.startsWith('✓') ? '#D1FAE5' : '#FEE2E2',
            color: msg.startsWith('✓') ? '#065F46' : '#991B1B',
            fontWeight: '600',
            fontSize: '14px'
          }}>
            {msg}
          </div>
        )}

        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #F3F4F6' }}>
          <p style={{ color: '#9CA3AF', fontSize: '14px', margin: '0 0 12px' }}>
            {t(lang, 'newToFamFlow')}
          </p>
          <a
            href="/auth/register"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontWeight: '700',
              fontSize: '15px',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(102,126,234,0.3)'
            }}
          >
            {t(lang, 'createAccount')}
          </a>
        </div>
      </div>
    </div>
  )
}
