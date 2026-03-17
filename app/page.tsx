"use client"
import React, { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import IconDisplay from '@/components/IconDisplay'

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
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(false)
  const [completing, setCompleting] = useState<string | null>(null)
  const [reverting, setReverting] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; emoji: string } | null>(null)

  const sessionUser = session?.user as any
  const householdId = sessionUser?.householdId
  const userId = sessionUser?.id
  const userRole = sessionUser?.role
  const isManager = userRole === 'ADMIN' || userRole === 'MANAGER'

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'authenticated') {
      loadData()
    }
    // unauthenticated: nothing to load, loading stays false
  }, [status, householdId, userId])

  async function loadData() {
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
  }

  async function completeActivity(activity: Activity) {
    setCompleting(activity.id)

    try {
      // Send client's local day boundaries for proper timezone-aware dedup
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

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const error = await res.json()
        if (res.status === 409) {
          showToastMessage('Already done today!', '✅')
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
    if (!confirm(`Undo "${activityName}"?\n\nThis will remove ${points} points and mark it as not done.`)) return

    setReverting(eventId)
    try {
      const res = await fetch(`/api/events?id=${eventId}`, { method: 'DELETE' })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to revert')
      }

      await loadData()
      showToastMessage(`Reverted! -${points} points`, '↩️')
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
                  The fun way to manage family chores!
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
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
                  Sign In
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
                  Sign Up 🌟
                </a>
              </div>
            </div>
          )}

          {/* Authenticated header */}
          {status === 'authenticated' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 auto', minWidth: '0' }}>
                <h1 style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: '800', wordBreak: 'break-word' }}>
                  👋 Hey, {sessionUser?.name || 'there'}!
                </h1>
                <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: 'clamp(12px, 3vw, 14px)' }}>
                  Let's earn some points today! 🌟
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
                  <div style={{ fontSize: '10px', opacity: 0.9, fontWeight: '700', marginTop: '2px' }}>PTS TODAY ⭐</div>
                </div>
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
                  Sign Out
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
              { emoji: '⭐', title: 'Earn Points', desc: 'Complete family activities and rack up points daily' },
              { emoji: '🏆', title: 'Compete & Win', desc: 'See who\'s the family champion on the live leaderboard' },
              { emoji: '👨‍👩‍👧‍👦', title: 'Family Together', desc: 'Manage chores, cooking, pets and more as a team' },
            ].map(f => (
              <div key={f.title} style={{
                background: 'white',
                borderRadius: '18px',
                padding: '24px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>{f.emoji}</div>
                <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '6px' }}>{f.title}</div>
                <div style={{ color: '#6B7280', fontSize: '13px', lineHeight: '1.5' }}>{f.desc}</div>
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
              🌟 Get Started — It's Free!
            </a>
          </div>
        </div>
      )}

      {/* ─── Session loading spinner ─── */}
      {status === 'loading' && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#666' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <div style={{ fontSize: '16px', fontWeight: '600' }}>Loading...</div>
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
              <div style={{ fontSize: 'clamp(10px, 2.5vw, 12px)', color: '#6B7280', fontWeight: '600', marginTop: '2px' }}>DONE TODAY</div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid #F3F4F6', borderRight: '1px solid #F3F4F6' }}>
              <div style={{ fontSize: 'clamp(22px, 5.5vw, 28px)', fontWeight: '800', color: '#10B981' }}>{todayActivities.length}</div>
              <div style={{ fontSize: 'clamp(10px, 2.5vw, 12px)', color: '#6B7280', fontWeight: '600', marginTop: '2px' }}>AVAILABLE</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(22px, 5.5vw, 28px)', fontWeight: '800', color: '#F59E0B' }}>{categories.length}</div>
              <div style={{ fontSize: 'clamp(10px, 2.5vw, 12px)', color: '#6B7280', fontWeight: '600', marginTop: '2px' }}>CATEGORIES</div>
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
              <div style={{ fontSize: 'clamp(14px, 3.5vw, 16px)' }}>Loading activities...</div>
            </div>
          ) : categories.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '20px', padding: 'clamp(40px, 10vw, 60px) clamp(16px, 4vw, 20px)', textAlign: 'center', border: '2px dashed #E5E7EB' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📋</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 'clamp(16px, 4vw, 20px)', fontWeight: '700' }}>No activities yet!</h3>
              <p style={{ margin: '0 0 20px', color: '#6B7280', fontSize: 'clamp(14px, 3.5vw, 16px)', lineHeight: '1.5' }}>
                {isManager
                  ? 'Go to Manage to add categories and activities for your family.'
                  : 'Ask your family manager to add some activities!'}
              </p>
              {isManager && (
                <button onClick={() => router.push('/admin')}
                  style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>
                  ⚙️ Manage Activities
                </button>
              )}
            </div>
          ) : todayActivities.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '20px', padding: 'clamp(40px, 10vw, 60px) clamp(16px, 4vw, 20px)', textAlign: 'center', border: '2px dashed #E5E7EB' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 'clamp(16px, 4vw, 20px)', fontWeight: '700' }}>All done here!</h3>
              <p style={{ margin: 0, color: '#6B7280' }}>No active activities in this category. Try another tab!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))', gap: 'clamp(12px, 3vw, 16px)' }}>
              {todayActivities.map(activity => {
                const isCompleted = isActivityCompletedToday(activity.id)
                const isProcessing = completing === activity.id
                const completionEvent = events.find(e => e.activityId === activity.id)
                const isRevertingThis = completionEvent ? reverting === completionEvent.id : false

                return (
                  <div key={activity.id}
                    style={{
                      background: isCompleted ? 'linear-gradient(135deg, #ECFDF5, #D1FAE5)' : 'white',
                      border: isCompleted ? '2px solid #10B981' : '2px solid #E5E7EB',
                      borderRadius: '18px',
                      padding: 'clamp(16px, 4vw, 24px)',
                      cursor: isCompleted ? 'default' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: isProcessing || isRevertingThis ? 0.6 : 1,
                      position: 'relative', overflow: 'hidden',
                      minHeight: '44px',
                      WebkitTapHighlightColor: 'transparent',
                      boxShadow: isCompleted ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'
                    }}
                    onClick={() => !isCompleted && !isProcessing && completeActivity(activity)}
                    onMouseEnter={e => {
                      if (!isCompleted && !isProcessing) {
                        e.currentTarget.style.transform = 'translateY(-4px)'
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(102,126,234,0.2)'
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
                          ✓ DONE
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
                          title="Undo this completion"
                        >
                          {isRevertingThis ? '⏳' : '↩️ Undo'}
                        </button>
                      </div>
                    )}
                    {isCompleted && !completionEvent && (
                      <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#10B981', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>
                        ✓ DONE
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

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #E5E7EB', gap: '8px' }}>
                      <div style={{ fontSize: 'clamp(11px, 2.5vw, 12px)', color: '#9CA3AF', fontWeight: '600' }}>{activity.frequency}</div>
                      <div style={{ fontSize: 'clamp(18px, 4.5vw, 20px)', fontWeight: '800', color: isCompleted ? '#10B981' : '#667eea' }}>
                        +{activity.defaultPoints} ⭐
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
                📅 Today's Wins
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 2vw, 10px)' }}>
                {events.slice(0, 10).map(event => (
                  <div key={event.id} style={{ display: 'flex', gap: 'clamp(8px, 2vw, 12px)', padding: 'clamp(10px, 2.5vw, 12px)', background: '#F9FAFB', borderRadius: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <IconDisplay icon={event.activity?.icon} fallback="⭐" size={18} />
                    <div style={{ flex: 1, minWidth: '120px' }}>
                      <div style={{ fontWeight: '700', fontSize: 'clamp(13px, 3.5vw, 14px)' }}>{event.activity?.name || 'Activity completed'}</div>
                      <div style={{ fontSize: 'clamp(10px, 2.5vw, 11px)', color: '#9CA3AF' }}>
                        {new Date(event.occurredAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ fontWeight: '800', color: '#10B981', fontSize: 'clamp(14px, 3.5vw, 16px)', flexShrink: 0 }}>
                      +{event.points} ⭐
                    </div>
                    <button
                      onClick={() => revertEvent(event.id, event.activity?.name || 'Activity', event.points)}
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
                      title="Undo this action"
                    >
                      {reverting === event.id ? '⏳' : '↩️ Undo'}
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
              { path: '/', icon: '🏠', label: 'Home' },
              { path: '/leaderboard', icon: '🏆', label: 'Rankings' },
              { path: '/users', icon: '👥', label: 'Family' },
              ...(isManager ? [{ path: '/admin', icon: '⚙️', label: 'Manage' }] : [])
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
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
