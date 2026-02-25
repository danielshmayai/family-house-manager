'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lang, formatCurrency, t } from '@/lib/i18n'
import AssetIcon, { ASSET_COLORS } from '@/components/AssetIcon'
import AddAssetDrawer from '@/components/AddAssetDrawer'

const TYPE_LABELS: Record<string, string> = {
  ALL: 'הכל',
  INVESTMENT: 'השקעות',
  SAVINGS: 'חסכונות',
  PENSION: 'פנסיה',
  PROVIDENT: 'קופת גמל',
  STUDY_FUND: 'קרן השתלמות',
  CHECKING: 'עו"ש',
}

export default function AssetsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('he')
  const [assets, setAssets] = useState<any[]>([])
  const [filter, setFilter] = useState('ALL')
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLang(localStorage.getItem('fs_lang') as Lang || 'he')
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const loadAssets = async () => {
    try {
      const res = await fetch('/api/assets')
      if (res.ok) setAssets(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') loadAssets()
  }, [status])

  const filtered = filter === 'ALL' ? assets : assets.filter(a => a.type === filter)
  const totalValue = assets.reduce((s, a) => s + a.currentValue, 0)

  const getGainLoss = (asset: any) => {
    if (asset.type !== 'INVESTMENT' || !asset.purchasePrice || !asset.quantity) return null
    const cost = asset.purchasePrice * asset.quantity
    const gain = asset.currentValue - cost
    const pct = cost > 0 ? (gain / cost) * 100 : 0
    return { gain, pct }
  }

  const soonExpiring = assets.filter(a => {
    if (a.type !== 'SAVINGS' || !a.maturityDate) return false
    const days = (new Date(a.maturityDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return days > 0 && days <= 90
  })

  if (loading) return (
    <div className="fs-page" style={{ alignItems: 'center', paddingTop: 80 }}>
      <p style={{ color: 'var(--fs-text-muted)' }}>{t(lang, 'loading')}</p>
    </div>
  )

  return (
    <>
      <div className="fs-page">
        {soonExpiring.map(a => (
          <div key={a.id} style={{
            background: '#fef3c7', border: '1px solid #d97706',
            borderRadius: 12, padding: '10px 14px', fontSize: 13,
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <span>⚠️</span>
            <span>
              <strong>{a.name}</strong> פוקע בתאריך {new Date(a.maturityDate).toLocaleDateString('he-IL')}
            </span>
          </div>
        ))}

        <div className="fs-type-tabs">
          {Object.entries(TYPE_LABELS).map(([type, label]) => (
            <button
              key={type}
              className={`fs-type-tab ${filter === type ? 'active' : ''}`}
              onClick={() => setFilter(type)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="fs-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--fs-text-muted)' }}>
              {filter === 'ALL' ? 'סה"כ תיק' : TYPE_LABELS[filter]}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, direction: 'ltr' }}>
              {formatCurrency(filtered.reduce((s, a) => s + a.currentValue, 0), 'ILS', lang)}
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--fs-text-muted)' }}>
            {filtered.length} נכסים
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="fs-asset-list">
            {filtered.map(asset => {
              const gl = getGainLoss(asset)
              const pct = totalValue > 0 ? (asset.currentValue / totalValue) * 100 : 0
              return (
                <Link key={asset.id} href={`/assets/${asset.id}`}
                  style={{ textDecoration: 'none' }}>
                  <div className="fs-asset-item">
                    <AssetIcon type={asset.type} />
                    <div className="fs-asset-info">
                      <div className="fs-asset-name">{asset.name}</div>
                      <div className="fs-asset-sub">{asset.institution}</div>
                      {asset.ticker && (
                        <span className="fs-badge" style={{
                          background: 'var(--fs-primary-light)', color: 'var(--fs-primary)',
                          marginTop: 2,
                        }}>{asset.ticker}</span>
                      )}
                      {asset.maturityDate && (
                        <div style={{ fontSize: 11, color: 'var(--fs-warning)', marginTop: 2 }}>
                          פוקע: {new Date(asset.maturityDate).toLocaleDateString('he-IL')}
                        </div>
                      )}
                    </div>
                    <div className="fs-asset-value">
                      <div className="fs-asset-amount" style={{ direction: 'ltr' }}>
                        {formatCurrency(asset.currentValue, asset.currency, lang)}
                      </div>
                      {gl !== null ? (
                        <div className={`fs-asset-change ${gl.gain >= 0 ? 'text-success' : 'text-danger'}`}
                          style={{ direction: 'ltr', textAlign: 'left' }}>
                          {gl.gain >= 0 ? '▲' : '▼'} {Math.abs(gl.pct).toFixed(1)}%
                        </div>
                      ) : (
                        <div className="fs-asset-change text-muted" style={{ direction: 'ltr', textAlign: 'left' }}>
                          {pct.toFixed(1)}% מהתיק
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="fs-empty">
            <div className="fs-empty-icon">💼</div>
            <div className="fs-empty-title">אין נכסים</div>
            <div className="fs-empty-text">לחץ + כדי להוסיף</div>
          </div>
        )}
      </div>

      <button className="fs-fab" onClick={() => setShowAdd(true)}>+</button>

      {showAdd && (
        <AddAssetDrawer
          lang={lang}
          initialType={filter !== 'ALL' ? filter : undefined}
          onClose={() => setShowAdd(false)}
          onSave={() => { setShowAdd(false); loadAssets() }}
        />
      )}
    </>
  )
}
