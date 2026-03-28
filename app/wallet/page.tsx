"use client"
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/language-context'
import { t } from '@/lib/i18n'

type Transaction = {
  id: string
  amount: number
  type: 'CREDIT' | 'DEBIT' | 'POINTS_CONVERSION'
  description: string | null
  pointsUsed: number | null
  createdAt: string
}

type AllTransaction = Transaction & {
  wallet: { user: { id: string; name: string | null } }
}

type WalletData = {
  id: string
  balance: number
  availablePoints: number
  transactions: Transaction[]
}

type FamilyMember = {
  id: string
  name: string | null
  role: string
}

type Coin = {
  id: number
  x: number
  y: number
  size: number
  delay: number
  rotation: number
}

function generateCoins(count: number): Coin[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 20 + Math.random() * 60,
    y: 30 + Math.random() * 40,
    size: 20 + Math.floor(Math.random() * 16),
    delay: Math.random() * 700,
    rotation: Math.floor(Math.random() * 360)
  }))
}

function playBlingSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1)

      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1)
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.1 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.4)

      osc.start(ctx.currentTime + i * 0.1)
      osc.stop(ctx.currentTime + i * 0.1 + 0.4)
    })
  } catch {
    // Audio not supported — silent fallback
  }
}

export default function WalletPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { lang } = useLang()
  const isRtl = lang === 'he'

  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [allTransactions, setAllTransactions] = useState<AllTransaction[]>([])
  const [memberWallets, setMemberWallets] = useState<{ id: string; balance: number; availablePoints: number; user: { id: string; name: string | null } }[]>([])
  const [rate, setRate] = useState(0)
  const [loading, setLoading] = useState(true)

  // Convert form
  const [convertPoints, setConvertPoints] = useState('')
  const [converting, setConverting] = useState(false)
  const [convertMsg, setConvertMsg] = useState('')

  // Manager: adjust balance
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [adjustUserId, setAdjustUserId] = useState('')
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustType, setAdjustType] = useState<'CREDIT' | 'DEBIT'>('CREDIT')
  const [adjustDesc, setAdjustDesc] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  // Manager: set rate
  const [newRate, setNewRate] = useState('')
  const [savingRate, setSavingRate] = useState(false)

  // Coin animation
  const [showCoins, setShowCoins] = useState(false)
  const [coins, setCoins] = useState<Coin[]>([])
  const coinTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sessionUser = session?.user as any

  const isManager = sessionUser?.role === 'ADMIN' || sessionUser?.role === 'MANAGER'

  const fetchData = useCallback(async () => {
    if (!sessionUser?.id) return
    setLoading(true)
    try {
      const requests: Promise<Response>[] = [
        fetch('/api/wallet'),
        fetch('/api/household/wallet-rate'),
      ]
      const isManagerUser = sessionUser?.role === 'ADMIN' || sessionUser?.role === 'MANAGER'
      if (isManagerUser) requests.push(fetch('/api/wallet?all=true'))

      const [walletRes, rateRes, allTxRes] = await Promise.all(requests)

      if (walletRes.ok) setWallet(await walletRes.json())
      if (rateRes.ok) {
        const r = await rateRes.json()
        setRate(r.pointToNisRate ?? 0)
        setNewRate(String(r.pointToNisRate ?? 0))
      }
      if (allTxRes?.ok) {
        const allData = await allTxRes.json()
        setAllTransactions(allData.transactions ?? [])
        setMemberWallets(allData.memberWallets ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [sessionUser?.id, sessionUser?.role])

  const fetchMembers = useCallback(async () => {
    if (!isManager || !sessionUser?.householdId) return
    const res = await fetch(`/api/users?householdId=${sessionUser.householdId}`)
    if (res.ok) setMembers(await res.json())
  }, [isManager, sessionUser?.householdId])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData()
      fetchMembers()
    }
  }, [status, fetchData, fetchMembers])

  function triggerCoinAnimation() {
    setCoins(generateCoins(18))
    setShowCoins(true)
    playBlingSound()
    if (coinTimer.current) clearTimeout(coinTimer.current)
    coinTimer.current = setTimeout(() => setShowCoins(false), 2200)
  }

  async function handleConvert(e: React.FormEvent) {
    e.preventDefault()
    const pts = parseInt(convertPoints, 10)
    if (!pts || pts <= 0) return
    setConverting(true)
    setConvertMsg('')
    try {
      const res = await fetch('/api/wallet/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: pts })
      })
      const data = await res.json()
      if (res.ok) {
        triggerCoinAnimation()
        setConvertMsg(t(lang, 'walletConvertSuccess')(data.pointsUsed, data.nisAdded))
        setConvertPoints('')
        fetchData()
      } else {
        setConvertMsg(data.error || 'Error')
      }
    } finally {
      setConverting(false)
    }
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault()
    if (!adjustUserId || !adjustAmount) return
    setAdjusting(true)
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: adjustUserId,
          amount: parseFloat(adjustAmount),
          type: adjustType,
          description: adjustDesc || undefined
        })
      })
      if (res.ok) {
        setAdjustAmount('')
        setAdjustDesc('')
        fetchData()
      }
    } finally {
      setAdjusting(false)
    }
  }

  async function handleSaveRate(e: React.FormEvent) {
    e.preventDefault()
    setSavingRate(true)
    try {
      const res = await fetch('/api/household/wallet-rate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pointToNisRate: parseFloat(newRate) })
      })
      if (res.ok) {
        const data = await res.json()
        setRate(data.pointToNisRate)
      }
    } finally {
      setSavingRate(false)
    }
  }

  function txLabel(type: string) {
    if (type === 'CREDIT') return t(lang, 'walletTxCredit')
    if (type === 'DEBIT') return t(lang, 'walletTxDebit')
    return t(lang, 'walletTxConvert')
  }

  function txColor(type: string) {
    if (type === 'CREDIT' || type === 'POINTS_CONVERSION') return '#16a34a'
    return '#dc2626'
  }

  if (status === 'loading' || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <p style={{ color: '#6b7280', fontSize: 'clamp(14px,4vw,16px)' }}>{t(lang, 'loading')}</p>
      </div>
    )
  }

  const pointsAvailable = wallet?.availablePoints ?? 0
  const maxConvertNis = rate > 0 ? pointsAvailable * rate : 0

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#fef9c3 0%,#fef3c7 50%,#fde68a 100%)', padding: 'clamp(16px,4vw,32px)', fontFamily: 'system-ui,sans-serif', position: 'relative', overflow: 'hidden' }}>

      {/* Coin animation overlay */}
      {showCoins && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100, overflow: 'hidden' }}>
          <style>{`
            @keyframes coinFly {
              0%   { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
              60%  { opacity: 1; }
              100% { transform: translateY(-80vh) rotate(720deg) scale(0.3); opacity: 0; }
            }
            @keyframes walletPulse {
              0%,100% { transform: scale(1); }
              30%      { transform: scale(1.18); }
              60%      { transform: scale(0.96); }
            }
          `}</style>
          {coins.map(coin => (
            <div key={coin.id} style={{
              position: 'absolute',
              left: `${coin.x}%`,
              top: `${coin.y}%`,
              fontSize: `${coin.size}px`,
              animation: `coinFly 1.8s cubic-bezier(0.22,0.61,0.36,1) forwards`,
              animationDelay: `${coin.delay}ms`,
              transform: `rotate(${coin.rotation}deg)`,
              userSelect: 'none'
            }}>🪙</div>
          ))}
          {/* Wallet icon at bottom center */}
          <div style={{
            position: 'absolute',
            bottom: '8%',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '64px',
            animation: 'walletPulse 0.6s ease-in-out 0.8s 2',
          }}>💰</div>
        </div>
      )}

      {/* Header */}
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ fontSize: 'clamp(22px,6vw,32px)', fontWeight: 800, color: '#78350f', margin: '0 0 4px' }}>
          {t(lang, 'walletTitle')}
        </h1>
        <p style={{ color: '#92400e', fontSize: 'clamp(13px,3.5vw,15px)', margin: '0 0 24px' }}>
          {t(lang, 'walletSubtitle')}
        </p>

        {/* Balance card */}
        <div style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', borderRadius: 20, padding: 'clamp(20px,5vw,32px)', textAlign: 'center', boxShadow: '0 8px 32px rgba(245,158,11,0.4)', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 100, opacity: 0.1 }}>💰</div>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'clamp(12px,3vw,14px)', fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 8px' }}>
            {t(lang, 'walletBalance')}
          </p>
          <p style={{ color: '#fff', fontSize: 'clamp(40px,10vw,64px)', fontWeight: 900, margin: 0, lineHeight: 1 }}>
            {t(lang, 'walletCurrency')}{(wallet?.balance ?? 0).toFixed(2)}
          </p>
        </div>

        {/* Convert points section */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 'clamp(16px,4vw,24px)', marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: 'clamp(15px,4vw,18px)', fontWeight: 700, color: '#1f2937', margin: '0 0 12px' }}>
            {t(lang, 'walletConvertTitle')}
          </h2>

          {rate <= 0 ? (
            <p style={{ color: '#9ca3af', fontSize: 'clamp(13px,3.5vw,14px)' }}>
              {t(lang, 'walletNoRate')}
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <span
                  onClick={() => setConvertPoints(String(pointsAvailable))}
                  style={{ background: '#fef3c7', color: '#92400e', borderRadius: 8, padding: '4px 10px', fontSize: 'clamp(12px,3vw,13px)', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                >
                  {t(lang, 'walletPointsAvailable')(pointsAvailable)}
                </span>
                {isManager && (
                  <span style={{ background: '#d1fae5', color: '#065f46', borderRadius: 8, padding: '4px 10px', fontSize: 'clamp(12px,3vw,13px)', fontWeight: 600 }}>
                    {t(lang, 'walletRate')(rate)}
                  </span>
                )}
                {maxConvertNis > 0 && (
                  <span
                    onClick={() => setConvertPoints(String(pointsAvailable))}
                    style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 8, padding: '4px 10px', fontSize: 'clamp(12px,3vw,13px)', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                  >
                    {t(lang, 'walletConvertMax')(maxConvertNis)}
                  </span>
                )}
              </div>

              <form onSubmit={handleConvert} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <input
                    type="number"
                    min={1}
                    max={pointsAvailable}
                    value={convertPoints}
                    onChange={e => setConvertPoints(e.target.value)}
                    placeholder="100"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '2px solid #fde68a', fontSize: 'clamp(14px,4vw,16px)', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={converting || !convertPoints || parseInt(convertPoints) <= 0}
                  style={{ padding: '10px 20px', borderRadius: 10, background: converting ? '#d1d5db' : 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', fontWeight: 700, border: 'none', cursor: converting ? 'not-allowed' : 'pointer', fontSize: 'clamp(13px,3.5vw,15px)', whiteSpace: 'nowrap' }}
                >
                  {converting ? t(lang, 'walletConverting') : t(lang, 'walletConvertBtn')}
                </button>
              </form>

              {convertMsg && (
                <p style={{ marginTop: 10, color: convertMsg.includes('!') ? '#16a34a' : '#dc2626', fontWeight: 600, fontSize: 'clamp(13px,3.5vw,14px)' }}>
                  {convertMsg}
                </p>
              )}
            </>
          )}
        </div>

        {/* Manager: set rate + adjust balance */}
        {isManager && (
          <>
            {/* Rate setting */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 'clamp(16px,4vw,24px)', marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <h2 style={{ fontSize: 'clamp(15px,4vw,18px)', fontWeight: 700, color: '#1f2937', margin: '0 0 4px' }}>
                {t(lang, 'walletRateTitle')}
              </h2>
              <p style={{ color: '#6b7280', fontSize: 'clamp(12px,3vw,13px)', margin: '0 0 12px' }}>
                {t(lang, 'walletRateLabel')(rate)}
              </p>
              <form onSubmit={handleSaveRate} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={newRate}
                  onChange={e => setNewRate(e.target.value)}
                  placeholder="0.10"
                  style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '2px solid #e5e7eb', fontSize: 'clamp(14px,4vw,16px)', outline: 'none' }}
                />
                <button
                  type="submit"
                  disabled={savingRate}
                  style={{ padding: '10px 20px', borderRadius: 10, background: savingRate ? '#d1d5db' : '#1f2937', color: '#fff', fontWeight: 700, border: 'none', cursor: savingRate ? 'not-allowed' : 'pointer', fontSize: 'clamp(13px,3.5vw,15px)', whiteSpace: 'nowrap' }}
                >
                  {savingRate ? t(lang, 'walletRateSaving') : t(lang, 'walletRateSave')}
                </button>
              </form>
            </div>

            {/* Adjust balance */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 'clamp(16px,4vw,24px)', marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <h2 style={{ fontSize: 'clamp(15px,4vw,18px)', fontWeight: 700, color: '#1f2937', margin: '0 0 12px' }}>
                {t(lang, 'walletAdjustTitle')}
              </h2>
              <form onSubmit={handleAdjust} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <select
                  aria-label={t(lang, 'walletAdjustMember')}
                  value={adjustUserId}
                  onChange={e => setAdjustUserId(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 10, border: '2px solid #e5e7eb', fontSize: 'clamp(13px,3.5vw,15px)', background: '#fff' }}
                >
                  <option value="">{t(lang, 'walletAdjustMember')}...</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name || m.id}</option>
                  ))}
                </select>

                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={adjustAmount}
                    onChange={e => setAdjustAmount(e.target.value)}
                    placeholder={t(lang, 'walletAdjustAmount')}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '2px solid #e5e7eb', fontSize: 'clamp(13px,3.5vw,15px)', outline: 'none' }}
                  />
                  <select
                    aria-label={t(lang, 'walletAdjustType')}
                    value={adjustType}
                    onChange={e => setAdjustType(e.target.value as 'CREDIT' | 'DEBIT')}
                    style={{ padding: '10px 14px', borderRadius: 10, border: '2px solid #e5e7eb', fontSize: 'clamp(13px,3.5vw,15px)', background: '#fff' }}
                  >
                    <option value="CREDIT">{t(lang, 'walletTxCredit')} +</option>
                    <option value="DEBIT">{t(lang, 'walletTxDebit')} -</option>
                  </select>
                </div>

                <input
                  type="text"
                  value={adjustDesc}
                  onChange={e => setAdjustDesc(e.target.value)}
                  placeholder={t(lang, 'walletAdjustDesc')}
                  style={{ padding: '10px 14px', borderRadius: 10, border: '2px solid #e5e7eb', fontSize: 'clamp(13px,3.5vw,15px)', outline: 'none' }}
                />

                <button
                  type="submit"
                  disabled={adjusting || !adjustUserId || !adjustAmount}
                  style={{ padding: '12px', borderRadius: 10, background: adjusting ? '#d1d5db' : '#059669', color: '#fff', fontWeight: 700, border: 'none', cursor: adjusting ? 'not-allowed' : 'pointer', fontSize: 'clamp(13px,3.5vw,15px)' }}
                >
                  {adjusting ? t(lang, 'walletAdjusting') : t(lang, 'walletAdjustBtn')}
                </button>
              </form>
            </div>
          </>
        )}

        {/* Transaction history */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 'clamp(16px,4vw,24px)', marginBottom: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: 'clamp(15px,4vw,18px)', fontWeight: 700, color: '#1f2937', margin: '0 0 12px' }}>
            {t(lang, 'walletHistory')}
          </h2>
          {!wallet?.transactions?.length ? (
            <p style={{ color: '#9ca3af', fontSize: 'clamp(13px,3.5vw,14px)' }}>
              {t(lang, 'walletNoHistory')}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
              {wallet.transactions.map(tx => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: '#f9fafb', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 'clamp(12px,3vw,14px)', color: '#1f2937' }}>
                      {txLabel(tx.type)}
                    </p>
                    <p style={{ margin: 0, fontSize: 'clamp(11px,2.5vw,12px)', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.description || '—'}
                    </p>
                    <p style={{ margin: 0, fontSize: 'clamp(10px,2.5vw,11px)', color: '#9ca3af' }}>
                      {new Date(tx.createdAt).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span style={{ color: txColor(tx.type), fontWeight: 800, fontSize: 'clamp(14px,4vw,16px)', whiteSpace: 'nowrap' }}>
                    {tx.type === 'DEBIT' ? '-' : '+'}₪{tx.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Manager: member wallet balances overview */}
        {isManager && memberWallets.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 'clamp(16px,4vw,24px)', marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: 'clamp(15px,4vw,18px)', fontWeight: 700, color: '#1f2937', margin: '0 0 12px' }}>
              {t(lang, 'walletMembersTitle')}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {memberWallets.map(mw => (
                <div key={mw.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: '#f9fafb' }}>
                  <span style={{ fontWeight: 600, fontSize: 'clamp(13px,3.5vw,15px)', color: '#1f2937' }}>
                    {mw.user.name || mw.user.id}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {mw.availablePoints > 0 && (
                      <span style={{ fontSize: 'clamp(11px,2.5vw,12px)', color: '#92400e', background: '#fef3c7', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>
                        ⭐ {mw.availablePoints} pts
                      </span>
                    )}
                    <span style={{ fontWeight: 800, fontSize: 'clamp(14px,4vw,16px)', color: mw.balance > 0 ? '#16a34a' : '#6b7280' }}>
                      ₪{mw.balance.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manager: all household transactions */}
        {isManager && allTransactions.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 'clamp(16px,4vw,24px)', marginBottom: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: 'clamp(15px,4vw,18px)', fontWeight: 700, color: '#1f2937', margin: '0 0 12px' }}>
              {t(lang, 'walletHistory')} — {t(lang, 'walletMembersTitle')}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
              {allTransactions.map(tx => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: '#f9fafb', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 'clamp(12px,3vw,14px)', color: '#1f2937' }}>
                      {tx.wallet.user.name || tx.wallet.user.id} · {txLabel(tx.type)}
                    </p>
                    <p style={{ margin: 0, fontSize: 'clamp(11px,2.5vw,12px)', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.description || '—'}
                    </p>
                    <p style={{ margin: 0, fontSize: 'clamp(10px,2.5vw,11px)', color: '#9ca3af' }}>
                      {new Date(tx.createdAt).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span style={{ color: txColor(tx.type), fontWeight: 800, fontSize: 'clamp(14px,4vw,16px)', whiteSpace: 'nowrap' }}>
                    {tx.type === 'DEBIT' ? '-' : '+'}₪{tx.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
