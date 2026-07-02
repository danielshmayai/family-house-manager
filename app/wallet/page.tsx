"use client"
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/language-context'
import { t } from '@/lib/i18n'
import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Sheet from '@/components/ui/Sheet'

type Transaction = {
  id: string
  amount: number
  type: 'CREDIT' | 'DEBIT' | 'POINTS_CONVERSION' | 'RECURRING'
  description: string | null
  pointsUsed: number | null
  createdAt: string
}

type AllTransaction = Transaction & {
  wallet: { user: { id: string; name: string | null } }
}

type WalletRequest = {
  id: string
  amount: number
  description: string | null
  status: 'PENDING' | 'APPROVED' | 'DENIED'
  createdAt: string
  user?: { id: string; name: string | null; email: string }
}

type WalletData = {
  id: string
  balance: number
  availablePoints: number
  transactions: Transaction[]
}

type MemberWallet = {
  id: string
  balance: number
  availablePoints: number
  user: { id: string; name: string | null }
}

type Coin = { id: number; x: number; y: number; size: number; delay: number; rotation: number }

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

function formatMoney(amount: number) {
  return `${amount < 0 ? '-' : ''}₪${Math.abs(amount).toFixed(2)}`
}

export default function WalletPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { lang } = useLang()
  const isRtl = lang === 'he'

  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [allTransactions, setAllTransactions] = useState<AllTransaction[]>([])
  const [memberWallets, setMemberWallets] = useState<MemberWallet[]>([])
  const [rate, setRate] = useState(0)
  const [minPoints, setMinPoints] = useState(300)
  const [loading, setLoading] = useState(true)

  // Which sheet is open (one at a time)
  const [sheet, setSheet] = useState<null | 'convert' | 'request' | 'rate' | 'history'>(null)
  const [selectedMember, setSelectedMember] = useState<{ id: string; name: string | null } | null>(null)

  // Convert form
  const [convertPoints, setConvertPoints] = useState('')
  const [converting, setConverting] = useState(false)
  const [convertMsg, setConvertMsg] = useState('')

  // Wallet requests
  const [myRequests, setMyRequests] = useState<WalletRequest[]>([])
  const [pendingRequests, setPendingRequests] = useState<WalletRequest[]>([])
  const [requestAmount, setRequestAmount] = useState('')
  const [requestDesc, setRequestDesc] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [requestMsg, setRequestMsg] = useState('')
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  // Manager: rate settings
  const [newRate, setNewRate] = useState('')
  const [newMinPoints, setNewMinPoints] = useState('300')
  const [savingRate, setSavingRate] = useState(false)

  // Manager: adjust inside member sheet
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustDesc, setAdjustDesc] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  const [summaryCopied, setSummaryCopied] = useState(false)

  // Coin animation
  const [showCoins, setShowCoins] = useState(false)
  const [coins, setCoins] = useState<Coin[]>([])
  const coinTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sessionUser = session?.user as any
  const isManager = sessionUser?.role === 'ADMIN' || sessionUser?.role === 'MANAGER'

  const fetchRequests = useCallback(async () => {
    if (!sessionUser?.id) return
    const res = await fetch('/api/wallet/request')
    if (!res.ok) return
    const data = await res.json()
    const isManagerUser = sessionUser?.role === 'ADMIN' || sessionUser?.role === 'MANAGER'
    if (isManagerUser) setPendingRequests(data)
    else setMyRequests(data)
  }, [sessionUser?.id, sessionUser?.role])

  const fetchData = useCallback(async () => {
    if (!sessionUser?.id) return
    setLoading(true)
    try {
      const requests: Promise<Response>[] = [
        fetch('/api/wallet'),
        fetch('/api/household/wallet-rate'),
      ]
      const isManagerUser = sessionUser?.role === 'ADMIN' || sessionUser?.role === 'MANAGER'
      if (isManagerUser) {
        requests.push(fetch('/api/wallet?all=true'))
        // Process any due recurring payments silently
        fetch('/api/cron/process-recurring', { method: 'POST' }).catch(() => {})
      }

      const [walletRes, rateRes, allTxRes] = await Promise.all(requests)

      if (walletRes.ok) setWallet(await walletRes.json())
      fetchRequests()
      if (rateRes.ok) {
        const r = await rateRes.json()
        setRate(r.pointToNisRate ?? 0)
        setNewRate(String(r.pointToNisRate ?? 0))
        setMinPoints(r.minPointsConversion ?? 300)
        setNewMinPoints(String(r.minPointsConversion ?? 300))
      }
      if (allTxRes?.ok) {
        const allData = await allTxRes.json()
        setAllTransactions(allData.transactions ?? [])
        setMemberWallets(allData.memberWallets ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [sessionUser?.id, sessionUser?.role, fetchRequests])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') fetchData()
  }, [status, fetchData])

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
        setSheet(null)
        triggerCoinAnimation()
        setConvertPoints('')
        fetchData()
      } else {
        setConvertMsg(data.error || 'Error')
      }
    } finally {
      setConverting(false)
    }
  }

  async function handleRequestMoney(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(requestAmount)
    if (!amt || amt <= 0) return
    setRequesting(true)
    setRequestMsg('')
    try {
      const res = await fetch('/api/wallet/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, description: requestDesc || undefined }),
      })
      const data = await res.json()
      if (res.ok) {
        setRequestAmount('')
        setRequestDesc('')
        setSheet(null)
        fetchRequests()
      } else {
        setRequestMsg(data.error || 'Error')
      }
    } finally {
      setRequesting(false)
    }
  }

  async function handleReviewRequest(id: string, action: 'APPROVE' | 'DENY') {
    setReviewingId(id)
    try {
      await fetch(`/api/wallet/request/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      fetchRequests()
      if (action === 'APPROVE') fetchData()
    } finally {
      setReviewingId(null)
    }
  }

  async function handleSaveRate(e: React.FormEvent) {
    e.preventDefault()
    setSavingRate(true)
    try {
      const res = await fetch('/api/household/wallet-rate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pointToNisRate: parseFloat(newRate),
          minPointsConversion: parseInt(newMinPoints, 10),
        })
      })
      if (res.ok) {
        const data = await res.json()
        setRate(data.pointToNisRate)
        setMinPoints(data.minPointsConversion ?? 300)
        setSheet(null)
      }
    } finally {
      setSavingRate(false)
    }
  }

  async function handleAdjust(type: 'CREDIT' | 'DEBIT') {
    if (!selectedMember || !adjustAmount) return
    setAdjusting(true)
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedMember.id,
          amount: parseFloat(adjustAmount),
          type,
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

  function txLabel(type: string) {
    if (type === 'CREDIT') return t(lang, 'walletTxCredit')
    if (type === 'DEBIT') return t(lang, 'walletTxDebit')
    if (type === 'RECURRING') return isRtl ? 'תשלום קבוע' : 'Recurring'
    return t(lang, 'walletTxConvert')
  }

  function txColor(type: string) {
    if (type === 'DEBIT') return 'var(--color-danger)'
    return 'var(--color-success)'
  }

  function formatTxDate(iso: string) {
    return new Date(iso).toLocaleDateString(isRtl ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jerusalem' })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
    border: '2px solid var(--color-line)', fontSize: 'clamp(14px,4vw,16px)',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }

  function TxRow({ tx, who, trailing }: { tx: Transaction; who?: string | null; trailing?: React.ReactNode }) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 'clamp(12px,3vw,14px)', color: 'var(--color-ink)' }}>
            {who ? `${who} · ` : ''}{txLabel(tx.type)}
          </p>
          {tx.description && (
            <p style={{ margin: 0, fontSize: 'clamp(11px,2.5vw,12px)', color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tx.description}
            </p>
          )}
          <p style={{ margin: 0, fontSize: 'clamp(10px,2.5vw,11px)', color: 'var(--color-muted)', opacity: 0.8 }}>
            {formatTxDate(tx.createdAt)}
          </p>
        </div>
        <span style={{ color: txColor(tx.type), fontWeight: 800, fontSize: 'clamp(14px,4vw,16px)', whiteSpace: 'nowrap' }}>
          {tx.type === 'DEBIT' ? '-' : '+'}₪{tx.amount.toFixed(2)}
        </span>
        {trailing}
      </div>
    )
  }

  if (status === 'loading' || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface)' }}>
        <p style={{ color: 'var(--color-muted)', fontSize: 'clamp(14px,4vw,16px)' }}>{t(lang, 'loading')}</p>
      </div>
    )
  }

  const pointsAvailable = wallet?.availablePoints ?? 0
  const maxConvertNis = rate > 0 ? pointsAvailable * rate : 0
  const enteredPoints = parseInt(convertPoints, 10)
  const belowMinimum = !!convertPoints && (!enteredPoints || enteredPoints < minPoints)

  // Recent = own transactions for members; household-wide for managers
  const recentTxs: (Transaction & { who?: string | null })[] = isManager
    ? allTransactions.slice(0, 5).map(tx => ({ ...tx, who: tx.wallet.user.name || tx.wallet.user.id }))
    : (wallet?.transactions ?? []).slice(0, 5)

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'var(--color-surface)' }}>

      {/* Coin animation overlay */}
      {showCoins && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 400, overflow: 'hidden' }}>
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
              position: 'absolute', left: `${coin.x}%`, top: `${coin.y}%`,
              fontSize: `${coin.size}px`,
              animation: 'coinFly 1.8s cubic-bezier(0.22,0.61,0.36,1) forwards',
              animationDelay: `${coin.delay}ms`,
              transform: `rotate(${coin.rotation}deg)`,
              userSelect: 'none'
            }}>🪙</div>
          ))}
          <div style={{ position: 'absolute', bottom: '8%', left: '50%', transform: 'translateX(-50%)', fontSize: 64, animation: 'walletPulse 0.6s ease-in-out 0.8s 2' }}>💰</div>
        </div>
      )}

      <PageHeader title={t(lang, 'walletTitle')} subtitle={t(lang, 'walletSubtitle')} />

      <div style={{ maxWidth: 'var(--page-max-width)', margin: '0 auto', padding: 'clamp(16px,4vw,24px)', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Balance hero */}
        <div style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', borderRadius: 'var(--radius-md)', padding: 'clamp(20px,5vw,28px)', textAlign: 'center', boxShadow: '0 8px 32px rgba(245,158,11,0.35)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, insetInlineEnd: -20, fontSize: 100, opacity: 0.1 }} aria-hidden="true">💰</div>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'clamp(12px,3vw,14px)', fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 8px' }}>
            {t(lang, 'walletBalance')}
          </p>
          <p style={{ color: '#fff', fontSize: 'clamp(36px,9vw,56px)', fontWeight: 900, margin: 0, lineHeight: 1 }}>
            {formatMoney(wallet?.balance ?? 0)}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
            <button
              onClick={() => { setConvertMsg(''); setSheet('convert') }}
              style={{ background: 'rgba(255,255,255,0.22)', border: '1.5px solid rgba(255,255,255,0.45)', borderRadius: 999, padding: '7px 16px', color: '#fff', fontWeight: 700, fontSize: 'clamp(12px,3.2vw,14px)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ⭐ {pointsAvailable} · {t(lang, 'walletConvertBtn')}
            </button>
            {!isManager && (
              <button
                onClick={() => { setRequestMsg(''); setSheet('request') }}
                style={{ background: 'rgba(255,255,255,0.22)', border: '1.5px solid rgba(255,255,255,0.45)', borderRadius: 999, padding: '7px 16px', color: '#fff', fontWeight: 700, fontSize: 'clamp(12px,3.2vw,14px)', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                💸 {isRtl ? 'בקש כסף' : 'Request money'}
              </button>
            )}
          </div>
        </div>

        {/* Member: my request statuses (only when there are any) */}
        {!isManager && myRequests.length > 0 && (
          <Card padding="sm">
            <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 'clamp(13px,3.5vw,15px)', color: 'var(--color-ink)' }}>
              💸 {isRtl ? 'בקשות הכסף שלי' : 'My money requests'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {myRequests.slice(0, 5).map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 'clamp(13px,3.5vw,14px)', color: 'var(--color-ink)' }}>₪{r.amount.toFixed(2)}</span>
                    {r.description && <span style={{ fontSize: 'clamp(11px,2.5vw,12px)', color: 'var(--color-muted)' }}> · {r.description}</span>}
                  </div>
                  <span style={{
                    padding: '3px 10px', borderRadius: 999, fontSize: 'clamp(10px,2.5vw,11px)', fontWeight: 700,
                    background: r.status === 'APPROVED' ? 'var(--color-success-bg)' : r.status === 'DENIED' ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)',
                    color: r.status === 'APPROVED' ? 'var(--color-success)' : r.status === 'DENIED' ? 'var(--color-danger)' : 'var(--color-warning)',
                  }}>
                    {r.status === 'APPROVED' ? (isRtl ? 'אושר' : 'Approved') : r.status === 'DENIED' ? (isRtl ? 'נדחה' : 'Denied') : (isRtl ? 'ממתין' : 'Pending')}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Manager: pending money requests */}
        {isManager && pendingRequests.length > 0 && (
          <Card padding="sm">
            <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 'clamp(13px,3.5vw,15px)', color: 'var(--color-ink)' }}>
              📥 {isRtl ? 'בקשות כסף ממתינות' : 'Pending money requests'}
              <span style={{ marginInlineStart: 8, background: 'var(--color-warning-bg)', color: 'var(--color-warning)', borderRadius: 12, padding: '2px 10px', fontSize: 'clamp(11px,2.5vw,13px)', fontWeight: 700 }}>
                {pendingRequests.length}
              </span>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingRequests.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--color-warning-bg)', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 'clamp(13px,3.5vw,15px)', color: 'var(--color-ink)' }}>
                      {r.user?.name || r.user?.email || '—'} · <span style={{ color: 'var(--color-warning)' }}>₪{r.amount.toFixed(2)}</span>
                    </p>
                    {r.description && (
                      <p style={{ margin: 0, fontSize: 'clamp(11px,2.5vw,12px)', color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button size="sm" onClick={() => handleReviewRequest(r.id, 'APPROVE')} disabled={reviewingId === r.id}
                      style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', boxShadow: 'none' }}>
                      {isRtl ? 'אשר' : 'Approve'}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleReviewRequest(r.id, 'DENY')} disabled={reviewingId === r.id}>
                      {isRtl ? 'דחה' : 'Deny'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Manager: family member wallets */}
        {isManager && memberWallets.length > 0 && (
          <Card padding="sm">
            <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 'clamp(13px,3.5vw,15px)', color: 'var(--color-ink)' }}>
              {t(lang, 'walletMembersTitle')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {memberWallets.map(mw => (
                <button
                  key={mw.id}
                  onClick={() => { setAdjustAmount(''); setAdjustDesc(''); setSelectedMember(mw.user) }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'start', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}
                >
                  <span style={{ fontWeight: 600, fontSize: 'clamp(13px,3.5vw,15px)', color: 'var(--color-ink)' }}>
                    {mw.user.name || mw.user.id}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {mw.availablePoints > 0 && (
                      <span style={{ fontSize: 'clamp(11px,2.5vw,12px)', color: 'var(--color-warning)', background: 'var(--color-warning-bg)', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>
                        ⭐ {mw.availablePoints}
                      </span>
                    )}
                    <span style={{ fontWeight: 800, fontSize: 'clamp(14px,4vw,16px)', color: mw.balance > 0 ? 'var(--color-success)' : mw.balance < 0 ? 'var(--color-danger)' : 'var(--color-muted)' }}>
                      {formatMoney(mw.balance)}
                    </span>
                    <span style={{ color: 'var(--color-muted)' }} aria-hidden="true">›</span>
                  </span>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Recent activity */}
        <Card padding="sm">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 'clamp(13px,3.5vw,15px)', color: 'var(--color-ink)' }}>
              {t(lang, 'walletHistory')}
            </p>
            {(isManager ? allTransactions.length : (wallet?.transactions?.length ?? 0)) > 5 && (
              <button
                onClick={() => setSheet('history')}
                style={{ background: 'none', border: 'none', color: 'var(--color-brand)', fontWeight: 700, fontSize: 'clamp(12px,3vw,13px)', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {isRtl ? 'הצג הכל ›' : 'View all ›'}
              </button>
            )}
          </div>
          {recentTxs.length === 0 ? (
            <p style={{ color: 'var(--color-muted)', fontSize: 'clamp(13px,3.5vw,14px)', margin: 0 }}>
              {t(lang, 'walletNoHistory')}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recentTxs.map(tx => <TxRow key={tx.id} tx={tx} who={tx.who} />)}
            </div>
          )}
        </Card>

        {/* Manager: tools */}
        {isManager && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => router.push('/wallet/recurring')} style={{ flex: 1, minWidth: 150 }}>
              🔁 {isRtl ? 'תשלומים קבועים' : 'Recurring payments'}
            </Button>
            <Button variant="secondary" onClick={() => setSheet('rate')} style={{ flex: 1, minWidth: 150 }}>
              ⚙️ {isRtl ? 'שער המרה ומינימום' : 'Rate & minimum'}
            </Button>
          </div>
        )}
      </div>

      {/* ── Convert sheet ── */}
      <Sheet open={sheet === 'convert'} onClose={() => setSheet(null)} title={t(lang, 'walletConvertTitle')}>
        {rate <= 0 ? (
          <p style={{ color: 'var(--color-muted)', fontSize: 'clamp(13px,3.5vw,14px)' }}>{t(lang, 'walletNoRate')}</p>
        ) : (
          <form onSubmit={handleConvert} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span
                onClick={() => setConvertPoints(String(pointsAvailable))}
                style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)', borderRadius: 8, padding: '4px 10px', fontSize: 'clamp(12px,3vw,13px)', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
              >
                {t(lang, 'walletPointsAvailable')(pointsAvailable)}
              </span>
              <span style={{ background: '#ede9fe', color: 'var(--color-brand-deep)', borderRadius: 8, padding: '4px 10px', fontSize: 'clamp(12px,3vw,13px)', fontWeight: 600 }}>
                {isRtl ? `מינימום: ${minPoints} נק'` : `Min: ${minPoints} pts`}
              </span>
              {maxConvertNis > 0 && (
                <span style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', borderRadius: 8, padding: '4px 10px', fontSize: 'clamp(12px,3vw,13px)', fontWeight: 600 }}>
                  {t(lang, 'walletConvertMax')(maxConvertNis)}
                </span>
              )}
            </div>
            <input
              type="number"
              min={minPoints}
              max={pointsAvailable}
              value={convertPoints}
              onChange={e => setConvertPoints(e.target.value)}
              placeholder={String(minPoints)}
              style={{ ...inputStyle, borderColor: belowMinimum ? '#fca5a5' : 'var(--color-line)' }}
            />
            {belowMinimum && (
              <p style={{ margin: 0, color: 'var(--color-danger)', fontWeight: 600, fontSize: 'clamp(12px,3vw,13px)' }}>
                {isRtl ? `נדרש מינימום של ${minPoints} נקודות להמרה` : `Minimum ${minPoints} points required to convert`}
              </p>
            )}
            {convertMsg && (
              <p style={{ margin: 0, color: 'var(--color-danger)', fontWeight: 600, fontSize: 'clamp(13px,3.5vw,14px)' }}>{convertMsg}</p>
            )}
            <Button type="submit" disabled={converting || !convertPoints || belowMinimum || (enteredPoints || 0) <= 0} fullWidth>
              {converting ? t(lang, 'walletConverting') : t(lang, 'walletConvertBtn')}
            </Button>
          </form>
        )}
      </Sheet>

      {/* ── Request money sheet (member) ── */}
      <Sheet open={sheet === 'request'} onClose={() => setSheet(null)} title={isRtl ? '💸 בקשת כסף' : '💸 Request Money'}>
        <form onSubmit={handleRequestMoney} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="number" min={0.01} step={0.01} required
            placeholder={isRtl ? 'סכום ₪' : 'Amount ₪'}
            value={requestAmount}
            onChange={e => setRequestAmount(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder={isRtl ? 'סיבה / תיאור (אופציונלי)' : 'Reason / description (optional)'}
            value={requestDesc}
            onChange={e => setRequestDesc(e.target.value)}
            style={inputStyle}
          />
          {requestMsg && (
            <p style={{ margin: 0, color: 'var(--color-danger)', fontWeight: 600, fontSize: 'clamp(12px,3vw,13px)' }}>{requestMsg}</p>
          )}
          <Button type="submit" disabled={requesting || !requestAmount} fullWidth>
            {requesting ? (isRtl ? 'שולח...' : 'Sending...') : (isRtl ? 'שלח בקשה' : 'Send Request')}
          </Button>
        </form>
      </Sheet>

      {/* ── Rate settings sheet (manager) ── */}
      <Sheet open={sheet === 'rate'} onClose={() => setSheet(null)} title={t(lang, 'walletRateTitle')}>
        <form onSubmit={handleSaveRate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ color: 'var(--color-muted)', fontSize: 'clamp(12px,3vw,13px)', margin: 0 }}>
            {t(lang, 'walletRateLabel')(rate)}
          </p>
          <div>
            <label style={{ fontSize: 'clamp(11px,2.5vw,12px)', color: 'var(--color-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
              {isRtl ? 'שער המרה (₪ לנקודה)' : 'Rate (₪ per point)'}
            </label>
            <input type="number" min={0} step={0.01} value={newRate} onChange={e => setNewRate(e.target.value)} placeholder="0.10" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 'clamp(11px,2.5vw,12px)', color: 'var(--color-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
              {isRtl ? 'מינימום נקודות להמרה' : 'Min points to convert'}
            </label>
            <input type="number" min={1} step={1} value={newMinPoints} onChange={e => setNewMinPoints(e.target.value)} placeholder="300" style={inputStyle} />
          </div>
          <Button type="submit" disabled={savingRate} fullWidth>
            {savingRate ? t(lang, 'walletRateSaving') : t(lang, 'walletRateSave')}
          </Button>
        </form>
      </Sheet>

      {/* ── Full history sheet ── */}
      <Sheet open={sheet === 'history'} onClose={() => setSheet(null)} title={t(lang, 'walletHistory')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(isManager
            ? allTransactions.map(tx => ({ ...tx, who: tx.wallet.user.name || tx.wallet.user.id }))
            : (wallet?.transactions ?? []).map(tx => ({ ...tx, who: undefined as string | undefined }))
          ).map(tx => <TxRow key={tx.id} tx={tx} who={tx.who} />)}
        </div>
      </Sheet>

      {/* ── Member detail sheet (manager): balance, adjust, history, copy/share ── */}
      {selectedMember && (() => {
        const memberTxs = allTransactions.filter(tx => tx.wallet.user.id === selectedMember.id)
        const memberWallet = memberWallets.find(mw => mw.user.id === selectedMember.id)
        const memberBalance = memberWallet?.balance ?? 0
        const memberName = selectedMember.name || selectedMember.id

        function buildSummaryText() {
          const lines = [
            `💰 ${isRtl ? `ארנק של ${memberName}` : `${memberName}'s Wallet`}`,
            `${isRtl ? 'יתרה' : 'Balance'}: ${formatMoney(memberBalance)}`,
          ]
          if (memberTxs.length > 0) {
            lines.push('')
            lines.push(isRtl ? '📜 היסטוריית עסקאות:' : '📜 Transaction history:')
            for (const tx of memberTxs.slice(0, 20)) {
              const sign = tx.type === 'DEBIT' ? '-' : '+'
              const desc = tx.description ? ` · ${tx.description}` : ''
              lines.push(`${sign}₪${tx.amount.toFixed(2)} · ${txLabel(tx.type)}${desc} · ${formatTxDate(tx.createdAt)}`)
            }
            if (memberTxs.length > 20) {
              lines.push(isRtl ? `…ועוד ${memberTxs.length - 20} עסקאות` : `…and ${memberTxs.length - 20} more`)
            }
          }
          return lines.join('\n')
        }

        async function copySummary() {
          const text = buildSummaryText()
          try {
            await navigator.clipboard.writeText(text)
          } catch {
            const ta = document.createElement('textarea')
            ta.value = text
            document.body.appendChild(ta)
            ta.select()
            document.execCommand('copy')
            document.body.removeChild(ta)
          }
          setSummaryCopied(true)
          setTimeout(() => setSummaryCopied(false), 2000)
        }

        async function shareSummary() {
          const text = buildSummaryText()
          if (navigator.share) {
            try { await navigator.share({ text }) } catch { /* user cancelled */ }
          } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
          }
        }

        async function cancelTx(txId: string) {
          await fetch(`/api/wallet/transaction/${txId}`, { method: 'DELETE' })
          await fetchData()
        }

        return (
          <Sheet open onClose={() => setSelectedMember(null)} title={`💰 ${memberName}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Balance */}
              <div style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', borderRadius: 'var(--radius-sm)', padding: '14px 18px', textAlign: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'clamp(10px,2.5vw,12px)', fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', margin: '0 0 4px' }}>
                  {t(lang, 'walletBalance')}
                </p>
                <p style={{ color: '#fff', fontSize: 'clamp(26px,7vw,36px)', fontWeight: 900, margin: 0, lineHeight: 1 }}>
                  {formatMoney(memberBalance)}
                </p>
              </div>

              {/* Copy / share */}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" onClick={copySummary} style={{ flex: 1, color: summaryCopied ? 'var(--color-success)' : undefined }}>
                  {summaryCopied ? (isRtl ? '✓ הועתק!' : '✓ Copied!') : (isRtl ? '📋 העתק סיכום' : '📋 Copy Summary')}
                </Button>
                <Button variant="secondary" onClick={shareSummary} style={{ flex: 1 }}>
                  {isRtl ? '📤 שתף' : '📤 Share'}
                </Button>
              </div>

              {/* Adjust balance (folded in from the old standalone form) */}
              <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 'clamp(12px,3.2vw,14px)', color: 'var(--color-ink)' }}>
                  {t(lang, 'walletAdjustTitle')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    type="number" min={0.01} step={0.01}
                    value={adjustAmount}
                    onChange={e => setAdjustAmount(e.target.value)}
                    placeholder={t(lang, 'walletAdjustAmount')}
                    style={{ ...inputStyle, background: '#fff' }}
                  />
                  <input
                    type="text"
                    value={adjustDesc}
                    onChange={e => setAdjustDesc(e.target.value)}
                    placeholder={t(lang, 'walletAdjustDesc')}
                    style={{ ...inputStyle, background: '#fff' }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      onClick={() => handleAdjust('CREDIT')}
                      disabled={adjusting || !adjustAmount}
                      style={{ flex: 1, background: 'var(--color-success)', boxShadow: 'none' }}
                    >
                      + {t(lang, 'walletTxCredit')}
                    </Button>
                    <Button
                      onClick={() => handleAdjust('DEBIT')}
                      disabled={adjusting || !adjustAmount}
                      style={{ flex: 1, background: 'var(--color-danger)', boxShadow: 'none' }}
                    >
                      − {t(lang, 'walletTxDebit')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Transactions with undo */}
              {memberTxs.length === 0 ? (
                <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '20px 0', fontSize: 'clamp(13px,3.5vw,15px)', margin: 0 }}>
                  {isRtl ? 'אין עסקאות עדיין' : 'No transactions yet'}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {memberTxs.map(tx => (
                    <TxRow
                      key={tx.id}
                      tx={tx}
                      trailing={
                        <button
                          onClick={() => cancelTx(tx.id)}
                          aria-label={isRtl ? 'בטל עסקה' : 'Cancel transaction'}
                          style={{ background: 'var(--color-danger-bg)', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 'clamp(10px,2.5vw,11px)', fontWeight: 700, color: 'var(--color-danger)', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
                        >
                          {isRtl ? 'בטל' : 'Undo'}
                        </button>
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </Sheet>
        )
      })()}
    </div>
  )
}
