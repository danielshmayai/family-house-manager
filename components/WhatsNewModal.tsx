'use client'
import React from 'react'
import { useLang } from '@/lib/language-context'
import { t } from '@/lib/i18n'
import { CHANGELOG, ChangeType } from '@/lib/changelog'

type Props = {
  onClose: () => void
}

const BADGE_STYLES: Record<ChangeType, { bg: string; color: string; labelKey: 'whatsNewBadgeNew' | 'whatsNewBadgeImproved' | 'whatsNewBadgeFix' }> = {
  new:      { bg: '#D1FAE5', color: '#065F46', labelKey: 'whatsNewBadgeNew' },
  improved: { bg: '#DBEAFE', color: '#1E40AF', labelKey: 'whatsNewBadgeImproved' },
  fix:      { bg: '#FEF3C7', color: '#92400E', labelKey: 'whatsNewBadgeFix' },
}

export default function WhatsNewModal({ onClose }: Props) {
  const { lang } = useLang()

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 300, padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white', borderRadius: '20px',
          padding: '28px 24px', width: '100%', maxWidth: '460px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          maxHeight: '88vh', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '20px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#111827' }}>
            {t(lang, 'whatsNewTitle')}
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#6B7280' }}>
            {t(lang, 'whatsNewSubtitle')}
          </p>
        </div>

        {/* Versions */}
        {CHANGELOG.map((version, vi) => (
          <div key={version.version}>
            {/* Version label */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px',
            }}>
              <span style={{
                background: vi === 0 ? '#10B981' : '#E5E7EB',
                color: vi === 0 ? 'white' : '#6B7280',
                borderRadius: '20px', padding: '3px 12px',
                fontSize: '13px', fontWeight: '700',
              }}>
                v{version.version}
              </span>
              <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{version.date}</span>
            </div>

            {/* Change list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {version.changes.map((change, ci) => {
                const badge = BADGE_STYLES[change.type]
                return (
                  <div key={ci} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{
                      background: badge.bg, color: badge.color,
                      borderRadius: '6px', padding: '2px 8px',
                      fontSize: '11px', fontWeight: '700',
                      whiteSpace: 'nowrap', marginTop: '2px', flexShrink: 0,
                    }}>
                      {t(lang, badge.labelKey)}
                    </span>
                    <span style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                      {lang === 'he' ? change.he : change.en}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Divider between versions */}
            {vi < CHANGELOG.length - 1 && (
              <hr style={{ margin: '16px 0 0', border: 'none', borderTop: '1px solid #F3F4F6' }} />
            )}
          </div>
        ))}

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            background: '#10B981', color: 'white', border: 'none',
            borderRadius: '12px', padding: '14px',
            fontSize: '16px', fontWeight: '700', cursor: 'pointer',
            width: '100%', marginTop: '4px',
          }}
        >
          {t(lang, 'whatsNewClose')}
        </button>
      </div>
    </div>
  )
}
