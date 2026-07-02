'use client'
import React from 'react'
import Button from './Button'

type ConfirmDialogProps = {
  open: boolean
  title: string
  message?: string
  confirmLabel: string
  cancelLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Replacement for native confirm()/alert() — translated labels, styled, mobile-friendly. */
export default function ConfirmDialog({
  open, title, message, confirmLabel, cancelLabel, danger, onConfirm, onCancel,
}: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div
      onClick={onCancel}
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 400, background: 'var(--color-card)',
          borderRadius: 'var(--radius-md)', padding: 'clamp(18px,4.5vw,24px)',
          boxShadow: 'var(--shadow-float)',
        }}
      >
        <h3 style={{ margin: '0 0 6px', fontSize: 'clamp(15px,4vw,17px)', fontWeight: 800, color: 'var(--color-ink)' }}>
          {title}
        </h3>
        {message && (
          <p style={{ margin: '0 0 16px', fontSize: 'clamp(13px,3.5vw,14px)', color: 'var(--color-muted)', whiteSpace: 'pre-line' }}>
            {message}
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: message ? 0 : 16 }}>
          <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            style={danger ? { background: 'var(--color-danger)', color: '#fff' } : undefined}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
