'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Lang, formatCurrency, t } from '@/lib/finance/i18n'
import AssetIcon from '@/components/finance/AssetIcon'
import { TrendChart } from '@/components/finance/PortfolioChart'

const TYPE_LABELS: Record<string, string> = {
  INVESTMENT: 'השקעות', SAVINGS: 'חסכונות', PENSION: 'פנסיה',
  PROVIDENT: 'קופת גמל', STUDY_FUND: 'קרן השתלמות', CHECKING: 'עו"ש',
}

export default function AssetDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  const { status } = useSession()
  const [lang, setLang] = useState<Lang>('he')
  const [asset, setAsset] = useState<any>(null)
  const [editValue, setEditValue] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLang(localStorage.getItem('fs_lang') as Lang || 'he')
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/finance/login')
    if (status === 'authenticated') loadAsset()
  }, [status])

  const loadAsset = async () => {
    const res = await fetch('/api/finance/assets')
    if (res.ok) {
      const all = await res.json()
      const found = all.find((a: any) => a.id === id)
      if (!found) { router.push('/finance/assets'); return }
      setAsset(found)
      setEditValue(found.currentValue.toString())
    }
    setLoading(false)
  }

  const handleUpdateValue = async () => {
    setSaving(true)
    await fetch(`/api/finance/assets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentValue: editValue }),
    })
    await loadAsset()
    setSaving(false)
    setEditing(false)
  }

  const handleDelete = async () => {
    if (!confirm('האם למחוק נכס זה?')) return
    await fetch(`/api/finance/assets/${id}`, { method: 'DELETE' })
    router.push('/finance/assets')
  }

  if (loading || !asset) {
    return (
      <div className="fs-page" style={{ alignItems: 'center', paddingTop: 80 }}>
        <p style={{ color: 'var(--fs-text-muted)' }}>{t(lang, 'loading')}</p>
      </div>
    )
  }

  // Trend from snapshots
  const trendData = (asset.snapshots || []).map((s: any) => ({
    year: new Date(s.date).getFullYear(),
    value: s.value,
    label: new Date(s.date).toLocaleDateString('he-IL', { month: 'short', year: '2-digit' }),
  }))

  // Gain/loss for investments
  let gainLoss = null
  if (asset.type === 'INVESTMENT' && asset.purchasePrice && asset.quantity) {
    const cost = asset.purchasePrice * asset.quantity
    const gain = asset.currentValue - cost
    gainLoss = { gain, pct: cost > 0 ? (gain / cost) * 100 : 0, cost }
  }

  // Monthly deposit total
  const monthlyTotal = (asset.monthlyDeposit || 0) + (asset.employerContribution || 0)

  return (
    <div className="fs-page">
      {/* Back */}
      <button onClick={() => router.back()} style={{
        background: 'none', border: 'none', fontSize: 14,
        color: 'var(--fs-primary)', cursor: 'pointer', padding: 0,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        ← חזור
      </button>

      {/* Hero */}
      <div className="fs-card" style={{ textAlign: 'center', padding: 24 }}>
        <AssetIcon type={asset.type} size={60} />
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--fs-text-muted)', marginBottom: 2 }}>
            {TYPE_LABELS[asset.type]}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '4px 0' }}>{asset.name}</h2>
          <div style={{ color: 'var(--fs-text-muted)', fontSize: 13 }}>{asset.institution}</div>
        </div>

        {/* Value */}
        {editing ? (
          <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <input
              className="fs-input"
              type="number"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              style={{ maxWidth: 160, textAlign: 'center', fontSize: 20, fontWeight: 700 }}
            />
            <button className="fs-btn fs-btn-primary" onClick={handleUpdateValue} disabled={saving}>
              {saving ? '...' : '✓'}
            </button>
            <button className="fs-btn fs-btn-outline" onClick={() => setEditing(false)}>✕</button>
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 32, fontWeight: 800, direction: 'ltr' }}>
              {formatCurrency(asset.currentValue, asset.currency, lang)}
            </div>
            <button onClick={() => setEditing(true)} style={{
              marginTop: 8, background: 'var(--fs-primary-light)', color: 'var(--fs-primary)',
              border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 13,
              fontWeight: 600, cursor: 'pointer',
            }}>
              ✏️ עדכן שווי
            </button>
          </div>
        )}

        {/* Gain/Loss */}
        {gainLoss && (
          <div style={{
            marginTop: 12, padding: '8px 16px',
            background: gainLoss.gain >= 0 ? 'var(--fs-success-light)' : 'var(--fs-danger-light)',
            borderRadius: 10,
            color: gainLoss.gain >= 0 ? 'var(--fs-success)' : 'var(--fs-danger)',
            fontSize: 14, fontWeight: 600, direction: 'ltr',
          }}>
            {gainLoss.gain >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(gainLoss.gain), asset.currency, lang)}
            {' '}({gainLoss.pct >= 0 ? '+' : ''}{gainLoss.pct.toFixed(2)}%)
          </div>
        )}
      </div>

      {/* Trend chart */}
      {trendData.length >= 2 && (
        <div className="fs-card">
          <div className="fs-section-title" style={{ marginBottom: 12 }}>מגמת שווי</div>
          <TrendChart data={trendData} lang={lang} />
        </div>
      )}

      {/* Details */}
      <div className="fs-card">
        <div className="fs-section-title" style={{ marginBottom: 12 }}>פרטים</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {asset.accountNumber && <DetailRow label="מספר חשבון" value={asset.accountNumber} />}
          {asset.ticker && <DetailRow label="סימול" value={asset.ticker} />}
          {asset.quantity && <DetailRow label="כמות" value={asset.quantity.toString()} />}
          {asset.purchasePrice && (
            <DetailRow label="מחיר רכישה" value={formatCurrency(asset.purchasePrice, asset.currency, lang)} />
          )}
          {gainLoss && (
            <DetailRow label="עלות רכישה" value={formatCurrency(gainLoss.cost, asset.currency, lang)} />
          )}
          {asset.interestRate && (
            <DetailRow label="ריבית שנתית" value={`${asset.interestRate}%`} />
          )}
          {asset.maturityDate && (
            <DetailRow label="תאריך פקיעה"
              value={new Date(asset.maturityDate).toLocaleDateString('he-IL')}
              highlight={
                (new Date(asset.maturityDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 90
              }
            />
          )}
          {monthlyTotal > 0 && (
            <DetailRow label="הפקדה חודשית" value={formatCurrency(monthlyTotal, 'ILS', lang)} />
          )}
          {asset.expectedReturnRate && (
            <DetailRow label="תשואה צפויה" value={`${asset.expectedReturnRate}%`} />
          )}
          {asset.notes && <DetailRow label="הערות" value={asset.notes} />}
          <DetailRow
            label="עודכן לאחרונה"
            value={new Date(asset.updatedAt).toLocaleDateString('he-IL')}
          />
        </div>
      </div>

      {/* Delete */}
      <button
        className="fs-btn fs-btn-danger fs-btn-block"
        onClick={handleDelete}
        style={{ marginTop: 8 }}
      >
        🗑️ מחק נכס
      </button>
    </div>
  )
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--fs-border)' }}>
      <span style={{ fontSize: 13, color: 'var(--fs-text-muted)' }}>{label}</span>
      <span style={{
        fontSize: 14, fontWeight: 600,
        color: highlight ? 'var(--fs-warning)' : 'var(--fs-text)',
      }}>
        {value}
      </span>
    </div>
  )
}
