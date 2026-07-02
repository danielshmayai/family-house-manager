"use client"
import React, { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/language-context'
import { t } from '@/lib/i18n'
import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'

type RecurringPayment = {
  id: string; userId: string; amount: number; cycleType: string; payDay: number
  description: string | null; isActive: boolean; nextPayAt: string; lastPaidAt: string | null
  user: { id: string; name: string | null; email: string } | null
}

type FamilyMember = { id: string; name: string | null; role: string }

export default function RecurringPaymentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { lang } = useLang()
  const isRtl = lang === 'he'

  const [payments, setPayments] = useState<RecurringPayment[]>([])
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [rpUserId, setRpUserId] = useState('')
  const [rpAmount, setRpAmount] = useState('')
  const [rpCycleType, setRpCycleType] = useState<'WEEKLY' | 'MONTHLY'>('MONTHLY')
  const [rpPayDay, setRpPayDay] = useState('1')
  const [rpDesc, setRpDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const sessionUser = session?.user as any
  const isManager = sessionUser?.role === 'ADMIN' || sessionUser?.role === 'MANAGER'

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [rpRes, membersRes] = await Promise.all([
        fetch('/api/household/recurring-payments'),
        sessionUser?.householdId
          ? fetch(`/api/users?householdId=${sessionUser.householdId}`)
          : Promise.resolve(null as unknown as Response),
      ])
      if (rpRes.ok) setPayments(await rpRes.json())
      if (membersRes?.ok) setMembers(await membersRes.json())
    } finally {
      setLoading(false)
    }
  }, [sessionUser?.householdId])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      if (!isManager) { router.push('/wallet'); return }
      fetchAll()
    }
  }, [status, isManager, router, fetchAll])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/household/recurring-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: rpUserId, amount: parseFloat(rpAmount), cycleType: rpCycleType, payDay: parseInt(rpPayDay, 10), description: rpDesc || undefined })
      })
      if (res.ok) {
        setShowForm(false)
        setRpUserId(''); setRpAmount(''); setRpPayDay('1'); setRpDesc('')
        fetchAll()
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    await fetch(`/api/household/recurring-payments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive })
    })
    fetchAll()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/household/recurring-payments/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  function dayLabel(cycleType: string, payDay: number) {
    if (cycleType === 'WEEKLY') {
      const days = isRtl
        ? ['', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת', 'ראשון']
        : ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      return days[payDay] ?? payDay
    }
    return isRtl ? `יום ${payDay} לחודש` : `Day ${payDay} of month`
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
    border: '2px solid var(--color-line)', fontSize: 'clamp(13px,3.5vw,14px)',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff',
  }

  if (status !== 'authenticated' || !isManager || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface)' }}>
        <p style={{ color: 'var(--color-muted)', fontSize: 'clamp(14px,4vw,16px)' }}>{t(lang, 'loading')}</p>
      </div>
    )
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'var(--color-surface)' }}>
      <PageHeader
        title={`🔁 ${isRtl ? 'תשלומים קבועים' : 'Recurring Payments'}`}
        subtitle={isRtl ? 'דמי כיס אוטומטיים לחברי המשפחה' : 'Automatic allowance for family members'}
        action={
          <button
            onClick={() => router.push('/wallet')}
            style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)', borderRadius: 10, padding: '8px 14px', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}
          >
            {isRtl ? '→ ארנק' : '← Wallet'}
          </button>
        }
      />

      <div style={{ maxWidth: 'var(--page-max-width)', margin: '0 auto', padding: 'clamp(16px,4vw,24px)', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <Button onClick={() => setShowForm(v => !v)} variant={showForm ? 'secondary' : 'primary'}>
          {showForm ? (isRtl ? '✕ סגור' : '✕ Close') : (isRtl ? '+ הוסף תשלום קבוע' : '+ Add recurring payment')}
        </Button>

        {showForm && (
          <Card padding="sm">
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <select value={rpUserId} onChange={e => setRpUserId(e.target.value)} required style={inputStyle}>
                <option value="">{isRtl ? 'בחר חבר...' : 'Select member...'}</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name || m.id}</option>)}
              </select>

              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" min={0.01} step={0.01} placeholder={isRtl ? 'סכום ₪' : 'Amount ₪'} value={rpAmount}
                  onChange={e => setRpAmount(e.target.value)} required style={{ ...inputStyle, flex: 1, width: 'auto' }} />
                <select value={rpCycleType} onChange={e => { setRpCycleType(e.target.value as 'WEEKLY' | 'MONTHLY'); setRpPayDay('1') }}
                  style={{ ...inputStyle, width: 'auto' }}>
                  <option value="WEEKLY">{isRtl ? 'שבועי' : 'Weekly'}</option>
                  <option value="MONTHLY">{isRtl ? 'חודשי' : 'Monthly'}</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 'clamp(11px,2.5vw,12px)', color: 'var(--color-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  {rpCycleType === 'WEEKLY' ? (isRtl ? 'יום בשבוע' : 'Day of week') : (isRtl ? 'יום בחודש' : 'Day of month')}
                </label>
                {rpCycleType === 'WEEKLY' ? (
                  <select value={rpPayDay} onChange={e => setRpPayDay(e.target.value)} style={inputStyle}>
                    {(isRtl
                      ? ['שני','שלישי','רביעי','חמישי','שישי','שבת','ראשון']
                      : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
                    ).map((d, i) => <option key={i+1} value={i+1}>{d}</option>)}
                  </select>
                ) : (
                  <select value={rpPayDay} onChange={e => setRpPayDay(e.target.value)} style={inputStyle}>
                    {Array.from({length: 28}, (_, i) => i+1).map(d => (
                      <option key={d} value={d}>{isRtl ? `יום ${d}` : `Day ${d}`}</option>
                    ))}
                  </select>
                )}
              </div>

              <input type="text" placeholder={isRtl ? 'תיאור (אופציונלי)' : 'Description (optional)'} value={rpDesc}
                onChange={e => setRpDesc(e.target.value)} style={inputStyle} />

              <Button type="submit" disabled={saving} fullWidth style={{ background: 'var(--color-success)', boxShadow: 'none' }}>
                {saving ? (isRtl ? 'שומר...' : 'Saving...') : (isRtl ? 'שמור תשלום קבוע' : 'Save Recurring Payment')}
              </Button>
            </form>
          </Card>
        )}

        {payments.length === 0 ? (
          <EmptyState
            icon="🔁"
            title={isRtl ? 'אין תשלומים קבועים' : 'No recurring payments configured'}
            hint={isRtl ? 'הוסיפו דמי כיס שבועיים או חודשיים לחברי המשפחה' : 'Add a weekly or monthly allowance for family members'}
          />
        ) : (
          <Card padding="sm">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {payments.map(rp => (
                <div key={rp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: rp.isActive ? 'var(--color-success-bg)' : 'var(--color-surface)', opacity: rp.isActive ? 1 : 0.6, gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 'clamp(12px,3vw,14px)', color: 'var(--color-ink)' }}>
                      {rp.user?.name || rp.userId} · <span style={{ color: 'var(--color-success)' }}>₪{rp.amount.toFixed(2)}</span>
                    </p>
                    <p style={{ margin: 0, fontSize: 'clamp(11px,2.5vw,12px)', color: 'var(--color-muted)' }}>
                      {rp.cycleType === 'WEEKLY' ? (isRtl ? 'שבועי' : 'Weekly') : (isRtl ? 'חודשי' : 'Monthly')} · {dayLabel(rp.cycleType, rp.payDay)}
                      {rp.description ? ` · ${rp.description}` : ''}
                    </p>
                    <p style={{ margin: 0, fontSize: 'clamp(10px,2.5vw,11px)', color: 'var(--color-muted)', opacity: 0.8 }}>
                      {isRtl ? 'הבא:' : 'Next:'} {new Date(rp.nextPayAt).toLocaleDateString(isRtl ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jerusalem' })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button size="sm" onClick={() => handleToggle(rp.id, rp.isActive)}
                      style={{ background: rp.isActive ? 'var(--color-warning-bg)' : 'var(--color-success-bg)', color: rp.isActive ? 'var(--color-warning)' : 'var(--color-success)', border: 'none', boxShadow: 'none' }}>
                      {rp.isActive ? (isRtl ? 'השהה' : 'Pause') : (isRtl ? 'הפעל' : 'Resume')}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(rp.id)}>
                      {isRtl ? 'מחק' : 'Delete'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
