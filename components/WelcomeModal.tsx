'use client'
import React, { useState } from 'react'
import { useLang } from '@/lib/language-context'

type Step = {
  emoji: string
  titleEn: string
  titleHe: string
  descEn: string
  descHe: string
}

const STEPS: Step[] = [
  {
    emoji: '🏠',
    titleEn: 'Create Your Family',
    titleHe: 'צרו את המשפחה שלכם',
    descEn: 'Register and set up your household. Invite family members from More → Family — each person gets their own account and profile.',
    descHe: 'הירשמו והגדירו את משק הבית שלכם. הזמינו בני משפחה דרך עוד ← משפחה — לכל אחד חשבון ופרופיל אישי.',
  },
  {
    emoji: '📋',
    titleEn: 'Configure Categories & Activities',
    titleHe: 'הגדירו קטגוריות ופעילויות',
    descEn: 'Go to More → Manage and set up categories (e.g. Chores, School, Sports) with activities under each one. You can customise points, icons, and frequencies.',
    descHe: 'עברו לעוד ← ניהול והגדירו קטגוריות (למשל: בית, לימודים, ספורט) עם פעילויות לכל קטגוריה. ניתן להתאים נקודות, אייקונים ותדירות.',
  },
  {
    emoji: '✅',
    titleEn: 'Assign Tasks',
    titleHe: 'הקצו משימות',
    descEn: 'Use the Tasks tab to assign specific activities to family members. Everyone sees their personal task list, and completing all manager tasks earns a bonus.',
    descHe: 'השתמשו בלשונית המשימות כדי להקצות פעילויות לבני המשפחה. כל אחד רואה את רשימת המשימות שלו, והשלמת כל משימות המנהל מזכה בבונוס.',
  },
  {
    emoji: '⭐',
    titleEn: 'Complete & Earn Points',
    titleHe: 'השלימו ותצברו נקודות',
    descEn: 'Tap an activity on the home screen to log it and earn points instantly. You can add notes or photos as proof — managers can verify completions.',
    descHe: 'הקישו על פעילות במסך הבית כדי לרשום אותה ולקבל נקודות מיד. ניתן להוסיף הערות או תמונות — מנהלים יכולים לאמת השלמות.',
  },
  {
    emoji: '🏆',
    titleEn: 'Climb the Leaderboard',
    titleHe: 'עלו בדירוג',
    descEn: 'Points accumulate in real time. Check the Rankings tab to see who\'s on top — daily, weekly, or all-time. A little healthy competition never hurts!',
    descHe: 'הנקודות מצטברות בזמן אמת. בדקו את לשונית הדירוג כדי לראות מי מוביל — יומי, שבועי, או כל הזמנים. קצת תחרות בריאה אף פעם לא הזיקה!',
  },
  {
    emoji: '💰',
    titleEn: 'Turn Points into Money',
    titleHe: 'הפכו נקודות לכסף',
    descEn: 'Every member has a personal wallet. Convert earned points to ₪, request money from the manager, and managers can set an automatic weekly or monthly allowance. Tap a member to see and share their money history.',
    descHe: 'לכל חבר ארנק אישי. המירו נקודות לשקלים, בקשו כסף מהמנהל, ומנהלים יכולים לקבוע דמי כיס אוטומטיים שבועיים או חודשיים. הקישו על בן משפחה לצפייה ושיתוף של היסטוריית הכסף.',
  },
]

const FEATURES = [
  { emoji: '📊', en: 'Full activity history', he: 'היסטוריית פעילות מלאה' },
  { emoji: '💸', en: 'Money requests with manager approval', he: 'בקשות כסף עם אישור מנהל' },
  { emoji: '🔁', en: 'Automatic weekly / monthly allowance', he: 'דמי כיס אוטומטיים — שבועי / חודשי' },
  { emoji: '📤', en: 'Share a member\'s wallet summary to WhatsApp', he: 'שיתוף סיכום ארנק לוואטסאפ' },
  { emoji: '⭐', en: 'Custom point rewards on tasks', he: 'נקודות מותאמות אישית למשימות' },
  { emoji: '🌐', en: 'English & Hebrew', he: 'אנגלית ועברית' },
]

type Props = {
  onClose: () => void
}

export default function WelcomeModal({ onClose }: Props) {
  const { lang } = useLang()
  const [step, setStep] = useState(0)
  const isHe = lang === 'he'
  const isLast = step === STEPS.length - 1

  const current = STEPS[step]

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 300, padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white', borderRadius: '24px',
          width: '100%', maxWidth: '460px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          maxHeight: '92vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Gradient header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '32px 24px 24px',
          textAlign: 'center',
          color: 'white',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: '56px', lineHeight: 1, marginBottom: '12px' }}>
            {current.emoji}
          </div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>
            {isHe ? current.titleHe : current.titleEn}
          </h2>
          {/* Step dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                style={{
                  width: i === step ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: i === step ? 'white' : 'rgba(255,255,255,0.4)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.2s',
                }}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{
          padding: '24px', overflowY: 'auto', flex: 1,
          display: 'flex', flexDirection: 'column', gap: '20px',
        }}>
          {/* Step description */}
          <p style={{
            margin: 0, fontSize: '15px', color: '#374151',
            lineHeight: '1.65', textAlign: isHe ? 'right' : 'left',
          }}>
            {isHe ? current.descHe : current.descEn}
          </p>

          {/* On the last step, show feature highlights */}
          {isLast && (
            <div style={{
              background: '#F9FAFB', borderRadius: '16px', padding: '16px',
              display: 'flex', flexDirection: 'column', gap: '10px',
            }}>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {isHe ? 'עוד מה שיש לנו' : 'Also included'}
              </p>
              {FEATURES.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', direction: isHe ? 'rtl' : 'ltr' }}>
                  <span style={{ fontSize: '20px' }}>{f.emoji}</span>
                  <span style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                    {isHe ? f.he : f.en}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Navigation buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                style={{
                  flex: 1, padding: '14px',
                  background: '#F3F4F6', color: '#374151',
                  border: 'none', borderRadius: '12px',
                  fontSize: '15px', fontWeight: '700', cursor: 'pointer',
                }}
              >
                {isHe ? '→ הקודם' : '← Back'}
              </button>
            )}
            <button
              onClick={isLast ? onClose : () => setStep(s => s + 1)}
              style={{
                flex: 2, padding: '14px',
                background: isLast
                  ? 'linear-gradient(135deg, #10B981, #059669)'
                  : 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none', borderRadius: '12px',
                fontSize: '15px', fontWeight: '700', cursor: 'pointer',
              }}
            >
              {isLast
                ? (isHe ? '🚀 בואו נתחיל!' : "🚀 Let's go!")
                : (isHe ? 'הבא ←' : 'Next →')}
            </button>
          </div>

          {/* Skip link */}
          {!isLast && (
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none',
                color: '#9CA3AF', fontSize: '13px',
                cursor: 'pointer', padding: '4px',
                textDecoration: 'underline',
              }}
            >
              {isHe ? 'דלג' : 'Skip'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
