'use client'
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/language-context'
import { t } from '@/lib/i18n'
import IconDisplay, { isImageIcon } from '@/components/IconDisplay'

type EventItem = {
  id: string
  eventType: string
  occurredAt: string
  points: number
  metadata: string | null
  recordedBy: { id: string; name: string | null; email: string }
  activity: {
    id: string; name: string; icon: string | null; defaultPoints: number; categoryId: string
    category: { id: string; name: string; icon: string | null; color: string | null }
  } | null
}

type TopActivity = {
  activityId: string | null
  count: number
  totalPoints: number
  activity: { id: string; name: string; icon: string | null; categoryId: string; category: { name: string; icon: string | null; color: string | null } } | null
}

type PerUser = {
  userId: string; count: number; totalPoints: number
  user: { id: string; name: string | null; email: string } | null
}

type Member = { id: string; name: string | null; email: string }
type CategoryOption = { id: string; name: string; icon: string | null; color: string | null }
type ActivityOption = { id: string; name: string; icon: string | null; categoryId: string }

type ViewTab = 'timeline' | 'stats' | 'activities'

const RANGE_PRESETS = [
  { key: 'today', labelEn: 'Today', labelHe: 'היום', icon: '📅' },
  { key: 'week', labelEn: 'This Week', labelHe: 'השבוע', icon: '📊' },
  { key: 'month', labelEn: 'This Month', labelHe: 'החודש', icon: '📆' },
  { key: 'all', labelEn: 'All Time', labelHe: 'כל הזמנים', icon: '🏆' },
] as const

function getDateRange(preset: string): { startDate: string; endDate: string } {
  const now = new Date()
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString()

  switch (preset) {
    case 'today': {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      return { startDate: s.toISOString(), endDate }
    }
    case 'week': {
      const day = now.getDay()
      const diff = day === 0 ? 6 : day - 1 // Monday = start
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff, 0, 0, 0, 0)
      return { startDate: s.toISOString(), endDate }
    }
    case 'month': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      return { startDate: s.toISOString(), endDate }
    }
    default:
      return { startDate: '', endDate: '' }
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function formatFullDate(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function groupByDay(events: EventItem[], lang: string): { date: string; label: string; events: EventItem[] }[] {
  const groups: Record<string, EventItem[]> = {}
  for (const ev of events) {
    const d = new Date(ev.occurredAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!groups[key]) groups[key] = []
    groups[key].push(ev)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, events]) => ({
      date,
      label: formatFullDate(events[0].occurredAt, lang),
      events,
    }))
}

export default function HistoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { lang } = useLang()
  const isHe = lang === 'he'

  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<EventItem[]>([])
  const [total, setTotal] = useState(0)
  const [topActivities, setTopActivities] = useState<TopActivity[]>([])
  const [perUser, setPerUser] = useState<PerUser[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [activities, setActivities] = useState<ActivityOption[]>([])

  const [range, setRange] = useState<string>('month')
  const [filterUser, setFilterUser] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterActivity, setFilterActivity] = useState('')
  const [viewTab, setViewTab] = useState<ViewTab>('timeline')
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [detailModal, setDetailModal] = useState<EventItem | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const sessionUser = session?.user as any

  const fetchHistory = useCallback(async () => {
    if (!sessionUser?.householdId) return
    setLoading(true)
    setFetchError(null)
    try {
      const { startDate, endDate } = getDateRange(range)
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (filterUser) params.set('userId', filterUser)
      if (filterActivity) params.set('activityId', filterActivity)
      else if (filterCategory) params.set('categoryId', filterCategory)
      params.set('limit', '500')

      const res = await fetch(`/api/events/history?${params}`)
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        const msg = `HTTP ${res.status}: ${errBody?.detail || errBody?.error || res.statusText}`
        console.error('[History] API error:', msg, errBody)
        setFetchError(msg)
        return
      }
      const data = await res.json()
      if (!data.events) {
        const msg = 'Response missing events field: ' + JSON.stringify(Object.keys(data))
        console.error('[History]', msg)
        setFetchError(msg)
        return
      }
      console.log('[History] API response keys:', Object.keys(data))
      console.log('[History] categories from API:', data.categories?.length, data.categories)
      console.log('[History] activities from API:', data.activities?.length)
      console.log('[History] members from API:', data.members?.length)
      setEvents(data.events)
      setTotal(data.total)
      setTopActivities(data.topActivities)
      setPerUser(data.perUser)
      setMembers(data.members)
      setCategories(data.categories ?? [])
      setActivities(data.activities ?? [])
    } catch (err: any) {
      const msg = err?.message ?? String(err)
      console.error('[History] fetchHistory exception:', msg)
      setFetchError(msg)
    } finally {
      setLoading(false)
    }
  }, [sessionUser?.householdId, range, filterUser, filterCategory, filterActivity])

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.push('/auth/login'); return }
    fetchHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, fetchHistory])

  const filteredActivities = useMemo(
    () => filterCategory ? activities.filter(a => a.categoryId === filterCategory) : activities,
    [activities, filterCategory]
  )
  const grouped = useMemo(() => groupByDay(events, lang), [events, lang])
  const totalPoints = useMemo(() => events.reduce((s, e) => s + e.points, 0), [events])

  if (status === 'loading' || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #F9FAFB 0%, #F3F4F6 100%)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📜</div>
          <div style={{ color: '#6B7280', fontWeight: '600' }}>{isHe ? '...טוען היסטוריה' : 'Loading history...'}</div>
        </div>
      </div>
    )
  }

  return (
    <div dir={isHe ? 'rtl' : 'ltr'} style={{
      minHeight: '100vh', background: 'linear-gradient(180deg, #F9FAFB 0%, #F3F4F6 100%)',
      fontFamily: 'system-ui', paddingBottom: '100px',
    }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: 'clamp(16px, 4vw, 24px)' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: 'clamp(24px, 6vw, 32px)', fontWeight: '900', color: '#1F2937', margin: '0 0 4px' }}>
            📜 {isHe ? 'היסטוריית פעילויות' : 'Activity History'}
          </h1>
          <p style={{ color: '#6B7280', fontSize: 'clamp(13px, 3vw, 15px)', margin: 0 }}>
            {isHe ? 'מה קרה, מתי ועל ידי מי' : 'What happened, when, and by whom'}
          </p>
        </div>

        {/* ── Range Tabs ── */}
        <div style={{
          display: 'flex', gap: '6px', marginBottom: '16px',
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          padding: '2px',
        }}>
          {RANGE_PRESETS.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)}
              style={{
                flex: '1 0 auto', padding: '10px 14px',
                background: range === r.key
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'white',
                color: range === r.key ? 'white' : '#374151',
                border: range === r.key ? 'none' : '2px solid #E5E7EB',
                borderRadius: '12px', fontSize: 'clamp(12px, 3vw, 14px)',
                fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap',
                boxShadow: range === r.key ? '0 4px 12px rgba(102,126,234,0.3)' : 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {r.icon} {isHe ? r.labelHe : r.labelEn}
            </button>
          ))}
        </div>

        {/* ── Filters ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 100%), 1fr))',
          gap: '8px', marginBottom: '16px',
        }}>
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
            style={selectStyle}>
            <option value="">{isHe ? '👤 כל המשתמשים' : '👤 All users'}</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name || m.email}</option>
            ))}
          </select>
          <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setFilterActivity('') }}
            style={selectStyle}>
            <option value="">{isHe ? '📁 כל הקטגוריות' : '📁 All categories'}</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{isImageIcon(c.icon) ? '📁' : (c.icon || '📁')} {c.name}</option>
            ))}
          </select>
          <select value={filterActivity} onChange={e => setFilterActivity(e.target.value)}
            style={selectStyle}>
            <option value="">{isHe ? '⭐ כל הפעילויות' : '⭐ All activities'}</option>
            {filteredActivities.map(a => (
              <option key={a.id} value={a.id}>{isImageIcon(a.icon) ? '⭐' : (a.icon || '⭐')} {a.name}</option>
            ))}
          </select>
        </div>

        {/* ── Debug Error Banner ── */}
        {fetchError && (
          <div style={{
            background: '#FEE2E2', border: '2px solid #EF4444', borderRadius: '10px',
            padding: '10px 14px', marginBottom: '12px', fontSize: '12px',
            color: '#991B1B', fontWeight: '600', wordBreak: 'break-all',
          }}>
            🐛 שגיאה: {fetchError}
          </div>
        )}

        {/* ── Summary Cards ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px', marginBottom: '20px',
        }}>
          <div style={summaryCardStyle}>
            <div style={{ fontSize: '24px' }}>📋</div>
            <div style={{ fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: '900', color: '#1F2937' }}>{total}</div>
            <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '600' }}>{isHe ? 'פעילויות' : 'Activities'}</div>
          </div>
          <div style={summaryCardStyle}>
            <div style={{ fontSize: '24px' }}>⭐</div>
            <div style={{ fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: '900', color: '#1F2937' }}>{totalPoints}</div>
            <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '600' }}>{isHe ? 'נקודות' : 'Points'}</div>
          </div>
          <div style={summaryCardStyle}>
            <div style={{ fontSize: '24px' }}>👥</div>
            <div style={{ fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: '900', color: '#1F2937' }}>{perUser.length}</div>
            <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '600' }}>{isHe ? 'משתתפים' : 'Participants'}</div>
          </div>
        </div>

        {/* ── View Tabs ── */}
        <div style={{
          display: 'flex', gap: '4px', marginBottom: '16px',
          background: '#F3F4F6', borderRadius: '14px', padding: '4px',
        }}>
          {([
            { key: 'timeline' as ViewTab, icon: '📅', labelEn: 'Timeline', labelHe: 'ציר זמן' },
            { key: 'stats' as ViewTab, icon: '📊', labelEn: 'Users', labelHe: 'משתמשים' },
            { key: 'activities' as ViewTab, icon: '🏅', labelEn: 'Top Activities', labelHe: 'פעילויות מובילות' },
          ]).map(tab => (
            <button key={tab.key} onClick={() => setViewTab(tab.key)}
              style={{
                flex: 1, padding: '10px 8px',
                background: viewTab === tab.key ? 'white' : 'transparent',
                color: viewTab === tab.key ? '#1F2937' : '#9CA3AF',
                border: 'none', borderRadius: '10px',
                fontSize: 'clamp(11px, 3vw, 13px)', fontWeight: '700',
                cursor: 'pointer',
                boxShadow: viewTab === tab.key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {tab.icon} {isHe ? tab.labelHe : tab.labelEn}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {events.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '48px 20px',
            background: 'white', borderRadius: '16px',
            border: '2px solid #E5E7EB',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
              {isHe ? 'אין פעילויות בטווח זה' : 'No activities in this range'}
            </div>
            <div style={{ fontSize: '13px', color: '#9CA3AF' }}>
              {isHe ? 'נסו לשנות את הפילטרים או טווח הזמן' : 'Try changing filters or time range'}
            </div>
          </div>
        ) : (
          <>
            {/* ── Timeline Tab ── */}
            {viewTab === 'timeline' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {grouped.map(group => {
                  const isExpanded = expandedDay === group.date || grouped.length <= 3
                  const dayPoints = group.events.reduce((s, e) => s + e.points, 0)
                  return (
                    <div key={group.date} style={{
                      background: 'white', borderRadius: '16px',
                      border: '2px solid #E5E7EB', overflow: 'hidden',
                    }}>
                      {/* Day header */}
                      <button onClick={() => setExpandedDay(isExpanded && grouped.length > 3 ? null : group.date)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center',
                          justifyContent: 'space-between', gap: '10px',
                          padding: 'clamp(12px, 3vw, 16px)', background: 'none',
                          border: 'none', cursor: 'pointer', textAlign: isHe ? 'right' : 'left',
                          WebkitTapHighlightColor: 'transparent',
                        }}>
                        <div>
                          <div style={{ fontSize: 'clamp(14px, 3.5vw, 16px)', fontWeight: '800', color: '#1F2937' }}>
                            📅 {group.label}
                          </div>
                          <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                            {group.events.length} {isHe ? 'פעילויות' : 'activities'} · {dayPoints} {isHe ? 'נק׳' : 'pts'}
                          </div>
                        </div>
                        <span style={{ fontSize: '18px', color: '#9CA3AF', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          ▼
                        </span>
                      </button>

                      {/* Events list */}
                      {isExpanded && (
                        <div style={{ borderTop: '1px solid #F3F4F6' }}>
                          {group.events.map((ev, i) => (
                            <div key={ev.id}
                              onClick={() => setDetailModal(ev)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '12px clamp(12px, 3vw, 16px)',
                                borderBottom: i < group.events.length - 1 ? '1px solid #F9FAFB' : 'none',
                                cursor: 'pointer',
                                transition: 'background 0.15s',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              {/* Icon */}
                              <div style={{
                                width: '40px', height: '40px', borderRadius: '12px',
                                background: ev.activity?.category?.color
                                  ? `${ev.activity.category.color}20`
                                  : '#EDE9FE',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '20px', flexShrink: 0,
                              }}>
                                {ev.activity?.icon ? (
                                  <IconDisplay icon={ev.activity.icon} size={22} />
                                ) : '✅'}
                              </div>

                              {/* Details */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  fontSize: 'clamp(13px, 3.5vw, 15px)', fontWeight: '700',
                                  color: '#1F2937', whiteSpace: 'nowrap',
                                  overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                  {ev.activity?.name || ev.eventType}
                                </div>
                                <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '1px' }}>
                                  {ev.recordedBy.name || ev.recordedBy.email} · {formatTime(ev.occurredAt)}
                                  {ev.activity?.category && (
                                    <> · <IconDisplay icon={ev.activity.category.icon || '📁'} size={13} style={{ verticalAlign: 'middle' }} /> {ev.activity.category.name}</>
                                  )}
                                </div>
                              </div>

                              {/* Points */}
                              <div style={{
                                fontSize: 'clamp(13px, 3vw, 15px)', fontWeight: '800',
                                color: '#667eea', flexShrink: 0,
                              }}>
                                +{ev.points}
                              </div>

                              {/* Metadata indicator */}
                              {ev.metadata && (() => {
                                try {
                                  const m = JSON.parse(ev.metadata)
                                  return (m.note || m.photo) ? (
                                    <span style={{ fontSize: '14px', flexShrink: 0 }}>
                                      {m.photo ? '📷' : '📝'}
                                    </span>
                                  ) : null
                                } catch { return null }
                              })()}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Users Stats Tab ── */}
            {viewTab === 'stats' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {perUser.map((pu, i) => (
                  <div key={pu.userId}
                    onClick={() => { setFilterUser(pu.userId); setViewTab('timeline') }}
                    style={{
                      background: 'white', borderRadius: '16px',
                      border: '2px solid #E5E7EB', padding: 'clamp(14px, 3vw, 18px)',
                      display: 'flex', alignItems: 'center', gap: '14px',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    {/* Rank */}
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: i === 0 ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                        : i === 1 ? 'linear-gradient(135deg, #9CA3AF, #6B7280)'
                        : i === 2 ? 'linear-gradient(135deg, #D97706, #92400E)'
                        : '#F3F4F6',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: '900', color: i < 3 ? 'white' : '#6B7280',
                      flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 'clamp(14px, 3.5vw, 16px)', fontWeight: '800', color: '#1F2937' }}>
                        {pu.user?.name || pu.user?.email || '?'}
                        {sessionUser?.id === pu.userId && (
                          <span style={{
                            marginInlineStart: '8px', fontSize: '10px',
                            background: '#EDE9FE', color: '#7C3AED', padding: '2px 8px',
                            borderRadius: '6px', fontWeight: '700',
                          }}>
                            {t(lang, 'youBadge')}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                        {pu.count} {isHe ? 'פעילויות' : 'activities'}
                      </div>
                    </div>

                    <div style={{ textAlign: isHe ? 'left' : 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 'clamp(16px, 4vw, 20px)', fontWeight: '900', color: '#667eea' }}>
                        {pu.totalPoints}
                      </div>
                      <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '600' }}>
                        {isHe ? 'נק׳' : 'pts'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Top Activities Tab ── */}
            {viewTab === 'activities' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {topActivities.map((ta, i) => (
                  <div key={ta.activityId || i}
                    onClick={() => { if (ta.activityId) { setFilterActivity(ta.activityId); setViewTab('timeline') } }}
                    style={{
                      background: 'white', borderRadius: '16px',
                      border: '2px solid #E5E7EB', padding: 'clamp(14px, 3vw, 18px)',
                      display: 'flex', alignItems: 'center', gap: '14px',
                      cursor: ta.activityId ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { if (ta.activityId) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)' } }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '14px',
                      background: ta.activity?.category?.color
                        ? `${ta.activity.category.color}20`
                        : '#EDE9FE',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '22px', flexShrink: 0,
                    }}>
                      {ta.activity?.icon ? (
                        <IconDisplay icon={ta.activity.icon} size={24} />
                      ) : '⭐'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 'clamp(14px, 3.5vw, 16px)', fontWeight: '800', color: '#1F2937' }}>
                        {ta.activity?.name || '?'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {ta.activity?.category?.icon && <IconDisplay icon={ta.activity.category.icon} size={13} />} {ta.activity?.category?.name}
                      </div>
                    </div>

                    {/* Count badge */}
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <div style={{
                        fontSize: 'clamp(18px, 4.5vw, 24px)', fontWeight: '900',
                        color: '#1F2937', lineHeight: 1,
                      }}>
                        {ta.count}
                      </div>
                      <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '600' }}>
                        {isHe ? 'פעמים' : 'times'}
                      </div>
                    </div>

                    {/* Points */}
                    <div style={{
                      background: '#EDE9FE', color: '#7C3AED',
                      padding: '4px 10px', borderRadius: '8px',
                      fontSize: '12px', fontWeight: '800', flexShrink: 0,
                    }}>
                      {ta.totalPoints} ⭐
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {detailModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: '20px',
        }} onClick={() => setDetailModal(null)}>
          <div style={{
            background: 'white', borderRadius: '16px',
            padding: '24px', width: '100%', maxWidth: '420px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {detailModal.activity?.icon && (
                  <IconDisplay icon={detailModal.activity.icon} size={32} />
                )}
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#1F2937' }}>
                    {detailModal.activity?.name || detailModal.eventType}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                    {detailModal.activity?.category?.icon} {detailModal.activity?.category?.name}
                  </div>
                </div>
              </div>
              <button onClick={() => setDetailModal(null)} style={{
                background: '#F3F4F6', border: 'none', borderRadius: '8px',
                width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px',
              }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <InfoPill icon="👤" label={isHe ? 'בוצע ע״י' : 'Done by'} value={detailModal.recordedBy.name || detailModal.recordedBy.email} />
                <InfoPill icon="📅" label={isHe ? 'תאריך' : 'Date'} value={formatDate(detailModal.occurredAt, lang)} />
                <InfoPill icon="🕐" label={isHe ? 'שעה' : 'Time'} value={formatTime(detailModal.occurredAt)} />
                <InfoPill icon="⭐" label={isHe ? 'נקודות' : 'Points'} value={`+${detailModal.points}`} />
              </div>

              {detailModal.metadata && (() => {
                try {
                  const m = JSON.parse(detailModal.metadata)
                  return (
                    <>
                      {m.note && (
                        <div style={{ background: '#F9FAFB', borderRadius: '12px', padding: '14px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', marginBottom: '4px' }}>
                            📝 {t(lang, 'noteLabel')}
                          </div>
                          <div style={{ fontSize: '14px', color: '#1F2937' }}>{m.note}</div>
                        </div>
                      )}
                      {m.photo && (
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', marginBottom: '6px' }}>
                            📷 {t(lang, 'photoLabel2')}
                          </div>
                          <img src={m.photo} alt="" style={{
                            width: '100%', borderRadius: '12px', maxHeight: '300px',
                            objectFit: 'cover',
                          }} />
                        </div>
                      )}
                    </>
                  )
                } catch { return null }
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Navigation ── */}
      <BottomNav router={router} lang={lang} sessionUser={sessionUser} />
    </div>
  )
}

function InfoPill({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ flex: '1 0 120px' }}>
      <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '600' }}>{icon} {label}</div>
      <div style={{ fontSize: '14px', color: '#1F2937', fontWeight: '700' }}>{value}</div>
    </div>
  )
}

function BottomNav({ router, lang, sessionUser }: { router: any; lang: string; sessionUser: any }) {
  const isManager = sessionUser?.role === 'ADMIN' || sessionUser?.role === 'MANAGER'
  const isHe = lang === 'he'
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'white', borderTop: '1px solid #E5E7EB',
      padding: 'clamp(8px, 2vw, 10px) 0',
      boxShadow: '0 -4px 16px rgba(0,0,0,0.08)', zIndex: 100,
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        {[
          { path: '/', icon: '🏠', label: t(lang as any, 'navHome') },
          { path: '/history', icon: '📜', label: isHe ? 'היסטוריה' : 'History' },
          { path: '/leaderboard', icon: '🏆', label: t(lang as any, 'navRankings') },
          { path: '/users', icon: '👥', label: t(lang as any, 'navFamily') },
          ...(isManager ? [{ path: '/admin', icon: '⚙️', label: t(lang as any, 'navManage') }] : []),
        ].map(item => (
          <button key={item.path} onClick={() => router.push(item.path)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
              padding: '6px clamp(8px, 2vw, 16px)', minHeight: '48px', minWidth: '48px',
              color: item.path === '/history' ? '#667eea' : '#9CA3AF',
              fontWeight: item.path === '/history' ? '800' : '600',
              fontSize: 'clamp(10px, 2.5vw, 12px)',
              WebkitTapHighlightColor: 'transparent',
            }}>
            <span style={{ fontSize: 'clamp(20px, 5vw, 24px)' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  padding: '10px 12px',
  border: '2px solid #E5E7EB',
  borderRadius: '10px',
  fontSize: '13px',
  fontFamily: 'system-ui',
  fontWeight: '600',
  color: '#374151',
  background: 'white',
  cursor: 'pointer',
  outline: 'none',
  boxSizing: 'border-box' as const,
  width: '100%',
}

const summaryCardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '14px',
  padding: 'clamp(12px, 3vw, 16px)',
  textAlign: 'center' as const,
  border: '2px solid #E5E7EB',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
}
