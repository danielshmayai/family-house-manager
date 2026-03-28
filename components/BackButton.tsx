"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/language-context'
import { t } from '@/lib/i18n'

interface BackButtonProps {
  href?: string
}

export default function BackButton({ href = '/' }: BackButtonProps) {
  const router = useRouter()
  const { lang } = useLang()
  const isRtl = lang === 'he'

  return (
    <button
      onClick={() => router.push(href)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)',
        border: '1.5px solid rgba(0,0,0,0.08)',
        borderRadius: '999px',
        padding: '7px 16px 7px 12px',
        cursor: 'pointer', fontSize: '13px', fontWeight: '700',
        color: '#374151',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'white'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.85)'
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
      }}
    >
      <span style={{ fontSize: '16px', lineHeight: 1 }}>{isRtl ? '→' : '←'}</span>
      {t(lang, 'backHome')}
    </button>
  )
}
