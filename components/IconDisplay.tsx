"use client"
import React from 'react'

/**
 * Renders an icon that can be either:
 * - An emoji string (e.g. "🏠")
 * - A data URI image (e.g. "data:image/png;base64,...")
 * - A URL to an image (e.g. "https://..." or "/uploads/...")
 */
export function isImageIcon(icon: string | undefined | null): boolean {
  if (!icon) return false
  return icon.startsWith('data:image') || icon.startsWith('http') || icon.startsWith('/uploads')
}

type IconDisplayProps = {
  icon: string | undefined | null
  fallback?: string
  size?: number | string
  style?: React.CSSProperties
}

export default function IconDisplay({ icon, fallback = '📌', size = 24, style }: IconDisplayProps) {
  const displayIcon = icon || fallback
  const numSize = typeof size === 'number' ? size : parseInt(size, 10) || 24

  if (isImageIcon(displayIcon)) {
    return (
      <img
        src={displayIcon}
        alt="icon"
        style={{
          width: numSize,
          height: numSize,
          objectFit: 'cover',
          borderRadius: numSize > 30 ? '8px' : '4px',
          flexShrink: 0,
          ...style,
        }}
      />
    )
  }

  return (
    <span
      style={{
        fontSize: numSize,
        lineHeight: 1,
        flexShrink: 0,
        ...style,
      }}
    >
      {displayIcon}
    </span>
  )
}
