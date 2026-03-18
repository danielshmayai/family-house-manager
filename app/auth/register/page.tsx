'use client'
import React, { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/language-context'
import { t } from '@/lib/i18n'
import LanguageToggle from '@/components/LanguageToggle'

type Path = 'choose' | 'create' | 'join' | 'pending'

export default function Register() {
  const [path, setPath] = useState<Path>('choose')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { lang } = useLang()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    try {
      const body: any = { email, password, name, lang }
      if (path === 'create' && familyName) body.familyName = familyName
      if (path === 'join') body.inviteCode = inviteCode

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg(data.error || 'Registration failed')
        setLoading(false)
        return
      }
      // New-family registrations require product-admin approval
      if (data.pending) {
        setPath('pending')
        setLoading(false)
        return
      }
      setMsg(t(lang, 'accountCreated'))
      const signInResult = await signIn('credentials', { redirect: false, email, password })
      if (signInResult?.error) {
        setMsg('Account created but sign-in failed. Please use the Sign in button.')
        setLoading(false)
        return
      }
      setTimeout(() => router.push('/'), 800)
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

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontWeight: '700',
    color: '#374151'
  }

  if (path === 'choose') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'system-ui'
      }}>
        <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 100 }}>
          <LanguageToggle />
        </div>
        <div style={{
          background: 'white',
          borderRadius: '28px',
          padding: 'clamp(24px, 6vw, 48px)',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 'clamp(48px, 12vw, 72px)', marginBottom: '16px' }}>🏡</div>
          <h1 style={{
            margin: '0 0 8px',
            fontSize: 'clamp(24px, 6vw, 32px)',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {t(lang, 'welcomeToFamFlow')}
          </h1>
          <p style={{ color: '#6B7280', fontSize: 'clamp(14px, 3.5vw, 16px)', margin: '0 0 32px', lineHeight: '1.5' }}>
            {t(lang, 'registerTagline')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <button
              onClick={() => setPath('create')}
              style={{
                padding: 'clamp(18px, 4.5vw, 24px)',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '18px',
                fontSize: 'clamp(15px, 4vw, 18px)',
                fontWeight: '700',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                boxShadow: '0 8px 20px rgba(102,126,234,0.4)',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <span style={{ fontSize: 'clamp(32px, 8vw, 44px)' }}>🌟</span>
              <div>
                <div>{t(lang, 'startNewFamily')}</div>
                <div style={{ fontSize: '13px', opacity: 0.9, fontWeight: '500', marginTop: '4px' }}>
                  {t(lang, 'startNewFamilyDesc')}
                </div>
              </div>
            </button>

            <button
              onClick={() => setPath('join')}
              style={{
                padding: 'clamp(18px, 4.5vw, 24px)',
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '18px',
                fontSize: 'clamp(15px, 4vw, 18px)',
                fontWeight: '700',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                boxShadow: '0 8px 20px rgba(67,233,123,0.4)',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <span style={{ fontSize: 'clamp(32px, 8vw, 44px)' }}>🎟️</span>
              <div>
                <div>{t(lang, 'joinFamily')}</div>
                <div style={{ fontSize: '13px', opacity: 0.9, fontWeight: '500', marginTop: '4px' }}>
                  {t(lang, 'joinFamilyDesc')}
                </div>
              </div>
            </button>
          </div>

          <p style={{ color: '#9CA3AF', fontSize: '14px', margin: 0 }}>
            {t(lang, 'alreadyHaveAccount')}{' '}
            <a href="/auth/login" style={{ color: '#667eea', fontWeight: '700', textDecoration: 'none' }}>
              {t(lang, 'signInArrow')}
            </a>
          </p>
        </div>
      </div>
    )
  }

  if (path === 'pending') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'system-ui'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '28px',
          padding: 'clamp(32px, 8vw, 56px)',
          maxWidth: '460px',
          width: '100%',
          boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 'clamp(56px, 14vw, 80px)', marginBottom: '20px' }}>⏳</div>
          <h1 style={{ margin: '0 0 12px', fontSize: 'clamp(22px, 5.5vw, 28px)', fontWeight: '800', color: '#1F2937' }}>
            {lang === 'he' ? 'הבקשה נשלחה לאישור' : 'Pending Approval'}
          </h1>
          <p style={{ color: '#6B7280', margin: '0 0 24px', lineHeight: '1.6', fontSize: 'clamp(14px, 3.5vw, 16px)' }}>
            {lang === 'he'
              ? `נשלח אימייל למנהל המוצר לאישור הבקשה שלך. לאחר האישור תקבל/י אימייל עם קישור כניסה.`
              : `An approval request has been sent to the product admin. Once approved, you'll receive an email with a login link.`}
          </p>
          <div style={{
            background: '#F3F4F6',
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '24px',
            fontSize: '14px',
            color: '#6B7280'
          }}>
            {lang === 'he' ? `📧 ${email}` : `📧 ${email}`}
          </div>
          <a href="/auth/login" style={{
            display: 'block',
            padding: '14px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            textDecoration: 'none',
            fontWeight: '700',
            fontSize: '15px'
          }}>
            {lang === 'he' ? '→ לדף הכניסה' : '→ Back to Sign In'}
          </a>
        </div>
      </div>
    )
  }

  const isCreate = path === 'create'

  return (
    <div style={{
      minHeight: '100vh',
      background: isCreate
        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        : 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui'
    }}>
      <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 100 }}>
        <LanguageToggle />
      </div>
      <div style={{
        background: 'white',
        borderRadius: '28px',
        padding: 'clamp(24px, 6vw, 48px)',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 24px 60px rgba(0,0,0,0.2)'
      }}>
        <button
          onClick={() => { setPath('choose'); setMsg('') }}
          style={{
            background: 'none',
            border: 'none',
            color: '#6B7280',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '20px',
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          {t(lang, 'back')}
        </button>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: 'clamp(40px, 10vw, 56px)', marginBottom: '12px' }}>
            {isCreate ? '🌟' : '🎟️'}
          </div>
          <h1 style={{ margin: '0 0 8px', fontSize: 'clamp(22px, 5.5vw, 28px)', fontWeight: '800', color: '#1F2937' }}>
            {isCreate ? t(lang, 'createYourFamily') : t(lang, 'joinYourFamily')}
          </h1>
          <p style={{ color: '#6B7280', margin: 0, fontSize: '14px' }}>
            {isCreate ? t(lang, 'youllBeManager') : t(lang, 'enterInviteCode')}
          </p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>{t(lang, 'yourName')}</label>
            <input
              placeholder="e.g., Alex Smith"
              value={name}
              onChange={e => setName(e.target.value)}
              style={inputStyle}
              required
              minLength={2}
            />
          </div>

          <div>
            <label style={labelStyle}>{t(lang, 'emailAddress')}</label>
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
            <label style={labelStyle}>{t(lang, 'passwordLabel')}</label>
            <input
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
              required
              minLength={6}
            />
          </div>

          {isCreate && (
            <div>
              <label style={labelStyle}>
                {t(lang, 'familyNameLabel')}{' '}
                <span style={{ color: '#9CA3AF', fontWeight: '500' }}>{t(lang, 'optional')}</span>
              </label>
              <input
                placeholder={name ? `${name}'s Family` : 'e.g., The Smith Family'}
                value={familyName}
                onChange={e => setFamilyName(e.target.value)}
                style={inputStyle}
              />
            </div>
          )}

          {!isCreate && (
            <div>
              <label style={labelStyle}>{t(lang, 'inviteCodeLabel')}</label>
              <input
                placeholder="e.g., AB12CD34"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                style={{
                  ...inputStyle,
                  letterSpacing: '3px',
                  fontFamily: 'monospace',
                  fontSize: '20px',
                  fontWeight: '700',
                  textAlign: 'center'
                }}
                required
                maxLength={8}
              />
              <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '6px 0 0' }}>
                {t(lang, 'askManager')}
              </p>
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
              fontSize: 'clamp(15px, 3.5vw, 17px)',
              marginTop: '8px',
              background: isCreate
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: 'white',
              boxShadow: isCreate
                ? '0 8px 20px rgba(102,126,234,0.4)'
                : '0 8px 20px rgba(67,233,123,0.4)',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            {loading ? t(lang, 'settingUp') : isCreate ? t(lang, 'createMyFamily') : t(lang, 'joinFamilyBtn')}
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
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {msg}
          </div>
        )}

        <p style={{ color: '#9CA3AF', fontSize: '14px', margin: '20px 0 0', textAlign: 'center' }}>
          {t(lang, 'alreadyHaveAccount')}{' '}
          <a href="/auth/login" style={{ color: '#667eea', fontWeight: '700', textDecoration: 'none' }}>
            {t(lang, 'signInArrow')}
          </a>
        </p>
      </div>
    </div>
  )
}
