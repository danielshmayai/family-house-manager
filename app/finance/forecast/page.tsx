'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Lang, formatCurrency, t } from '@/lib/finance/i18n'
import { TrendChart } from '@/components/finance/PortfolioChart'
import type { ForecastResult } from '@/lib/finance/forecasting'

export default function ForecastPage() {
  const { status } = useSession()
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('he')
  const [currentAge, setCurrentAge] = useState(35)
  const [retirementAge, setRetirementAge] = useState(67)
  const [targetIncome, setTargetIncome] = useState(15000)
  const [forecast, setForecast] = useState<ForecastResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasAssets, setHasAssets] = useState(true)

  useEffect(() => {
    setLang(localStorage.getItem('fs_lang') as Lang || 'he')
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/finance/login')
    if (status === 'authenticated') runForecast()
  }, [status])

  const runForecast = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/finance/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentAge, retirementAge, targetMonthlyIncome: targetIncome }),
      })
      if (res.ok) {
        const data = await res.json()
        setForecast(data)
        setHasAssets(data.totalCurrentValue > 0)
      }
    } finally {
      setLoading(false)
    }
  }

  const riskColors = { low: '#0e9f6e', medium: '#d97706', high: '#e02424' }
  const riskLabels = { low: 'נמוך', medium: 'בינוני', high: 'גבוה' }

  return (
    <div className="fs-page">
      <h1 style={{ fontWeight: 800, fontSize: 22 }}>📈 {t(lang, 'forecast')}</h1>

      {/* Parameters */}
      <div className="fs-card">
        <div className="fs-section-title" style={{ marginBottom: 14 }}>הגדרות תחזית</div>
        <div className="fs-form">
          <div>
            <label className="fs-label">גיל נוכחי: <strong>{currentAge}</strong></label>
            <input type="range" min={20} max={80} value={currentAge}
              onChange={e => setCurrentAge(+e.target.value)}
              style={{ width: '100%', accentColor: 'var(--fs-primary)' }} />
          </div>
          <div>
            <label className="fs-label">גיל פרישה: <strong>{retirementAge}</strong></label>
            <input type="range" min={50} max={80} value={retirementAge}
              onChange={e => setRetirementAge(+e.target.value)}
              style={{ width: '100%', accentColor: 'var(--fs-primary)' }} />
          </div>
          <div>
            <label className="fs-label">הכנסה חודשית יעד: <strong>{formatCurrency(targetIncome, 'ILS', lang)}</strong></label>
            <input type="range" min={5000} max={50000} step={1000} value={targetIncome}
              onChange={e => setTargetIncome(+e.target.value)}
              style={{ width: '100%', accentColor: 'var(--fs-primary)' }} />
          </div>
          <button className="fs-btn fs-btn-primary fs-btn-block" onClick={runForecast}
            disabled={loading}>
            {loading ? 'מחשב...' : '🔄 חשב תחזית'}
          </button>
        </div>
      </div>

      {!hasAssets && (
        <div className="fs-empty">
          <div className="fs-empty-icon">📊</div>
          <div className="fs-empty-title">אין נכסים לתחזית</div>
          <div className="fs-empty-text">הוסף נכסים תחילה כדי לראות תחזיות עתידיות</div>
        </div>
      )}

      {forecast && hasAssets && (
        <>
          {/* Forecast hero */}
          <div className="fs-forecast-hero">
            <div style={{ fontSize: 12, opacity: 0.8 }}>שווי צפוי בגיל {retirementAge}</div>
            <div style={{ fontSize: 32, fontWeight: 800, direction: 'ltr', marginTop: 4 }}>
              {formatCurrency(forecast.projectedRetirementValue, 'ILS', lang)}
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 12, justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, opacity: 0.8 }}>הכנסה חודשית צפויה</div>
                <div style={{ fontSize: 18, fontWeight: 700, direction: 'ltr' }}>
                  {formatCurrency(forecast.estimatedMonthlyIncome, 'ILS', lang)}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, opacity: 0.8 }}>שנים לפרישה</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{forecast.yearsToRetirement}</div>
              </div>
            </div>
          </div>

          {/* Goal gap */}
          <div className="fs-card">
            <div className="fs-section-title" style={{ marginBottom: 12 }}>🎯 יעד vs. תחזית</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
              <span>יעד: {formatCurrency(forecast.goalGapAnalysis.targetMonthlyIncome, 'ILS', lang)}/חודש</span>
              <span>תחזית: {formatCurrency(forecast.goalGapAnalysis.estimatedMonthlyIncome, 'ILS', lang)}/חודש</span>
            </div>
            <div className="fs-progress-bar" style={{ height: 12 }}>
              <div className="fs-progress-fill" style={{
                width: `${Math.min(100, (forecast.goalGapAnalysis.estimatedMonthlyIncome / forecast.goalGapAnalysis.targetMonthlyIncome) * 100)}%`,
                background: forecast.goalGapAnalysis.onTrack ? 'var(--fs-success)' : 'var(--fs-danger)',
              }} />
            </div>
            <div style={{
              marginTop: 10, textAlign: 'center', fontWeight: 700, fontSize: 14,
              color: forecast.goalGapAnalysis.onTrack ? 'var(--fs-success)' : 'var(--fs-danger)',
            }}>
              {forecast.goalGapAnalysis.onTrack
                ? `✅ על המסלול! עודף: ${formatCurrency(forecast.goalGapAnalysis.gap, 'ILS', lang)}/חודש`
                : `⚠️ פער: ${formatCurrency(Math.abs(forecast.goalGapAnalysis.gap), 'ILS', lang)}/חודש`
              }
            </div>
          </div>

          {/* Risk meter */}
          <div className="fs-card">
            <div className="fs-section-title" style={{ marginBottom: 12 }}>
              ⚖️ {t(lang, 'riskScore')}: {riskLabels[forecast.riskLabel]}
              <span style={{
                marginRight: 8, fontSize: 13, fontWeight: 600,
                color: riskColors[forecast.riskLabel],
              }}>
                ({forecast.riskScore}/100)
              </span>
            </div>
            <div className="fs-risk-meter">
              <div className="fs-risk-needle" style={{ left: `${forecast.riskScore}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fs-text-muted)', marginTop: 4 }}>
              <span>🟢 נמוך</span>
              <span>🟡 בינוני</span>
              <span>🔴 גבוה</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--fs-text-muted)', marginTop: 12 }}>
              {forecast.riskLabel === 'low' && 'התיק שלך שמרני - מרבית הנכסים בסיכון נמוך. שקול להגדיל חשיפה להשקעות לתשואה גבוהה יותר.'}
              {forecast.riskLabel === 'medium' && 'התיק שלך מאוזן טוב. שמור על הגיוון הנוכחי.'}
              {forecast.riskLabel === 'high' && 'התיק שלך בחשיפה גבוהה לשוק. שקול הוספת נכסים סולידיים לאיזון.'}
            </p>
          </div>

          {/* Growth projection chart */}
          {forecast.growthPoints.length > 1 && (
            <div className="fs-card">
              <div className="fs-section-title" style={{ marginBottom: 12 }}>
                📊 {t(lang, 'growthProjection')}
              </div>
              <TrendChart data={forecast.growthPoints} lang={lang} color="#7e3af2" />
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--fs-text-muted)' }}>
                <span>כיום: {formatCurrency(forecast.totalCurrentValue, 'ILS', lang)}</span>
                <span>בפרישה: {formatCurrency(forecast.projectedRetirementValue, 'ILS', lang)}</span>
              </div>
            </div>
          )}

          {/* Metrics */}
          <div className="fs-metric-grid">
            <div className="fs-metric">
              <div className="fs-metric-label">שווי נוכחי</div>
              <div className="fs-metric-value" style={{ fontSize: 16, direction: 'ltr' }}>
                {formatCurrency(forecast.totalCurrentValue, 'ILS', lang)}
              </div>
            </div>
            <div className="fs-metric">
              <div className="fs-metric-label">גיל פרישה</div>
              <div className="fs-metric-value">{retirementAge}</div>
              <div className="fs-metric-sub">עוד {forecast.yearsToRetirement} שנים</div>
            </div>
            <div className="fs-metric">
              <div className="fs-metric-label">צמיחה צפויה</div>
              <div className="fs-metric-value" style={{ fontSize: 16 }}>
                {forecast.totalCurrentValue > 0
                  ? `×${(forecast.projectedRetirementValue / forecast.totalCurrentValue).toFixed(1)}`
                  : '-'
                }
              </div>
            </div>
            <div className="fs-metric">
              <div className="fs-metric-label">הכנסה חודשית</div>
              <div className="fs-metric-value" style={{ fontSize: 14, direction: 'ltr' }}>
                {formatCurrency(forecast.estimatedMonthlyIncome, 'ILS', lang)}
              </div>
              <div className="fs-metric-sub">על פי כלל 4%</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
