"use client"
import React, { useEffect, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

type Category = {
  id: string
  name: string
  icon?: string
  color?: string
  activities?: Activity[]
}

type Activity = {
  id: string
  name: string
  icon?: string
  defaultPoints: number
}

export default function QuickCompletePage(){
  const { data: session } = useSession()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [selectedActivityId, setSelectedActivityId] = useState<string>('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      const cats = Array.isArray(data) ? data : []
      setCategories(cats)
      if (cats.length > 0) {
        setSelectedCategoryId(cats[0].id)
      }
    } catch (err) {
      console.error('Failed to load categories:', err)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!session?.user) {
      signIn()
      return
    }

    if (!selectedActivityId) {
      setMsg('Please select an activity')
      return
    }

    setLoading(true)
    setMsg(null)

    try {
      const selectedCategory = categories.find(c => c.id === selectedCategoryId)
      const selectedActivity = selectedCategory?.activities?.find(a => a.id === selectedActivityId)
      
      if (!selectedActivity) {
        throw new Error('Activity not found')
      }

      const payload: any = {
        eventType: 'ACTIVITY_COMPLETED',
        recordedById: (session.user as any).id,
        activityId: selectedActivityId,
        points: selectedActivity.defaultPoints
      }

      // Get household ID
      let householdId = (session.user as any).householdId
      if (!householdId) {
        const userRes = await fetch(`/api/users?id=${(session.user as any).id}`)
        const userData = await userRes.json()
        householdId = Array.isArray(userData) ? userData[0]?.householdId : userData?.householdId
      }
      
      if (householdId) payload.householdId = householdId

      if (note) {
        payload.metadata = JSON.stringify({ note })
      }

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to complete activity')
      }

      setMsg(`✅ Activity completed! +${selectedActivity.defaultPoints} points`)
      setNote('')
      
      // Redirect to home after 1.5 seconds
      setTimeout(() => router.push('/'), 1500)
    } catch (err: any) {
      setMsg('❌ Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const selectedCategory = categories.find(c => c.id === selectedCategoryId)
  const activities = selectedCategory?.activities?.filter((a: any) => a.isActive) || []

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #F9FAFB 0%, #F3F4F6 100%)',
      fontFamily: 'system-ui',
      padding: 'clamp(12px, 3vw, 24px)'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ marginBottom: '12px' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '10px 16px',
              background: '#F3F4F6',
              border: 'none',
              borderRadius: '8px',
              fontSize: 'clamp(13px, 3.5vw, 14px)',
              fontWeight: '600',
              cursor: 'pointer',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              minHeight: '40px',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            ← Back
          </button>
        </div>
        {/* Header */}
        <div style={{ marginBottom: 'clamp(16px, 4vw, 32px)', textAlign: 'center' }}>
          <h1 style={{
            fontSize: 'clamp(24px, 6vw, 32px)',
            fontWeight: '800',
            margin: '0 0 8px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            ⚡ Quick Complete
          </h1>
          <p style={{ color: '#666', margin: 0, fontSize: 'clamp(13px, 3.5vw, 16px)' }}>
            Log an activity you just finished
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{
          background: 'white',
          borderRadius: '16px',
          padding: 'clamp(16px, 4vw, 32px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '2px solid #E5E7EB'
        }}>
          {/* Category Selection */}
          <div style={{ marginBottom: 'clamp(16px, 4vw, 24px)' }}>
            <label style={{
              display: 'block',
              marginBottom: '12px',
              fontSize: 'clamp(12px, 3vw, 14px)',
              fontWeight: '700',
              color: '#374151'
            }}>
              Category
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100px, 100%), 1fr))',
              gap: 'clamp(8px, 2vw, 12px)'
            }}>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(cat.id)
                    setSelectedActivityId('')
                  }}
                  style={{
                    padding: 'clamp(12px, 3vw, 16px)',
                    minHeight: '88px',
                    background: selectedCategoryId === cat.id ? cat.color || '#667eea' : 'white',
                    color: selectedCategoryId === cat.id ? 'white' : '#374151',
                    border: selectedCategoryId === cat.id ? 'none' : '2px solid #E5E7EB',
                    borderRadius: '12px',
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                >
                  <span style={{ fontSize: 'clamp(24px, 6vw, 32px)' }}>{cat.icon || '📌'}</span>
                  <span style={{ fontSize: 'clamp(11px, 2.5vw, 12px)' }}>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Activity Selection */}
          <div style={{ marginBottom: 'clamp(16px, 4vw, 24px)' }}>
            <label style={{
              display: 'block',
              marginBottom: '12px',
              fontSize: 'clamp(12px, 3vw, 14px)',
              fontWeight: '700',
              color: '#374151'
            }}>
              Activity *
            </label>
            <select
              value={selectedActivityId}
              onChange={e => setSelectedActivityId(e.target.value)}
              required
              style={{
                width: '100%',
                minHeight: '44px',
                padding: 'clamp(12px, 3vw, 14px)',
                border: '2px solid #E5E7EB',
                borderRadius: '12px',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                fontWeight: '600',
                color: '#374151',
                background: 'white'
              }}
            >
              <option value="">Select an activity...</option>
              {activities.map((activity: Activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.icon || '✓'} {activity.name} (+{activity.defaultPoints} pts)
                </option>
              ))}
            </select>
          </div>

          {/* Note (Optional) */}
          <div style={{ marginBottom: 'clamp(16px, 4vw, 24px)' }}>
            <label style={{
              display: 'block',
              marginBottom: '12px',
              fontSize: 'clamp(12px, 3vw, 14px)',
              fontWeight: '700',
              color: '#374151'
            }}>
              Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add any additional details..."
              style={{
                width: '100%',
                padding: 'clamp(12px, 3vw, 14px)',
                border: '2px solid #E5E7EB',
                borderRadius: '12px',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                fontFamily: 'system-ui',
                minHeight: '100px',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Message */}
          {msg && (
            <div style={{
              padding: 'clamp(12px, 3vw, 16px)',
              borderRadius: '12px',
              marginBottom: 'clamp(16px, 4vw, 24px)',
              background: msg.includes('✅') ? '#D1FAE5' : '#FEE2E2',
              color: msg.includes('✅') ? '#065F46' : '#991B1B',
              fontWeight: '600',
              textAlign: 'center',
              fontSize: 'clamp(13px, 3.5vw, 16px)'
            }}>
              {msg}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 'clamp(8px, 2vw, 12px)', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: '1 1 auto',
                minWidth: '140px',
                minHeight: '48px',
                padding: 'clamp(12px, 3vw, 16px)',
                background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.4)',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {loading ? '⏳ Saving...' : '✓ Complete Activity'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              style={{
                padding: 'clamp(12px, 3vw, 16px) clamp(16px, 4vw, 24px)',
                minHeight: '48px',
                background: '#F3F4F6',
                color: '#374151',
                border: 'none',
                borderRadius: '12px',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                fontWeight: '700',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Quick Stats */}
        <div style={{
          marginTop: 'clamp(16px, 4vw, 24px)',
          padding: 'clamp(16px, 4vw, 20px)',
          background: 'white',
          borderRadius: '16px',
          border: '2px solid #E5E7EB',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 'clamp(12px, 3vw, 14px)', color: '#666', marginBottom: '8px' }}>
            💡 Tip
          </div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>
            You can also complete activities directly from the home page by clicking on any activity card!
          </div>
        </div>
      </div>
    </div>
  )
}
