'use client'
import React from 'react'

type ButtonProps = {
  children: React.ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  type?: 'button' | 'submit'
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
  disabled?: boolean
  fullWidth?: boolean
  'aria-label'?: string
  style?: React.CSSProperties
}

const VARIANTS: Record<string, React.CSSProperties> = {
  primary: {
    background: 'var(--gradient-brand)',
    color: '#fff',
    border: 'none',
    boxShadow: '0 4px 12px rgba(102,126,234,0.3)',
  },
  secondary: {
    background: 'var(--color-card)',
    color: 'var(--color-ink)',
    border: '1.5px solid var(--color-line)',
  },
  danger: {
    background: 'var(--color-danger-bg)',
    color: 'var(--color-danger)',
    border: 'none',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-muted)',
    border: 'none',
  },
}

export default function Button({
  children, onClick, type = 'button', variant = 'primary', size = 'md',
  disabled, fullWidth, style, ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={rest['aria-label']}
      style={{
        ...VARIANTS[variant],
        padding: size === 'sm' ? '7px 14px' : '11px 20px',
        borderRadius: 'var(--radius-sm)',
        fontWeight: 700,
        fontSize: size === 'sm' ? 'clamp(12px,3vw,13px)' : 'clamp(13px,3.5vw,15px)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        width: fullWidth ? '100%' : undefined,
        WebkitTapHighlightColor: 'transparent',
        fontFamily: 'inherit',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
