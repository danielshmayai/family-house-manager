'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lang, formatCurrency, t } from '@/lib/finance/i18n'
import { TrendChart, AllocationPie } from '@/components/finance/PortfolioChart'
import AssetIcon, { ASSET_COLORS } from '@/components/finance/AssetIcon'
import AddAssetDrawer from '@/components/finance/AddAssetDrawer'
import { generateShortTermProjection } from '@/lib/finance/forecasting'

const ASSET_TYPE_LABELS: Record<string, string> = {
  INVESTMENT: 'השקעות',
  SAVINGS: 'חסכונות',
  PENSION: 'פנסיה',
  PROVIDENT: 'קופת גמל',
  STUDY_FUND: 'קרן השתלמות',
  CHECKING: 'עו"ש',
}

export default function FinanceDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('he')
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    const savedLang = localStorage.getItem('fs_lang') as Lang || 'he'
    setLang(savedLang)
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/finance/login')
  }, [status, router])

  const loadAssets = async () => {
    try {
      const res = await fetch('/api/finance/assets')
      if (res.ok) setAssets(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') loadAssets()
  }, [status])

  if (status === 'loading' || loading) {
    return (
      <div className="fs-page" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ fontSize: 40 }}>📊</div>
        <p style={{ color: 'var(--fs-text-muted)' }}>{t(lang, 'loading')}</p>
      </div>
    )
  }

  // Compute totals
  const totalValue = assets.reduce((s, a) => s + a.currentValue, 0)

  // Group by type
  const byType: Record<string, number> = {}
  for (const a of assets) {
    byType[a.type] = (byType[a.type] || 0) + a.currentValue
  }

  const allocationData = Object.entries(byType).map(([type, value]) => ({
    name: ASSET_TYPE_LABELS[type] || type,
    value,
    type,
  }))

  // Portfolio trend: aggregate snapshots across all assets
  const snapshotMap: Record<string, number> = {}
  for (const asset of assets) {
    for (const snap of (asset.snapshots || [])) {
      const d = snap.date.slice(0, 7) // YYYY-MM
      snapshotMap[d] = (snapshotMap[d] || 0) + snap.value
    }
  }

  // Build trend from snapshots or generate projection
  let trendData: { year: number; value: number; label: string }[]
  const snapKeys = Object.keys(snapshotMap).sort()
  if (snapKeys.length >= 2) {
    trendData = snapKeys.map(k => ({
      year: parseInt(k.slice(0, 4)),
      value: snapshotMap[k],
      label: k.slice(0, 7),
    }))
  } else {
    // Generate simple projection
    trendData = generateShortTermProjection(totalValue, 6, 0, 10)
  }

  // Top assets
  const topAssets = [...assets].sort((a, b) => b.currentValue - a.currentValue).slice(0, 5)

  // Monthly deposits total
  const monthlyContrib = assets.reduce(
    (s, a) => s + (a.monthlyDeposit || 0) + (a.employerContribution || 0), 0
  )

  const userName = (session?.user as any)?.name || ''

  return (
    <>
      <div className="fs-page">
        {/* Greeting */}
        <div style={{ paddingTop: 4 }}>
          <p style={{ color: 'var(--fs-text-muted)', fontSize: 13 }}>
            {t(lang, 'welcome')}{userName ? `, ${userName}` : ''} 👋
          </p>
          <h1 style={{ fontWeight: 800, fontSize: 22, marginTop: 2 }}>
            {t(lang, 'myPortfolio')}
          </h1>
        </div>

        {/* Hero card */}
        <div className="fs-hero">
          <div className="fs-hero-label">{t(lang, 'totalPortfolio')}</div>
          <div className="fs-hero-value" style={{ direction: 'ltr', textAlign: 'right' }}>
            {formatCurrency(totalValue, 'ILS', lang)}
          </div>
          <div className="fs-hero-sub">
            <div className="fs-hero-chip">
              📥 {formatCurrency(monthlyContrib, 'ILS', lang)}/חודש
            </div>
            <div className="fs-hero-chip">
              🏦 {assets.length} נכסים
            </div>
          </div>
        </div>

        {/* Allocation pie */}
        {assets.length > 0 && (
          <div className="fs-card">
            <div className="fs-section-header">
              <span className="fs-section-title">{t(lang, 'allocation')}</span>
            </div>
            <AllocationPie data={allocationData} lang={lang} />
          </div>
        )}

        {/* Portfolio trend */}
        {assets.length > 0 && (
          <div className="fs-card">
            <div className="fs-section-header">
              <span className="fs-section-title">{t(lang, 'portfolioTrend')}</span>
            </div>
            <TrendChart data={trendData} lang={lang} />
          </div>
        )}

        {/* Allocation by type breakdown */}
        {allocationData.length > 0 && (
          <div>
            <div className="fs-section-header">
              <span className="fs-section-title">לפי קטגוריה</span>
            </div>
            <div className="fs-alloc-grid">
              {allocationData.map(item => (
                <div key={item.type} className="fs-alloc-item">
                  <div className="fs-alloc-dot" style={{ background: ASSET_COLORS[item.type] }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="fs-alloc-name">{item.name}</div>
                    <div className="fs-alloc-val">{formatCurrency(item.value, 'ILS', lang)}</div>
                    <div style={{ fontSize: 11, color: 'var(--fs-text-muted)' }}>
                      {totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top assets */}
        {topAssets.length > 0 ? (
          <div>
            <div className="fs-section-header">
              <span className="fs-section-title">נכסים מובילים</span>
              <Link href="/finance/assets" style={{ fontSize: 13, color: 'var(--fs-primary)', textDecoration: 'none' }}>
                הכל ←
              </Link>
            </div>
            <div className="fs-asset-list">
              {topAssets.map(asset => {
                const pct = totalValue > 0 ? (asset.currentValue / totalValue) * 100 : 0
                return (
                  <Link key={asset.id} href={`/finance/assets/${asset.id}`}
                    style={{ textDecoration: 'none' }}>
                    <div className="fs-asset-item">
                      <AssetIcon type={asset.type} />
                      <div className="fs-asset-info">
                        <div className="fs-asset-name">{asset.name}</div>
                        <div className="fs-asset-sub">{asset.institution}</div>
                        <div style={{ marginTop: 4 }}>
                          <div className="fs-progress-bar" style={{ height: 4, margin: '4px 0' }}>
                            <div className="fs-progress-fill"
                              style={{ width: `${pct}%`, background: ASSET_COLORS[asset.type] }} />
                          </div>
                        </div>
                      </div>
                      <div className="fs-asset-value">
                        <div className="fs-asset-amount" style={{ direction: 'ltr' }}>
                          {formatCurrency(asset.currentValue, asset.currency, lang)}
                        </div>
                        <div className="fs-asset-change text-muted" style={{ textAlign: 'left' }}>
                          {pct.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="fs-empty">
            <div className="fs-empty-icon">💼</div>
            <div className="fs-empty-title">{t(lang, 'addFirst')}</div>
            <div className="fs-empty-text">לחץ על + כדי להוסיף נכס ראשון</div>
          </div>
        )}

        {/* Quick links */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {[
            { href: '/finance/forecast', icon: '📈', label: 'תחזית' },
            { href: '/finance/goals', icon: '🎯', label: 'יעדים' },
            { href: '/finance/notifications', icon: '🔔', label: 'התראות' },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div className="fs-card" style={{ textAlign: 'center', padding: '14px 8px' }}>
                <div style={{ fontSize: 24 }}>{item.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>{item.label}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* FAB */}
      <button className="fs-fab" onClick={() => setShowAdd(true)}>+</button>

      {/* Add Asset Drawer */}
      {showAdd && (
        <AddAssetDrawer
          lang={lang}
          onClose={() => setShowAdd(false)}
          onSave={() => { setShowAdd(false); loadAssets() }}
        />
      )}
    </>
  )
}
