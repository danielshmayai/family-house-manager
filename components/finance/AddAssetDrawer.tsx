'use client'
import { useState } from 'react'
import { Lang, t } from '@/lib/finance/i18n'

const ASSET_TYPES = ['INVESTMENT', 'SAVINGS', 'PENSION', 'PROVIDENT', 'STUDY_FUND', 'CHECKING']

const INSTITUTIONS = [
  'בנק הפועלים', 'בנק לאומי', 'בנק דיסקונט', 'בנק מזרחי', 'בנק אגוד',
  'הפניקס', 'מגדל', 'כלל ביטוח', 'מנורה מבטחים', 'הראל',
  'אלטשולר שחם', 'מיטב', 'אנליסט', 'IBI',
  'אחר',
]

interface Props {
  lang: Lang
  onClose: () => void
  onSave: () => void
  initialType?: string
}

export default function AddAssetDrawer({ lang, onClose, onSave, initialType }: Props) {
  const [type, setType] = useState(initialType || 'INVESTMENT')
  const [form, setForm] = useState({
    name: '', institution: '', accountNumber: '', currency: 'ILS',
    currentValue: '', ticker: '', quantity: '', purchasePrice: '', purchaseDate: '',
    interestRate: '', maturityDate: '', monthlyDeposit: '', employerContribution: '',
    expectedReturnRate: '', bankCode: '', branchCode: '', notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.institution || !form.currentValue) {
      setError('נא למלא שם, מוסד ושווי נוכחי')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/finance/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, type }),
      })
      if (!res.ok) throw new Error('Failed')
      onSave()
    } catch {
      setError('שגיאה בשמירה, נסה שוב')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fs-overlay" onClick={onClose}>
      <div className="fs-drawer" onClick={e => e.stopPropagation()}>
        <div className="fs-drawer-handle" />
        <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>
          {t(lang, 'addAsset')}
        </h2>

        <form className="fs-form" onSubmit={handleSubmit}>
          {/* Asset type */}
          <div>
            <label className="fs-label">סוג נכס</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ASSET_TYPES.map(tp => (
                <button
                  key={tp}
                  type="button"
                  className={`fs-type-tab ${type === tp ? 'active' : ''}`}
                  style={{ padding: '5px 10px', fontSize: 12 }}
                  onClick={() => setType(tp)}
                >
                  {t(lang, tp as any)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="fs-label">{t(lang, 'name')}</label>
            <input className="fs-input" value={form.name}
              onChange={e => set('name', e.target.value)} placeholder={
                type === 'INVESTMENT' ? 'למשל: תיק מניות IBI' :
                type === 'SAVINGS' ? 'למשל: פיקדון לאומי 5 שנים' :
                type === 'PENSION' ? 'למשל: קרן פנסיה הפניקס' :
                type === 'PROVIDENT' ? 'למשל: קופת גמל מגדל' :
                type === 'STUDY_FUND' ? 'למשל: קרן השתלמות כלל' :
                'למשל: חשבון עו"ש לאומי'
              } />
          </div>

          <div>
            <label className="fs-label">{t(lang, 'institution')}</label>
            <select className="fs-select" value={form.institution}
              onChange={e => set('institution', e.target.value)}>
              <option value="">-- בחר מוסד --</option>
              {INSTITUTIONS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="fs-label">{t(lang, 'currentValue')} (₪)</label>
              <input className="fs-input" type="number" value={form.currentValue}
                onChange={e => set('currentValue', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="fs-label">{t(lang, 'currency')}</label>
              <select className="fs-select" value={form.currency}
                onChange={e => set('currency', e.target.value)}>
                <option value="ILS">₪ שקל</option>
                <option value="USD">$ דולר</option>
                <option value="EUR">€ יורו</option>
              </select>
            </div>
          </div>

          {/* Investment-specific */}
          {type === 'INVESTMENT' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="fs-label">{t(lang, 'ticker')}</label>
                  <input className="fs-input" value={form.ticker}
                    onChange={e => set('ticker', e.target.value)} placeholder="AAPL / TASE:NICE" />
                </div>
                <div>
                  <label className="fs-label">{t(lang, 'quantity')}</label>
                  <input className="fs-input" type="number" value={form.quantity}
                    onChange={e => set('quantity', e.target.value)} placeholder="0" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="fs-label">{t(lang, 'purchasePrice')}</label>
                  <input className="fs-input" type="number" value={form.purchasePrice}
                    onChange={e => set('purchasePrice', e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="fs-label">{t(lang, 'purchaseDate')}</label>
                  <input className="fs-input" type="date" value={form.purchaseDate}
                    onChange={e => set('purchaseDate', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {/* Savings-specific */}
          {type === 'SAVINGS' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="fs-label">{t(lang, 'interestRate')}</label>
                <input className="fs-input" type="number" step="0.01" value={form.interestRate}
                  onChange={e => set('interestRate', e.target.value)} placeholder="4.5" />
              </div>
              <div>
                <label className="fs-label">{t(lang, 'maturityDate')}</label>
                <input className="fs-input" type="date" value={form.maturityDate}
                  onChange={e => set('maturityDate', e.target.value)} />
              </div>
            </div>
          )}

          {/* Pension/Provident/Study Fund */}
          {['PENSION', 'PROVIDENT', 'STUDY_FUND'].includes(type) && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="fs-label">{t(lang, 'monthlyDeposit')} (₪)</label>
                  <input className="fs-input" type="number" value={form.monthlyDeposit}
                    onChange={e => set('monthlyDeposit', e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="fs-label">{t(lang, 'employerContribution')} (₪)</label>
                  <input className="fs-input" type="number" value={form.employerContribution}
                    onChange={e => set('employerContribution', e.target.value)} placeholder="0" />
                </div>
              </div>
              <div>
                <label className="fs-label">{t(lang, 'expectedReturnRate')}</label>
                <input className="fs-input" type="number" step="0.1" value={form.expectedReturnRate}
                  onChange={e => set('expectedReturnRate', e.target.value)} placeholder="5.5" />
              </div>
            </>
          )}

          {/* Checking */}
          {type === 'CHECKING' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="fs-label">קוד בנק</label>
                <input className="fs-input" value={form.bankCode}
                  onChange={e => set('bankCode', e.target.value)} placeholder="12" />
              </div>
              <div>
                <label className="fs-label">קוד סניף</label>
                <input className="fs-input" value={form.branchCode}
                  onChange={e => set('branchCode', e.target.value)} placeholder="100" />
              </div>
            </div>
          )}

          <div>
            <label className="fs-label">{t(lang, 'accountNumber')}</label>
            <input className="fs-input" value={form.accountNumber}
              onChange={e => set('accountNumber', e.target.value)} placeholder="מספר חשבון (אופציונלי)" />
          </div>

          <div>
            <label className="fs-label">{t(lang, 'notes')}</label>
            <textarea className="fs-input" rows={2} value={form.notes}
              onChange={e => set('notes', e.target.value)} placeholder="הערות..." />
          </div>

          {error && <p style={{ color: '#e02424', fontSize: 13 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" className="fs-btn fs-btn-outline" style={{ flex: 1 }}
              onClick={onClose}>
              {t(lang, 'cancel')}
            </button>
            <button type="submit" className="fs-btn fs-btn-primary" style={{ flex: 2 }}
              disabled={loading}>
              {loading ? '...' : t(lang, 'save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
