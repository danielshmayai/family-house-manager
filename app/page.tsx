"use client"
import React, { useEffect, useState, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import IconDisplay from '@/components/IconDisplay'
import LanguageToggle from '@/components/LanguageToggle'
import { useLang } from '@/lib/language-context'
import { t } from '@/lib/i18n'
import { compressImage } from '@/lib/compressImage'

type Category = {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  activities?: Activity[]
}

type Activity = {
  id: string
  key: string
  categoryId: string
  name: string
  description?: string
  icon?: string
  defaultPoints: number
  frequency: string
  isActive: boolean
  requiresNote?: boolean
  requiresPhoto?: boolean
}

type EventItem = {
  id: string
  eventType: string
  occurredAt: string
  activityId?: string
  activity?: { id: string; name: string; icon?: string; defaultPoints: number }
  recordedById: string
  points: number
  metadata?: string
}

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { lang } = useLang()
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(false)
  const [completing, setCompleting] = useState<string | null>(null)
  const [reverting, setReverting] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; emoji: string } | null>(null)
  const [noteModal, setNoteModal] = useState<{ activity: Activity } | null>(null)
  const [noteInput, setNoteInput] = useState('')
  const [photoInput, setPhotoInput] = useState<string | null>(null)
  const [viewModal, setViewModal] = useState<{ activity: Activity; note?: string; photo?: string } | null>(null)

  const sessionUser = session?.user as any
  const householdId = sessionUser?.householdId
  const userId = sessionUser?.id
  const userRole = sessionUser?.role
  const isManager = userRole === 'ADMIN' || userRole === 'MANAGER'

  const loadData = useCallback(async () => {
    setLoading(true)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    try {
      const params = new URLSearchParams()
      if (householdId) params.set('householdId', householdId)

      const eventsParams = new URLSearchParams()
      if (householdId) eventsParams.set('householdId', householdId)
      if (userId) eventsParams.set('recordedById', userId)

      const [categoriesRes, eventsRes] = await Promise.all([
        fetch(`/api/categories?${params}`, { signal: controller.signal }),
        fetch(`/api/events/today?${eventsParams}`, { signal: controller.signal }).catch(() => ({ json: async () => [] }))
      ])
      clearTimeout(timeout)

      const categoriesData = await categoriesRes.json()
      const eventsData = await eventsRes.json()

      const cats = Array.isArray(categoriesData) ? categoriesData : []
      setCategories(cats)
      if (cats.length > 0) {
        setSelectedCategory(prev => {
          if (prev) {
            const refreshed = cats.find((c: Category) => c.id === prev.id)
            return refreshed || cats[0]
          }
          return cats[0]
        })
      }

      setEvents(Array.isArray(eventsData) ? eventsData : [])
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }, [householdId, userId])

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'authenticated') {
      loadData()
    }
  }, [status, loadData])

  function handleActivityTap(activity: Activity) {
    if (activity.requiresNote || activity.requiresPhoto) {
      setNoteInput('')
      setPhotoInput(null)
      setNoteModal({ activity })
    } else {
      completeActivity(activity)
    }
  }

  async function completeActivity(activity: Activity, note?: string, photo?: string) {
    setCompleting(activity.id)

    try {
      const now = new Date()
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

      const payload: any = {
        eventType: 'ACTIVITY_COMPLETED',
        recordedById: userId,
        activityId: activity.id,
        points: activity.defaultPoints,
        householdId,
        dayStart: dayStart.toISOString(),
        dayEnd: dayEnd.toISOString()
      }

      if (note || photo) {
        const meta: any = {}
        if (note) meta.note = note
        if (photo) meta.photo = photo
        payload.metadata = JSON.stringify(meta)
      }

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const error = await res.json()
        if (res.status === 409) {
          showToastMessage(t(lang, 'alreadyDoneToday'), '✅')
        } else {
          throw new Error(error.error || 'Failed to complete activity')
        }
        setCompleting(null)
        return
      }

      await loadData()
      showToastMessage(`+${activity.defaultPoints} points!`, activity.icon || '⭐')
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setCompleting(null)
    }
  }

  function showToastMessage(msg: string, emoji: string) {
    setToast({ msg, emoji })
    setTimeout(() => setToast(null), 2500)
  }

  async function revertEvent(eventId: string, activityName: string, points: number) {
    if (!confirm(t(lang, 'undoConfirm')(activityName, points))) return

    setReverting(eventId)
    try {
      const res = await fetch(`/api/events?id=${eventId}`, { method: 'DELETE' })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to revert')
      }

      await loadData()
      showToastMessage(t(lang, 'revertedMsg')(points), '↩️')
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setReverting(null)
    }
  }

  function isActivityCompletedToday(activityId: string): boolean {
    return events.some(e => e.activityId === activityId)
  }

  const todayActivities = selectedCategory?.activities?.filter(a => a.isActive) || []
  const completedToday = events.filter(e => e.activityId).length
  const totalPointsToday = events.reduce((sum, e) => sum + (e.points || 0), 0)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #F9FAFB 0%, #F3F4F6 100%)',
      fontFamily: 'system-ui',
      paddingBottom: sessionUser ? '90px' : '0'
    }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #10B981, #059669)',
          color: 'white',
          padding: '14px 28px',
          borderRadius: '16px',
          boxShadow: '0 8px 24px rgba(16,185,129,0.4)',
          fontWeight: '700',
          zIndex: 10000,
          fontSize: '16px',
          whiteSpace: 'nowrap'
        }}>
          {toast.emoji} {toast.msg}
        </div>
      )}

      {/* ─── Header ─── */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 24px) clamp(28px, 7vw, 40px)',
        boxShadow: '0 4px 16px rgba(102,126,234,0.3)'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>

          {/* Unauthenticated header */}
          {status !== 'authenticated' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 'clamp(22px, 5.5vw, 30px)', fontWeight: '800' }}>
                  🏡 FamFlow
                </h1>
                <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: 'clamp(13px, 3vw, 15px)' }}>
                  {t(lang, 'appTagline')}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
                <LanguageToggle />
                <a href="/auth/login" style={{
                  padding: 'clamp(10px, 2.5vw, 12px) clamp(14px, 3.5vw, 18px)',
                  background: 'rgba(255,255,255,0.25)',
                  border: '2px solid rgba(255,255,255,0.5)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: 'clamp(13px, 3.5vw, 15px)',
                  fontWeight: '700',
                  textDecoration: 'none',
                  display: 'inline-block',
                  WebkitTapHighlightColor: 'transparent'
                }}>
                  {t(lang, 'signIn')}
                </a>
                <a href="/auth/register" style={{
                  padding: 'clamp(10px, 2.5vw, 12px) clamp(14px, 3.5vw, 18px)',
                  background: 'white',
                  border: '2px solid white',
                  borderRadius: '12px',
                  color: '#667eea',
                  fontSize: 'clamp(13px, 3.5vw, 15px)',
                  fontWeight: '700',
                  textDecoration: 'none',
                  display: 'inline-block',
                  WebkitTapHighlightColor: 'transparent'
                }}>
                  {t(lang, 'signUp')}
                </a>
              </div>
            </div>
          )}

          {/* Authenticated header */}
          {status === 'authenticated' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 auto', minWidth: '0' }}>
                <h1 style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: '800', wordBreak: 'break-word' }}>
                  {t(lang, 'greeting')(sessionUser?.name || 'there')}
                </h1>
                <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: 'clamp(12px, 3vw, 14px)' }}>
                  {t(lang, 'earnPointsToday')}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '14px',
                  padding: '10px 14px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: '800', lineHeight: 1 }}>{totalPointsToday}</div>
                  <div style={{ fontSize: '10px', opacity: 0.9, fontWeight: '700', marginTop: '2px' }}>{t(lang, 'ptsToday')}</div>
                </div>
                <LanguageToggle />
                <button
                  onClick={() => signOut({ callbackUrl: '/auth/login' })}
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.2)',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    fontWeight: '700',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                >
                  {t(lang, 'signOut')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Unauthenticated: Feature highlights ─── */}
      {status === 'unauthenticated' && (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: 'clamp(20px, 5vw, 32px) clamp(16px, 4vw, 24px)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              { emoji: '⭐', titleKey: 'featureEarnTitle' as const, descKey: 'featureEarnDesc' as const },
              { emoji: '🏆', titleKey: 'featureCompeteTitle' as const, descKey: 'featureCompeteDesc' as const },
              { emoji: '👨‍👩‍👧‍👦', titleKey: 'featureFamilyTitle' as const, descKey: 'featureFamilyDesc' as const },
            ].map(f => (
              <div key={f.titleKey} style={{
                background: 'white',
                borderRadius: '18px',
                padding: '24px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>{f.emoji}</div>
                <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '6px' }}>{t(lang, f.titleKey)}</div>
                <div style={{ color: '#6B7280', fontSize: '13px', lineHeight: '1.5' }}>{t(lang, f.descKey)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/auth/register" style={{
              padding: '16px 32px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '14px',
              fontSize: '17px',
              fontWeight: '800',
              textDecoration: 'none',
              boxShadow: '0 6px 20px rgba(102,126,234,0.4)',
              display: 'inline-block'
            }}>
              {t(lang, 'getStarted')}
            </a>
          </div>
        </div>
      )}

      {/* ─── Session loading spinner ─── */}
      {status === 'loading' && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#666' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <div style={{ fontSize: '16px', fontWeight: '600' }}>{t(lang, 'loading')}</div>
        </div>
      )}

      {/* ─── Authenticated: Stats Bar ─── */}
      {status === 'authenticated' && (
        <div style={{
          maxWidth: '800px',
          margin: 'clamp(-20px, -4vw, -24px) auto clamp(16px, 4vw, 24px)',
          padding: '0 clamp(12px, 3vw, 20px)'
        }}>
          <div style={{
            background: 'white', borderRadius: '18px',
            padding: 'clamp(16px, 4vw, 20px)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'clamp(8px, 2vw, 16px)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(22px, 5.5vw, 28px)', fontWeight: '800', color: '#667eea' }}>{completedToday}</div>
              <div style={{ fontSize: 'clamp(10px, 2.5vw, 12px)', color: '#6B7280', fontWeight: '600', marginTop: '2px' }}>{t(lang, 'doneToday')}</div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid #F3F4F6', borderRight: '1px solid #F3F4F6' }}>
              <div style={{ fontSize: 'clamp(22px, 5.5vw, 28px)', fontWeight: '800', color: '#10B981' }}>{todayActivities.length}</div>
              <div style={{ fontSize: 'clamp(10px, 2.5vw, 12px)', color: '#6B7280', fontWeight: '600', marginTop: '2px' }}>{t(lang, 'available')}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(22px, 5.5vw, 28px)', fontWeight: '800', color: '#F59E0B' }}>{categories.length}</div>
              <div style={{ fontSize: 'clamp(10px, 2.5vw, 12px)', color: '#6B7280', fontWeight: '600', marginTop: '2px' }}>{t(lang, 'categories')}</div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Category Tabs ─── */}
      {status === 'authenticated' && categories.length > 0 && (
        <div style={{
          maxWidth: '800px', margin: '0 auto clamp(16px, 4vw, 20px)',
          padding: '0 clamp(12px, 3vw, 20px)',
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none', msOverflowStyle: 'none'
        }}>
          <div style={{ display: 'flex', gap: 'clamp(8px, 2vw, 12px)', paddingBottom: '8px', minWidth: 'min-content' }}>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: 'clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 20px)',
                  minHeight: '44px',
                  background: selectedCategory?.id === cat.id ? (cat.color || '#667eea') : 'white',
                  color: selectedCategory?.id === cat.id ? 'white' : '#374151',
                  border: selectedCategory?.id === cat.id ? 'none' : '2px solid #E5E7EB',
                  borderRadius: '14px',
                  fontSize: 'clamp(13px, 3.5vw, 15px)', fontWeight: '700',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  boxShadow: selectedCategory?.id === cat.id ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                  transition: 'all 0.2s', flexShrink: 0,
                  WebkitTapHighlightColor: 'transparent'
                }}>
                <IconDisplay icon={cat.icon} fallback="📌" size={20} />
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Activities Grid ─── */}
      {status === 'authenticated' && (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 clamp(12px, 3vw, 20px)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 'clamp(40px, 10vw, 60px) 0', color: '#666' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
              <div style={{ fontSize: 'clamp(14px, 3.5vw, 16px)' }}>{t(lang, 'loadingActivities')}</div>
            </div>
          ) : categories.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '20px', padding: 'clamp(40px, 10vw, 60px) clamp(16px, 4vw, 20px)', textAlign: 'center', border: '2px dashed #E5E7EB' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📋</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 'clamp(16px, 4vw, 20px)', fontWeight: '700' }}>{t(lang, 'noActivitiesYet')}</h3>
              <p style={{ margin: '0 0 20px', color: '#6B7280', fontSize: 'clamp(14px, 3.5vw, 16px)', lineHeight: '1.5' }}>
                {isManager ? t(lang, 'noActivitiesManager') : t(lang, 'noActivitiesMember')}
              </p>
              {isManager && (
                <button onClick={() => router.push('/admin')}
                  style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>
                  {t(lang, 'manageActivities')}
                </button>
              )}
            </div>
          ) : todayActivities.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '20px', padding: 'clamp(40px, 10vw, 60px) clamp(16px, 4vw, 20px)', textAlign: 'center', border: '2px dashed #E5E7EB' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 'clamp(16px, 4vw, 20px)', fontWeight: '700' }}>{t(lang, 'allDoneHere')}</h3>
              <p style={{ margin: 0, color: '#6B7280' }}>{t(lang, 'noActiveActivities')}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))', gap: 'clamp(12px, 3vw, 16px)' }}>
              {todayActivities.map(activity => {
                const isCompleted = isActivityCompletedToday(activity.id)
                const isProcessing = completing === activity.id
                const completionEvent = events.find(e => e.activityId === activity.id)
                const isRevertingThis = completionEvent ? reverting === completionEvent.id : false

                const parsedMeta = completionEvent?.metadata ? (() => { try { return JSON.parse(completionEvent.metadata!) } catch { return null } })() : null
                const hasViewableContent = isCompleted && completionEvent && (parsedMeta?.note || parsedMeta?.photo)

                return (
                  <div key={activity.id}
                    style={{
                      background: isCompleted ? 'linear-gradient(135deg, #ECFDF5, #D1FAE5)' : 'white',
                      border: isCompleted ? '2px solid #10B981' : '2px solid #E5E7EB',
                      borderRadius: '18px',
                      padding: 'clamp(16px, 4vw, 24px)',
                      cursor: (isCompleted && !hasViewableContent) ? 'default' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: isProcessing || isRevertingThis ? 0.6 : 1,
                      position: 'relative', overflow: 'hidden',
                      minHeight: '44px',
                      WebkitTapHighlightColor: 'transparent',
                      boxShadow: isCompleted ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'
                    }}
                    onClick={() => {
                      if (isProcessing) return
                      if (hasViewableContent) {
                        setViewModal({ activity, note: parsedMeta?.note, photo: parsedMeta?.photo })
                      } else if (!isCompleted) {
                        handleActivityTap(activity)
                      }
                    }}
                    onMouseEnter={e => {
                      if (isProcessing) return
                      if (!isCompleted || hasViewableContent) {
                        e.currentTarget.style.transform = 'translateY(-4px)'
                        e.currentTarget.style.boxShadow = hasViewableContent
                          ? '0 8px 20px rgba(16,185,129,0.25)'
                          : '0 8px 20px rgba(102,126,234,0.2)'
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = isCompleted ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'
                    }}
                  >
                    {isCompleted && completionEvent && (
                      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <div style={{ background: '#10B981', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>
                          {t(lang, 'doneBadge')}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            revertEvent(completionEvent.id, activity.name, completionEvent.points)
                          }}
                          disabled={isRevertingThis}
                          style={{
                            background: '#FEF3C7', color: '#92400E', padding: '4px 10px',
                            borderRadius: '20px', fontSize: '11px', fontWeight: '800',
                            border: '1px solid #FCD34D', cursor: 'pointer',
                            opacity: isRevertingThis ? 0.5 : 1,
                            WebkitTapHighlightColor: 'transparent'
                          }}
                        >
                          {isRevertingThis ? '⏳' : t(lang, 'undoBtn')}
                        </button>
                      </div>
                    )}
                    {isCompleted && !completionEvent && (
                      <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#10B981', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>
                        {t(lang, 'doneBadge')}
                      </div>
                    )}
                    {isProcessing && (
                      <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#667eea', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>
                        ⏳
                      </div>
                    )}

                    <IconDisplay icon={activity.icon} fallback="✓" size={44} style={{ marginBottom: '10px' }} />
                    <h3 style={{ margin: '0 0 6px', fontSize: 'clamp(15px, 4vw, 17px)', fontWeight: '700', color: isCompleted ? '#065F46' : '#1F2937' }}>
                      {activity.name}
                    </h3>
                    {activity.description && (
                      <p style={{ margin: '0 0 12px', fontSize: 'clamp(12px, 3vw, 13px)', color: '#6B7280', lineHeight: '1.4' }}>
                        {activity.description}
                      </p>
                    )}

                    {/* Requirement badges */}
                    {(!isCompleted && (activity.requiresNote || activity.requiresPhoto)) && (
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        {activity.requiresNote && (
                          <span title={t(lang, 'requiresNoteIndicator') as string} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '3px',
                            background: '#EFF6FF', color: '#1D4ED8',
                            padding: '2px 8px', borderRadius: '12px',
                            fontSize: '11px', fontWeight: '700'
                          }}>
                            📝 {t(lang, 'requiresNoteIndicator')}
                          </span>
                        )}
                        {activity.requiresPhoto && (
                          <span title={t(lang, 'requiresPhotoIndicator') as string} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '3px',
                            background: '#FFF7ED', color: '#C2410C',
                            padding: '2px 8px', borderRadius: '12px',
                            fontSize: '11px', fontWeight: '700'
                          }}>
                            📷 {t(lang, 'requiresPhotoIndicator')}
                          </span>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #E5E7EB', gap: '8px' }}>
                      <div style={{ fontSize: 'clamp(11px, 2.5vw, 12px)', color: '#9CA3AF', fontWeight: '600' }}>{activity.frequency}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {hasViewableContent && (
                          <span style={{
                            fontSize: '11px', color: '#059669', fontWeight: '700',
                            background: '#D1FAE5', padding: '2px 8px', borderRadius: '12px'
                          }}>
                            {parsedMeta?.photo ? '📷' : ''}{parsedMeta?.note ? ' 📝' : ''} {t(lang, 'viewDetails')}
                          </span>
                        )}
                        <div style={{ fontSize: 'clamp(18px, 4.5vw, 20px)', fontWeight: '800', color: isCompleted ? '#10B981' : '#667eea' }}>
                          +{activity.defaultPoints} ⭐
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Today's Wins Timeline */}
          {events.length > 0 && (
            <div style={{ marginTop: 'clamp(24px, 6vw, 36px)', background: 'white', borderRadius: '18px', padding: 'clamp(16px, 4vw, 24px)', border: '2px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h3 style={{ margin: '0 0 clamp(12px, 3vw, 16px)', fontSize: 'clamp(16px, 4vw, 18px)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {t(lang, 'todaysWins')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 2vw, 10px)' }}>
                {events.slice(0, 10).map(event => (
                  <div key={event.id} style={{ display: 'flex', gap: 'clamp(8px, 2vw, 12px)', padding: 'clamp(10px, 2.5vw, 12px)', background: '#F9FAFB', borderRadius: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <IconDisplay icon={event.activity?.icon} fallback="⭐" size={18} />
                    <div style={{ flex: 1, minWidth: '120px' }}>
                      <div style={{ fontWeight: '700', fontSize: 'clamp(13px, 3.5vw, 14px)' }}>{event.activity?.name || t(lang, 'activityCompleted')}</div>
                      <div style={{ fontSize: 'clamp(10px, 2.5vw, 11px)', color: '#9CA3AF' }}>
                        {new Date(event.occurredAt).toLocaleTimeString(lang === 'he' ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ fontWeight: '800', color: '#10B981', fontSize: 'clamp(14px, 3.5vw, 16px)', flexShrink: 0 }}>
                      +{event.points} ⭐
                    </div>
                    <button
                      onClick={() => revertEvent(event.id, event.activity?.name || t(lang, 'activityCompleted'), event.points)}
                      disabled={reverting === event.id}
                      style={{
                        padding: '6px 12px',
                        minHeight: '32px',
                        background: reverting === event.id ? '#E5E7EB' : '#FEF3C7',
                        border: '1px solid #FCD34D',
                        borderRadius: '8px',
                        fontSize: 'clamp(11px, 2.5vw, 12px)',
                        fontWeight: '700',
                        cursor: reverting === event.id ? 'not-allowed' : 'pointer',
                        color: '#92400E',
                        flexShrink: 0,
                        opacity: reverting === event.id ? 0.5 : 1,
                        WebkitTapHighlightColor: 'transparent'
                      }}
                    >
                      {reverting === event.id ? '⏳' : t(lang, 'undoBtn')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Bottom Navigation (only when signed in) ─── */}
      {status === 'authenticated' && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'white', borderTop: '1px solid #E5E7EB',
          padding: 'clamp(8px, 2vw, 10px) 0',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.08)', zIndex: 100
        }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
            {[
              { path: '/', icon: '🏠', labelKey: 'navHome' as const },
              { path: '/leaderboard', icon: '🏆', labelKey: 'navRankings' as const },
              { path: '/users', icon: '👥', labelKey: 'navFamily' as const },
              ...(isManager ? [{ path: '/admin', icon: '⚙️', labelKey: 'navManage' as const }] : [])
            ].map(item => (
              <button key={item.path} onClick={() => router.push(item.path)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                  padding: '6px clamp(8px, 2vw, 16px)', minHeight: '48px', minWidth: '52px',
                  color: '#9CA3AF', fontWeight: '600',
                  fontSize: 'clamp(10px, 2.5vw, 12px)',
                  WebkitTapHighlightColor: 'transparent'
                }}>
                <span style={{ fontSize: 'clamp(20px, 5vw, 24px)' }}>{item.icon}</span>
                {t(lang, item.labelKey)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── View Details Modal ─── */}
      {viewModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: '20px'
        }} onClick={() => setViewModal(null)}>
          <div style={{
            background: 'white', borderRadius: '16px',
            padding: '24px', width: '100%', maxWidth: '420px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '28px' }}>{viewModal.activity.icon || '✓'}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#065F46' }}>{viewModal.activity.name}</h3>
                  <div style={{ fontSize: '12px', color: '#10B981', fontWeight: '700', marginTop: '2px' }}>
                    ✅ {t(lang, 'completionDetails')}
                  </div>
                </div>
              </div>
              <button onClick={() => setViewModal(null)} style={{
                background: '#F3F4F6', border: 'none', borderRadius: '50%',
                width: '32px', height: '32px', cursor: 'pointer',
                fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#6B7280', flexShrink: 0
              }}>✕</button>
            </div>

            {viewModal.photo && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
                  📷 {t(lang, 'photoLabel2')}
                </div>
                <img src={viewModal.photo} alt="completion photo" style={{
                  width: '100%', borderRadius: '12px', border: '2px solid #D1FAE5',
                  maxHeight: '300px', objectFit: 'cover', display: 'block'
                }} />
              </div>
            )}

            {viewModal.note && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
                  📝 {t(lang, 'noteLabel')}
                </div>
                <div style={{
                  background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '10px',
                  padding: '12px', fontSize: '14px', color: '#374151', lineHeight: '1.6',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                }}>
                  {viewModal.note}
                </div>
              </div>
            )}

            <button onClick={() => setViewModal(null)} style={{
              width: '100%', padding: '12px',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              border: 'none', borderRadius: '12px', fontSize: '15px',
              fontWeight: '700', cursor: 'pointer', color: 'white'
            }}>
              {t(lang, 'close')}
            </button>
          </div>
        </div>
      )}

      {/* ─── Note / Photo Modal ─── */}
      {noteModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: '20px'
        }}>
          <div style={{
            background: 'white', borderRadius: '16px',
            padding: '24px', width: '100%', maxWidth: '400px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px', textAlign: 'center' }}>
              {noteModal.activity.icon || '📝'}
            </div>
            <h3 style={{ margin: '0 0 4px', textAlign: 'center', fontSize: '18px', fontWeight: '700' }}>
              {noteModal.activity.name}
            </h3>
            <p style={{ margin: '0 0 16px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
              {noteModal.activity.requiresNote && noteModal.activity.requiresPhoto
                ? t(lang, 'noteAndPhotoRequired')
                : noteModal.activity.requiresNote
                  ? t(lang, 'noteRequired')
                  : t(lang, 'photoRequired')}
            </p>

            {/* Note textarea */}
            {noteModal.activity.requiresNote && (
              <textarea
                autoFocus={!noteModal.activity.requiresPhoto}
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                placeholder={t(lang, 'addDetails') as string}
                style={{
                  width: '100%', padding: '12px',
                  border: '2px solid #E5E7EB', borderRadius: '12px',
                  fontSize: '16px', fontFamily: 'system-ui',
                  minHeight: '90px', resize: 'vertical',
                  boxSizing: 'border-box', marginBottom: '16px'
                }}
              />
            )}

            {/* Photo input */}
            {noteModal.activity.requiresPhoto && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block', marginBottom: '8px',
                  fontSize: '14px', fontWeight: '700', color: '#374151'
                }}>
                  {t(lang, 'photoLabel')}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  id="photo-capture-input"
                  onChange={async e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const compressed = await compressImage(file)
                    setPhotoInput(compressed)
                  }}
                />
                {photoInput ? (
                  <div style={{ position: 'relative' }}>
                    <img src={photoInput} alt="preview" style={{
                      width: '100%', borderRadius: '12px', border: '2px solid #E5E7EB',
                      maxHeight: '200px', objectFit: 'cover'
                    }} />
                    <button
                      type="button"
                      onClick={() => setPhotoInput(null)}
                      style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: 'rgba(0,0,0,0.6)', color: 'white',
                        border: 'none', borderRadius: '50%',
                        width: '28px', height: '28px', cursor: 'pointer',
                        fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >✕</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => document.getElementById('photo-capture-input')?.click()}
                    style={{
                      width: '100%', padding: '16px',
                      border: '2px dashed #D1D5DB', borderRadius: '12px',
                      background: '#F9FAFB', cursor: 'pointer',
                      fontSize: '15px', color: '#6B7280', fontWeight: '600'
                    }}
                  >
                    📷 {t(lang, 'takePhoto')}
                  </button>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => { setNoteModal(null); setPhotoInput(null) }}
                style={{
                  flex: 1, padding: '12px', background: '#F3F4F6',
                  border: 'none', borderRadius: '12px', fontSize: '15px',
                  fontWeight: '700', cursor: 'pointer', color: '#374151'
                }}
              >
                {t(lang, 'cancel')}
              </button>
              <button
                disabled={
                  (noteModal.activity.requiresNote && !noteInput.trim()) ||
                  (noteModal.activity.requiresPhoto && !photoInput)
                }
                onClick={() => {
                  const activity = noteModal.activity
                  const note = noteInput.trim() || undefined
                  const photo = photoInput || undefined
                  setNoteModal(null)
                  setPhotoInput(null)
                  completeActivity(activity, note, photo)
                }}
                style={{
                  flex: 1, padding: '12px',
                  background: (
                    (noteModal.activity.requiresNote && !noteInput.trim()) ||
                    (noteModal.activity.requiresPhoto && !photoInput)
                  ) ? '#D1D5DB' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none', borderRadius: '12px', fontSize: '15px',
                  fontWeight: '700',
                  cursor: (
                    (noteModal.activity.requiresNote && !noteInput.trim()) ||
                    (noteModal.activity.requiresPhoto && !photoInput)
                  ) ? 'not-allowed' : 'pointer',
                  color: 'white'
                }}
              >
                {t(lang, 'completeActivity')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
