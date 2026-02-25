'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Lang, formatCurrency, t } from '@/lib/i18n'
import { calculateGoalProgress } from '@/lib/forecasting'

const GOAL_ICONS: Record<string, string> = {
  RETIREMENT: '🏖️', PROPERTY: '🏠', EDUCATION: '🎓',
  VACATION: '✈️', EMERGENCY: '🆘', OTHER: '🎯',
}

const GOAL_CATEGORIES = ['RETIREMENT', 'PROPERTY', 'EDUCATION', 'VACATION', 'EMERGENCY', 'OTHER']

export default function GoalsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('he')
  const [goals, setGoals] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    name: '', targetAmount: '', currentAmount: '',
    targetDate: '', category: 'OTHER', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLang(localStorage.getItem('fs_lang') as Lang || 'he')
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated') loadGoals()
  }, [status])

  const loadGoals = async () => {
    const res = await fetch('/api/goals')
    if (res.ok) setGoals(await res.json())
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    await loadGoals()
    setShowAdd(false)
    setSaving(false)
    setForm({ name: '', targetAmount: '', currentAmount: '', targetDate: '', category: 'OTHER', notes: '' })
  }

  if (loading) return (
    <div className="fs-page" style={{ alignItems: 'center', paddingTop: 80 }}>
      <p style={{ color: 'var(--fs-text-muted)' }}>{t(lang, 'loading')}</p>
    </div>
  )

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0)
  const totalCurrent = goals.reduce((s, g) => s + g.currentAmount, 0)

  return (
    <>
      <div className="fs-page">
        <h1 style={{ fontWeight: 800, fontSize: 22 }}>🎯 {t(lang, 'goals')}</h1>

        {goals.length > 0 && (
          <div className="fs-hero" style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>סה"כ יעד</div>
                <div style={{ fontSize: 20, fontWeight: 800, direction: 'ltr' }}>
                  {formatCurrency(totalTarget, 'ILS', lang)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>סה"כ השגות</div>
                <div style={{ fontSize: 20, fontWeight: 800, direction: 'ltr' }}>
                  {formatCurrency(totalCurrent, 'ILS', lang)}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="fs-progress-bar" style={{ background: 'rgba(255,255,255,0.3)', height: 10 }}>
                <div className="fs-progress-fill" style={{
                  width: `${totalTarget > 0 ? Math.min(100, (totalCurrent / totalTarget) * 100) : 0}%`,
                  background: 'white',
                }} />
              </div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4, textAlign: 'center' }}>
                {totalTarget > 0 ? ((totalCurrent / totalTarget) * 100).toFixed(1) : 0}% מהיעד הכולל
              </div>
            </div>
          </div>
        )}

        {goals.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {goals.map(goal => {
              const prog = calculateGoalProgress(goal.targetAmount, goal.currentAmount)
              const daysLeft = goal.targetDate
                ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null
              return (
                <div key={goal.id} className="fs-card">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ fontSize: 32 }}>{GOAL_ICONS[goal.category] || '🎯'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{goal.name}</div>
                      {daysLeft !== null && (
                        <div style={{ fontSize: 12, color: daysLeft < 30 ? 'var(--fs-danger)' : 'var(--fs-text-muted)', marginTop: 2 }}>
                          {daysLeft > 0 ? `עוד ${daysLeft} ימים` : 'עבר תאריך היעד'}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, fontSize: 16, direction: 'ltr' }}>
                        {formatCurrency(goal.currentAmount, 'ILS', lang)}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--fs-text-muted)', direction: 'ltr' }}>
                        / {formatCurrency(goal.targetAmount, 'ILS', lang)}
                      </div>
                    </div>
                  </div>

                  <div className="fs-progress-bar">
                    <div className="fs-progress-fill" style={{
                      width: `${prog.percentage}%`,
                      background: prog.percentage >= 100
                        ? 'var(--fs-success)'
                        : prog.onTrack
                          ? 'var(--fs-primary)'
                          : 'var(--fs-warning)',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6 }}>
                    <span style={{
                      color: prog.percentage >= 100 ? 'var(--fs-success)' : 'var(--fs-text-muted)',
                      fontWeight: 600,
                    }}>
                      {prog.percentage >= 100 ? '✅ הושג!' : `${prog.percentage}%`}
                    </span>
                    <span style={{ color: 'var(--fs-text-muted)' }}>
                      {prog.percentage < 100
                        ? `נותר: ${formatCurrency(prog.remaining, 'ILS', lang)}`
                        : 'יעד הושג!'
                      }
                    </span>
                  </div>

                  {goal.notes && (
                    <p style={{ fontSize: 12, color: 'var(--fs-text-muted)', marginTop: 8, marginBottom: 0 }}>
                      {goal.notes}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="fs-empty">
            <div className="fs-empty-icon">🎯</div>
            <div className="fs-empty-title">עדיין אין יעדים פיננסיים</div>
            <div className="fs-empty-text">הגדר יעדים לעקוב אחר ההתקדמות שלך</div>
          </div>
        )}
      </div>

      <button className="fs-fab" onClick={() => setShowAdd(true)}>+</button>

      {showAdd && (
        <div className="fs-overlay" onClick={() => setShowAdd(false)}>
          <div className="fs-drawer" onClick={e => e.stopPropagation()}>
            <div className="fs-drawer-handle" />
            <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>יעד חדש</h2>
            <form className="fs-form" onSubmit={handleSave}>
              <div>
                <label className="fs-label">קטגוריה</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {GOAL_CATEGORIES.map(cat => (
                    <button key={cat} type="button"
                      className={`fs-type-tab ${form.category === cat ? 'active' : ''}`}
                      style={{ padding: '5px 10px', fontSize: 12 }}
                      onClick={() => setForm(f => ({ ...f, category: cat }))}>
                      {GOAL_ICONS[cat]} {t(lang, cat as any)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="fs-label">{t(lang, 'name')}</label>
                <input className="fs-input" required value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="למשל: קרן חירום" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="fs-label">{t(lang, 'targetAmount')} (₪)</label>
                  <input className="fs-input" type="number" required value={form.targetAmount}
                    onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))}
                    placeholder="100000" />
                </div>
                <div>
                  <label className="fs-label">{t(lang, 'currentAmount')} (₪)</label>
                  <input className="fs-input" type="number" value={form.currentAmount}
                    onChange={e => setForm(f => ({ ...f, currentAmount: e.target.value }))}
                    placeholder="0" />
                </div>
              </div>
              <div>
                <label className="fs-label">{t(lang, 'targetDate')}</label>
                <input className="fs-input" type="date" value={form.targetDate}
                  onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} />
              </div>
              <div>
                <label className="fs-label">{t(lang, 'notes')}</label>
                <textarea className="fs-input" rows={2} value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="הערות..." />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="fs-btn fs-btn-outline" style={{ flex: 1 }}
                  onClick={() => setShowAdd(false)}>ביטול</button>
                <button type="submit" className="fs-btn fs-btn-primary" style={{ flex: 2 }}
                  disabled={saving}>{saving ? '...' : 'שמור יעד'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
