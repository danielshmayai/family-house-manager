'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

type LeaderboardEntry = {
  user: { id: string; name: string | null; email: string }
  points: number
  activities: number
  streak: number
}

export default function Leaderboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [range, setRange] = useState<'daily' | 'weekly' | 'monthly' | 'all-time'>('weekly')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLeaderboard()
  }, [range, session])

  async function loadLeaderboard() {
    setLoading(true)
    try {
      const householdId = (session?.user as any)?.householdId
      if (!householdId) {
        setData(null)
        setLoading(false)
        return
      }
      const res = await fetch(`/api/leaderboard?householdId=${householdId}&range=${range}`)
      const d = await res.json()
      setData(d)
    } catch (err) {
      console.error('Failed to load leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const medals = ['🥇', '🥈', '🥉']
  const podiumColors = [
    'linear-gradient(135deg, #F59E0B, #FCD34D)', // gold
    'linear-gradient(135deg, #9CA3AF, #D1D5DB)', // silver
    'linear-gradient(135deg, #CD7F32, #D97706)', // bronze
  ]
  const podiumHeights = ['130px', '90px', '70px']
  const podiumOrder = [1, 0, 2] // display order: 2nd, 1st, 3rd

  const rangeLabels = {
    'daily': '📅 Today',
    'weekly': '📊 This Week',
    'monthly': '📆 This Month',
    'all-time': '🏆 All Time'
  }

  const results: LeaderboardEntry[] = data?.results || []
  const top3 = results.slice(0, 3)

  return (
    <div style={{
      padding: 'clamp(12px, 3vw, 24px)',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'system-ui',
      minHeight: '100vh',
      paddingBottom: '100px'
    }}>
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '10px 16px', background: '#F3F4F6', border: 'none',
            borderRadius: '10px', fontSize: '14px', fontWeight: '600',
            cursor: 'pointer', color: '#374151', display: 'flex',
            alignItems: 'center', gap: '6px', minHeight: '40px',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          ← Home
        </button>
      </div>

      <div style={{ marginBottom: 'clamp(16px, 4vw, 24px)', textAlign: 'center' }}>
        <h1 style={{
          fontSize: 'clamp(28px, 7vw, 40px)', fontWeight: '800', margin: '0 0 8px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>
          🏆 Family Rankings
        </h1>
        <p style={{ color: '#6B7280', margin: 0, fontSize: 'clamp(13px, 3.5vw, 16px)' }}>
          Who's crushing it in your family?
        </p>
      </div>

      {/* Time Range Selector */}
      <div style={{
        display: 'flex', gap: 'clamp(4px, 1vw, 8px)', marginBottom: 'clamp(20px, 5vw, 32px)',
        background: 'white', padding: '6px', borderRadius: '14px',
        border: '2px solid #E5E7EB', flexWrap: 'wrap'
      }}>
        {(Object.keys(rangeLabels) as Array<keyof typeof rangeLabels>).map(r => (
          <button key={r} onClick={() => setRange(r)}
            style={{
              flex: '1 1 auto', minWidth: 'clamp(90px, 22%, 120px)', minHeight: '44px',
              padding: 'clamp(10px, 2.5vw, 12px) clamp(8px, 2vw, 16px)',
              background: range === r ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'transparent',
              color: range === r ? 'white' : '#6B7280',
              border: 'none', borderRadius: '10px',
              fontSize: 'clamp(11px, 3vw, 14px)', fontWeight: '700',
              cursor: 'pointer', transition: 'all 0.2s',
              WebkitTapHighlightColor: 'transparent'
            }}>
            {rangeLabels[r]}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'clamp(40px, 10vw, 60px) 0', color: '#666' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</div>
          <div style={{ fontSize: '16px', fontWeight: '600' }}>Loading rankings...</div>
        </div>
      ) : !data || results.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '20px', border: '2px dashed #E5E7EB' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎯</div>
          <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>No results yet!</div>
          <div style={{ fontSize: '15px', color: '#6B7280' }}>
            {(session?.user as any)?.householdId
              ? 'Start completing activities to appear on the leaderboard!'
              : 'Sign in and join a family to see rankings.'}
          </div>
        </div>
      ) : (
        <>
          {/* Family Total Score */}
          {data.familyTotal !== undefined && (
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: 'clamp(16px, 4vw, 24px)', borderRadius: '20px',
              marginBottom: 'clamp(20px, 5vw, 32px)', color: 'white',
              textAlign: 'center', boxShadow: '0 8px 24px rgba(102,126,234,0.35)'
            }}>
              <div style={{ fontSize: 'clamp(13px, 3.5vw, 16px)', opacity: 0.9, marginBottom: '8px', fontWeight: '600' }}>
                🏠 Family Total Score
              </div>
              <div style={{ fontSize: 'clamp(36px, 9vw, 52px)', fontWeight: '900', lineHeight: 1 }}>
                {data.familyTotal.toLocaleString()} ⭐
              </div>
              <div style={{ fontSize: 'clamp(12px, 3vw, 14px)', opacity: 0.8, marginTop: '8px' }}>
                points earned together!
              </div>
            </div>
          )}

          {/* Animated Podium — show only if 3+ players with points */}
          {top3.length >= 2 && top3[0].points > 0 && (
            <div style={{ marginBottom: 'clamp(24px, 6vw, 40px)' }}>
              <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '14px', fontWeight: '700', color: '#6B7280', letterSpacing: '1px' }}>
                TOP CHAMPIONS
              </div>

              {/* Podium Avatars (reordered: 2nd, 1st, 3rd) */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 'clamp(8px, 2vw, 20px)', marginBottom: '0' }}>
                {podiumOrder.map((index) => {
                  const entry = top3[index]
                  if (!entry) return null
                  const position = index + 1
                  const isFirst = index === 0

                  return (
                    <div key={entry.user.id} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: '8px', flex: isFirst ? '0 0 auto' : '0 0 auto'
                    }}>
                      {/* Medal */}
                      <div style={{ fontSize: isFirst ? '32px' : '24px', animation: isFirst ? 'bounce 1s infinite' : 'none' }}>
                        {medals[index]}
                      </div>

                      {/* Avatar */}
                      <div style={{
                        width: isFirst ? 'clamp(64px, 16vw, 80px)' : 'clamp(52px, 13vw, 64px)',
                        height: isFirst ? 'clamp(64px, 16vw, 80px)' : 'clamp(52px, 13vw, 64px)',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${getGradientColors(entry.user.name || entry.user.email)})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: isFirst ? 'clamp(24px, 6vw, 32px)' : 'clamp(20px, 5vw, 26px)',
                        fontWeight: '700', color: 'white',
                        border: `3px solid ${isFirst ? '#F59E0B' : index === 1 ? '#9CA3AF' : '#CD7F32'}`,
                        boxShadow: isFirst ? '0 0 0 4px rgba(245,158,11,0.25)' : 'none',
                        flexShrink: 0
                      }}>
                        {(entry.user.name || entry.user.email).charAt(0).toUpperCase()}
                      </div>

                      {/* Name */}
                      <div style={{
                        fontSize: isFirst ? 'clamp(12px, 3vw, 14px)' : 'clamp(11px, 2.5vw, 12px)',
                        fontWeight: '800', color: '#1F2937',
                        textAlign: 'center', maxWidth: 'clamp(72px, 18vw, 90px)',
                        wordBreak: 'break-word', lineHeight: '1.2'
                      }}>
                        {(entry.user.name || entry.user.email).split(' ')[0]}
                      </div>

                      {/* Points */}
                      <div style={{
                        fontSize: isFirst ? 'clamp(14px, 3.5vw, 16px)' : 'clamp(12px, 3vw, 14px)',
                        fontWeight: '800',
                        color: index === 0 ? '#F59E0B' : index === 1 ? '#9CA3AF' : '#CD7F32'
                      }}>
                        {entry.points.toLocaleString()} ⭐
                      </div>

                      {/* Podium Bar */}
                      <div style={{
                        width: isFirst ? 'clamp(80px, 20vw, 110px)' : 'clamp(68px, 17vw, 90px)',
                        height: podiumHeights[index],
                        background: podiumColors[index],
                        borderRadius: '12px 12px 0 0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: isFirst ? '28px' : '22px',
                        boxShadow: isFirst ? '0 -4px 16px rgba(245,158,11,0.3)' : '0 -2px 8px rgba(0,0,0,0.1)',
                        animation: isFirst ? 'pulse 2s infinite' : 'none'
                      }}>
                        {position === 1 ? '👑' : position === 2 ? '🥈' : '🥉'}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Podium base */}
              <div style={{
                height: '12px', background: 'linear-gradient(135deg, #E5E7EB, #D1D5DB)',
                borderRadius: '0 0 12px 12px', marginTop: '-2px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }} />
            </div>
          )}

          {/* Full Rankings List */}
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '800', color: '#374151' }}>
            All Rankings
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 2vw, 12px)' }}>
            {results.map((entry: LeaderboardEntry, i: number) => {
              const isCurrentUser = (session?.user as any)?.id === entry.user.id
              const position = i + 1

              return (
                <div key={entry.user.id} style={{
                  background: isCurrentUser
                    ? 'linear-gradient(135deg, #EDE9FE, #DDD6FE)'
                    : 'white',
                  border: isCurrentUser ? '2px solid #7C3AED' : '2px solid #E5E7EB',
                  borderRadius: '16px',
                  padding: 'clamp(12px, 3vw, 16px) clamp(12px, 3vw, 20px)',
                  display: 'flex', alignItems: 'center',
                  gap: 'clamp(8px, 2vw, 16px)',
                  boxShadow: position <= 3 ? '0 4px 12px rgba(0,0,0,0.08)' : '0 2px 4px rgba(0,0,0,0.04)',
                  flexWrap: 'wrap'
                }}>
                  {/* Position */}
                  <div style={{
                    fontSize: position <= 3 ? 'clamp(28px, 7vw, 36px)' : 'clamp(18px, 4.5vw, 24px)',
                    fontWeight: '900', minWidth: 'clamp(36px, 9vw, 48px)',
                    textAlign: 'center', flexShrink: 0,
                    color: position === 1 ? '#F59E0B' : position === 2 ? '#9CA3AF' : position === 3 ? '#CD7F32' : '#6B7280'
                  }}>
                    {position <= 3 ? medals[i] : `#${position}`}
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width: 'clamp(44px, 11vw, 56px)', height: 'clamp(44px, 11vw, 56px)',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${getGradientColors(entry.user.name || entry.user.email)})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'clamp(18px, 4.5vw, 24px)', fontWeight: '700', color: 'white', flexShrink: 0
                  }}>
                    {(entry.user.name || entry.user.email).charAt(0).toUpperCase()}
                  </div>

                  {/* User Info */}
                  <div style={{ flex: 1, minWidth: '100px' }}>
                    <div style={{
                      fontSize: 'clamp(15px, 4vw, 18px)', fontWeight: '800', marginBottom: '4px',
                      display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'
                    }}>
                      {entry.user.name || entry.user.email}
                      {isCurrentUser && (
                        <span style={{
                          background: '#7C3AED', color: 'white',
                          padding: '2px 10px', borderRadius: '20px',
                          fontSize: '11px', fontWeight: '700'
                        }}>YOU</span>
                      )}
                    </div>
                    <div style={{ fontSize: 'clamp(11px, 2.5vw, 13px)', color: '#9CA3AF', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {entry.activities > 0 && <span>📋 {entry.activities} activities</span>}
                      {entry.streak > 0 && <span>🔥 {entry.streak} day streak</span>}
                    </div>
                  </div>

                  {/* Points */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      fontSize: position <= 3 ? 'clamp(22px, 5.5vw, 28px)' : 'clamp(18px, 4.5vw, 22px)',
                      fontWeight: '900',
                      color: position === 1 ? '#F59E0B' : position === 2 ? '#9CA3AF' : position === 3 ? '#CD7F32' : '#374151'
                    }}>
                      {entry.points.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '700' }}>POINTS ⭐</div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

function getGradientColors(name: string): string {
  const gradients = [
    '#667eea, #764ba2',
    '#f093fb, #f5576c',
    '#4facfe, #00f2fe',
    '#43e97b, #38f9d7',
    '#fa709a, #fee140',
    '#30cfd0, #330867',
    '#a8edea, #fed6e3',
    '#ff9a9e, #fecfef'
  ]
  const index = name.charCodeAt(0) % gradients.length
  return gradients[index]
}
