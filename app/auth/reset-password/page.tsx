'use client'
import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLang } from '@/lib/language-context'
import { t } from '@/lib/i18n'
import LanguageToggle from '@/components/LanguageToggle'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const prefillEmail = searchParams.get('email') || ''

  const [email, setEmail] = useState(prefillEmail)
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const { lang } = useLang()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')

    if (newPassword !== confirmPassword) {
      setMsg(t(lang, 'codeMismatch') as string)
      return
    }
    if (newPassword.length < 6) {
      setMsg(t(lang, 'passwordTooShort') as string)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim(), newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg(data.error === 'Invalid or expired code'
          ? t(lang, 'invalidCode') as string
          : data.error || t(lang, 'networkError') as string)
        setLoading(false)
        return
      }
      setSuccess(true)
      setMsg(t(lang, 'passwordResetSuccess') as string)
      setTimeout(() => router.push('/auth/login'), 2000)
    } catch {
      setMsg(t(lang, 'networkError') as string)
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

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontWeight: '700',
    color: '#374151',
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
      }}>
        <a
          href="/auth/forgot-password"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            color: '#6B7280',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '20px',
            textDecoration: 'none',
          }}
        >
          {t(lang, 'back')}
        </a>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: 'clamp(40px, 10vw, 56px)', marginBottom: '12px' }}>🔐</div>
          <h1 style={{ margin: '0 0 8px', fontSize: 'clamp(22px, 5.5vw, 28px)', fontWeight: '800', color: '#1F2937' }}>
            {t(lang, 'resetPassword')}
          </h1>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!prefillEmail && (
            <div>
              <label style={labelStyle}>{t(lang, 'emailAddress')}</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
          )}

          <div>
            <label style={labelStyle}>{t(lang, 'enterCode')}</label>
            <input
              type="text"
              placeholder="123456"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{
                ...inputStyle,
                letterSpacing: '6px',
                fontFamily: 'monospace',
                fontSize: '24px',
                fontWeight: '800',
                textAlign: 'center',
              }}
              required
              maxLength={6}
              inputMode="numeric"
            />
          </div>

          <div>
            <label style={labelStyle}>{t(lang, 'newPassword')}</label>
            <input
              type="password"
              placeholder={t(lang, 'newPasswordPlaceholder') as string}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              style={inputStyle}
              required
              minLength={6}
            />
          </div>

          <div>
            <label style={labelStyle}>{t(lang, 'confirmPassword')}</label>
            <input
              type="password"
              placeholder={t(lang, 'newPasswordPlaceholder') as string}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              style={inputStyle}
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            style={{
              padding: '16px',
              borderRadius: '14px',
              border: 'none',
              fontWeight: '800',
              cursor: loading || success ? 'wait' : 'pointer',
              opacity: loading || success ? 0.7 : 1,
              fontSize: 'clamp(15px, 3.5vw, 17px)',
              marginTop: '8px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              boxShadow: '0 8px 20px rgba(102,126,234,0.4)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {loading ? t(lang, 'resettingPassword') : t(lang, 'resetPassword')}
          </button>
        </form>

        {msg && (
          <div style={{
            marginTop: '16px',
            padding: '14px',
            borderRadius: '12px',
            background: success ? '#D1FAE5' : '#FEE2E2',
            color: success ? '#065F46' : '#991B1B',
            fontWeight: '600',
            fontSize: '14px',
            textAlign: 'center',
          }}>
            {msg}
          </div>
        )}

        <p style={{ color: '#9CA3AF', fontSize: '14px', margin: '20px 0 0', textAlign: 'center' }}>
          <a href="/auth/login" style={{ color: '#667eea', fontWeight: '700', textDecoration: 'none' }}>
            {t(lang, 'backToLogin')}
          </a>
        </p>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
