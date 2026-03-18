'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import LanguageToggle from '@/components/LanguageToggle'

const PRODUCT_ADMIN_EMAIL = process.env.NEXT_PUBLIC_PRODUCT_ADMIN_EMAIL || 'danielshmayai@gmail.com'

type PendingUser = {
  id: string
  name: string | null
  email: string
  approvalToken: string | null
  createdAt: string
  language: string
}

type HouseholdMember = {
  id: string
  name: string | null
  email: string
  role: string
  createdAt: string
}

type Household = {
  id: string
  name: string
  createdAt: string
  revokeToken: string | null
  members: HouseholdMember[]
}

export default function ProductAdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [pending, setPending] = useState<PendingUser[]>([])
  const [households, setHouseholds] = useState<Household[]>([])
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [familyNames, setFamilyNames] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [expandedHousehold, setExpandedHousehold] = useState<string | null>(null)

  const sessionUser = session?.user as any
  const isAdmin = sessionUser?.email === PRODUCT_ADMIN_EMAIL

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/login'); return }
    if (!isAdmin) return
    loadData()
  }, [status, session])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/families')
      const data = await res.json()
      setPending(data.pending || [])
      setHouseholds(data.households || [])
    } catch (e) {
      console.error('Failed to load families:', e)
    } finally {
      setLoading(false)
    }
  }

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleApprove(user: PendingUser) {
    const name = familyNames[user.id] || `משפחת ${user.name || user.email}`
    setApprovingId(user.id)
    try {
      const res = await fetch('/api/admin/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, familyName: name, lang: user.language }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'שגיאה')
      showToast(`✅ ${user.name || user.email} אושר! משפחה: ${data.householdName}`)
      await loadData()
    } catch (e: any) {
      showToast(`❌ ${e.message}`, false)
    } finally {
      setApprovingId(null)
    }
  }

  async function handleDelete(household: Household) {
    if (!confirm(`למחוק את משפחת "${household.name}" ואת כל הנתונים שלה?\nלא ניתן לבטל פעולה זו.`)) return
    setDeletingId(household.id)
    try {
      const res = await fetch('/api/admin/families', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId: household.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'שגיאה')
      showToast(`🗑️ משפחת "${household.name}" נמחקה (${data.memberCount} חברים הוסרו)`)
      await loadData()
    } catch (e: any) {
      showToast(`❌ ${e.message}`, false)
    } finally {
      setDeletingId(null)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('he-IL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  // ── Not loaded yet ───────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <div style={{ color: '#6b7280' }}>טוען...</div>
        </div>
      </div>
    )
  }

  // ── Access denied ────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center', background: 'white', borderRadius: '24px', padding: '48px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🚫</div>
          <h1 style={{ margin: '0 0 8px', color: '#1f2937' }}>אין גישה</h1>
          <p style={{ color: '#6b7280', margin: '0 0 24px' }}>דף זה שמור למנהל המוצר בלבד.</p>
          <button onClick={() => router.push('/')}
            style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
            חזרה לבית
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%)', fontFamily: 'system-ui', paddingBottom: '40px' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          background: toast.ok ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: 'white', padding: '14px 28px', borderRadius: '16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontWeight: '700', zIndex: 10000,
          fontSize: '15px', whiteSpace: 'nowrap',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
        color: 'white', padding: 'clamp(16px, 4vw, 24px)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🛡️ מנהל מוצר
            </h1>
            <p style={{ margin: '4px 0 0', opacity: 0.75, fontSize: 'clamp(12px, 3vw, 14px)' }}>
              ניהול משפחות ואישורי רישום
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <LanguageToggle />
            <button onClick={() => router.push('/')}
              style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '12px', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
              🏠 בית
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: 'clamp(16px, 4vw, 28px) clamp(12px, 3vw, 24px)' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <div style={{ color: '#6b7280' }}>טוען נתונים...</div>
          </div>
        ) : (
          <>
            {/* ── Section: Pending approvals ─────────────────────────────── */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ fontSize: '24px' }}>⏳</div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 'clamp(17px, 4vw, 21px)', fontWeight: '800', color: '#1f2937' }}>
                    ממתינים לאישור
                  </h2>
                  <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: '13px' }}>
                    {pending.length === 0 ? 'אין בקשות ממתינות' : `${pending.length} בקש${pending.length === 1 ? 'ה' : 'ות'} מחכות לאישור`}
                  </p>
                </div>
              </div>

              {pending.length === 0 ? (
                <div style={{ background: 'white', borderRadius: '18px', padding: '32px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', color: '#9ca3af' }}>
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>✅</div>
                  <div style={{ fontWeight: '600' }}>אין בקשות ממתינות כרגע</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pending.map(user => (
                    <div key={user.id} style={{
                      background: 'white', borderRadius: '18px',
                      padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                      border: '2px solid #fef3c7',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '15px', flexShrink: 0 }}>
                              {(user.name || user.email)[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: '800', fontSize: '15px', color: '#1f2937' }}>{user.name || '—'}</div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>{user.email}</div>
                            </div>
                            <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700' }}>
                              ממתין
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>
                            נרשם: {formatDate(user.createdAt)}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <label style={{ fontSize: '13px', color: '#374151', fontWeight: '600', flexShrink: 0 }}>שם המשפחה:</label>
                            <input
                              type="text"
                              placeholder={`משפחת ${user.name || user.email}`}
                              value={familyNames[user.id] || ''}
                              onChange={e => setFamilyNames(prev => ({ ...prev, [user.id]: e.target.value }))}
                              style={{
                                flex: '1 1 160px', padding: '8px 12px', border: '2px solid #e5e7eb',
                                borderRadius: '10px', fontSize: '13px', fontFamily: 'system-ui',
                                outline: 'none', minWidth: '120px',
                              }}
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => handleApprove(user)}
                          disabled={approvingId === user.id}
                          style={{
                            padding: '12px 20px',
                            background: approvingId === user.id
                              ? '#d1fae5'
                              : 'linear-gradient(135deg, #43e97b, #38f9d7)',
                            color: approvingId === user.id ? '#059669' : 'white',
                            border: 'none', borderRadius: '12px',
                            fontSize: '14px', fontWeight: '800', cursor: approvingId === user.id ? 'not-allowed' : 'pointer',
                            flexShrink: 0, whiteSpace: 'nowrap',
                            boxShadow: '0 4px 12px rgba(67,233,123,0.3)',
                          }}
                        >
                          {approvingId === user.id ? '⏳ מאשר...' : '✅ אשר רישום'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Section: Active households ────────────────────────────── */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ fontSize: '24px' }}>🏡</div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 'clamp(17px, 4vw, 21px)', fontWeight: '800', color: '#1f2937' }}>
                    משפחות פעילות
                  </h2>
                  <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: '13px' }}>
                    {households.length === 0 ? 'אין משפחות רשומות' : `${households.length} משפח${households.length === 1 ? 'ה' : 'ות'} במערכת`}
                  </p>
                </div>
              </div>

              {households.length === 0 ? (
                <div style={{ background: 'white', borderRadius: '18px', padding: '32px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', color: '#9ca3af' }}>
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>🏡</div>
                  <div style={{ fontWeight: '600' }}>אין משפחות רשומות עדיין</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {households.map(hh => {
                    const admin = hh.members.find(m => m.role === 'ADMIN')
                    const isExpanded = expandedHousehold === hh.id
                    return (
                      <div key={hh.id} style={{
                        background: 'white', borderRadius: '18px',
                        overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                        border: '2px solid #f3f4f6',
                      }}>
                        {/* Card header */}
                        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '16px', flexShrink: 0 }}>
                                🏡
                              </div>
                              <div>
                                <div style={{ fontWeight: '800', fontSize: '16px', color: '#1f2937' }}>{hh.name}</div>
                                {admin && (
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                    מנהל: {admin.name || admin.email}
                                  </div>
                                )}
                              </div>
                              <span style={{ background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700' }}>
                                פעיל
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: '#9ca3af' }}>
                              <span>נוצר: {formatDate(hh.createdAt)}</span>
                              <button
                                onClick={() => setExpandedHousehold(isExpanded ? null : hh.id)}
                                style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', fontSize: '12px', fontWeight: '700', padding: 0 }}
                              >
                                {hh.members.length} חברים {isExpanded ? '▲' : '▼'}
                              </button>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDelete(hh)}
                            disabled={deletingId === hh.id}
                            style={{
                              padding: '12px 20px',
                              background: deletingId === hh.id ? '#fee2e2' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                              color: deletingId === hh.id ? '#991b1b' : 'white',
                              border: 'none', borderRadius: '12px',
                              fontSize: '14px', fontWeight: '800', cursor: deletingId === hh.id ? 'not-allowed' : 'pointer',
                              flexShrink: 0, whiteSpace: 'nowrap',
                              boxShadow: '0 4px 12px rgba(239,68,68,0.25)',
                            }}
                          >
                            {deletingId === hh.id ? '⏳ מוחק...' : '🗑️ מחק משפחה'}
                          </button>
                        </div>

                        {/* Expanded members list */}
                        {isExpanded && (
                          <div style={{ borderTop: '1px solid #f3f4f6', padding: '16px 20px', background: '#fafafa' }}>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              חברי המשפחה
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {hh.members.map(member => (
                                <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                                  <div style={{
                                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                                    background: member.role === 'ADMIN'
                                      ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                      : member.role === 'MANAGER'
                                        ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
                                        : 'linear-gradient(135deg, #6b7280, #4b5563)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontSize: '11px', fontWeight: '800',
                                  }}>
                                    {(member.name || member.email)[0].toUpperCase()}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#1f2937' }}>{member.name || member.email}</div>
                                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>{member.email}</div>
                                  </div>
                                  <span style={{
                                    fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '8px',
                                    background: member.role === 'ADMIN' ? '#fef3c7' : member.role === 'MANAGER' ? '#ede9fe' : '#f3f4f6',
                                    color: member.role === 'ADMIN' ? '#92400e' : member.role === 'MANAGER' ? '#5b21b6' : '#374151',
                                  }}>
                                    {member.role === 'ADMIN' ? '👑 מנהל' : member.role === 'MANAGER' ? '⭐ מנהל' : '👤 חבר'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
