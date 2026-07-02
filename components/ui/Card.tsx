'use client'
import React from 'react'

type CardProps = {
  children: React.ReactNode
  padding?: 'sm' | 'md'
  style?: React.CSSProperties
  onClick?: () => void
}

export default function Card({ children, padding = 'md', style, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--color-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-line)',
        boxShadow: 'var(--shadow-card)',
        padding: padding === 'sm' ? 'clamp(12px,3vw,16px)' : 'clamp(16px,4vw,24px)',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
