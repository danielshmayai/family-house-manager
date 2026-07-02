'use client'
import React from 'react'

type PageHeaderProps = {
  title: string
  subtitle?: string
  /** Rendered at the inline-end of the banner (e.g. an action button) */
  action?: React.ReactNode
}

/** The one header pattern for all screens: brand gradient banner, white text. */
export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div
      style={{
        background: 'var(--gradient-brand)',
        padding: 'clamp(18px,4.5vw,26px) clamp(16px,4vw,24px)',
        boxShadow: '0 4px 16px rgba(102,126,234,0.3)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--page-max-width)', margin: '0 auto',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, color: '#fff', fontSize: 'clamp(20px,5.5vw,26px)', fontWeight: 800, letterSpacing: '-0.01em' }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: 'clamp(12px,3.2vw,14px)' }}>
              {subtitle}
            </p>
          )}
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>
    </div>
  )
}
