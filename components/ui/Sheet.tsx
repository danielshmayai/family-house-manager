'use client'
import React from 'react'

type SheetProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

/** Bottom sheet — the app-wide modal pattern (promoted from my-tasks). */
export default function Sheet({ open, onClose, title, children }: SheetProps) {
  if (!open) return null
  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200,
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 'var(--page-max-width)', margin: '0 auto',
          background: 'var(--color-card)',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          padding: 'clamp(16px,4vw,24px)',
          maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ width: 40, height: 4, background: 'var(--color-line)', borderRadius: 2, margin: '0 auto 12px' }} />
        {title && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 'clamp(16px,4.5vw,20px)', fontWeight: 800, color: 'var(--color-ink)' }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'var(--color-surface)', border: 'none', borderRadius: '50%',
                width: 34, height: 34, cursor: 'pointer', fontSize: 18, color: 'var(--color-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >×</button>
          </div>
        )}
        <div style={{ overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  )
}
