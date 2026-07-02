'use client'
import React from 'react'

type EmptyStateProps = {
  icon: string
  title: string
  hint?: string
  action?: React.ReactNode
}

export default function EmptyState({ icon, title, hint, action }: EmptyStateProps) {
  return (
    <div
      style={{
        background: 'var(--color-card)', border: '2px dashed var(--color-line)',
        borderRadius: 'var(--radius-md)', padding: 'clamp(28px,7vw,44px) 20px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 'clamp(36px,9vw,48px)', marginBottom: 10 }} aria-hidden="true">{icon}</div>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 'clamp(14px,4vw,16px)', color: 'var(--color-ink)' }}>{title}</p>
      {hint && <p style={{ margin: '4px 0 0', fontSize: 'clamp(12px,3.2vw,14px)', color: 'var(--color-muted)' }}>{hint}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}
