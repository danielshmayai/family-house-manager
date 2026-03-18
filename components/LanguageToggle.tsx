'use client'
import React from 'react'
import { useLang } from '@/lib/language-context'

export default function LanguageToggle({ style }: { style?: React.CSSProperties }) {
  const { lang, setLang } = useLang()

  return (
    <button
      onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
      title={lang === 'he' ? 'Switch to English' : 'עבור לעברית'}
      style={{
        padding: '8px 12px',
        background: 'rgba(255,255,255,0.2)',
        border: '2px solid rgba(255,255,255,0.4)',
        borderRadius: '10px',
        color: 'white',
        fontSize: '13px',
        fontWeight: '700',
        cursor: 'pointer',
        letterSpacing: '0.5px',
        WebkitTapHighlightColor: 'transparent',
        flexShrink: 0,
        ...style,
      }}
    >
      {lang === 'he' ? 'EN' : 'עב'}
    </button>
  )
}
