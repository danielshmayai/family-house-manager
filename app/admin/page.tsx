'use client'
import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import IconDisplay, { isImageIcon } from '@/components/IconDisplay'

type Category = {
  id: string
  key: string
  name: string
  description?: string
  icon?: string
  color?: string
  position: number
  isActive: boolean
  householdId?: string
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
  position: number
  isActive: boolean
  requiresNote: boolean
  requiresPhoto: boolean
}

export default function Admin() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [categories, setCategories] = useState<Category[]>([])
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null)
  const [editingActivity, setEditingActivity] = useState<Partial<Activity> | null>(null)
  const [loading, setLoading] = useState(false)

  const userRole = (session?.user as any)?.role
  const householdId = (session?.user as any)?.householdId
  const userId = (session?.user as any)?.id
  const isManager = userRole === 'ADMIN' || userRole === 'MANAGER'

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/login')
      return
    }
    if (!isManager) return // Will show access denied
    loadCategories()
  }, [status, session, householdId])

  async function loadCategories() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ includeInactive: 'true' })
      if (householdId) params.set('householdId', householdId)
      const res = await fetch(`/api/categories?${params}`)
      const data = await res.json()
      setCategories(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load categories:', err)
    } finally {
      setLoading(false)
    }
  }

  async function saveCategory() {
    if (!editingCategory?.name) return alert('Name is required')

    try {
      const method = editingCategory.id ? 'PUT' : 'POST'
      const payload = {
        ...editingCategory,
        householdId: householdId || editingCategory.householdId
      }
      const res = await fetch('/api/categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Failed to save category')

      await loadCategories()
      setShowCategoryModal(false)
      setEditingCategory(null)
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  async function deleteCategory(id: string) {
    const cat = categories.find(c => c.id === id)
    const actCount = cat?.activities?.length || 0
    const msg = actCount > 0
      ? `Delete "${cat?.name}" category?\n\nThis will also delete:\n• ${actCount} activit${actCount === 1 ? 'y' : 'ies'}\n• All related completion events & points\n\nThis action CANNOT be undone!`
      : `Delete "${cat?.name}" category?\n\nThis action CANNOT be undone!`
    if (!confirm(msg)) return

    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      const result = await res.json()
      const info = result.cascaded
        ? `Deleted! (${result.cascaded.activitiesDeleted} activities, ${result.cascaded.eventsDeleted} events removed)`
        : 'Deleted!'
      alert(info)
      await loadCategories()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  async function saveActivity() {
    if (!editingActivity?.name || !editingActivity?.categoryId) {
      return alert('Name and category are required')
    }

    try {
      const method = editingActivity.id ? 'PUT' : 'POST'
      const res = await fetch('/api/activities', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingActivity,
          createdById: userId || 'system'
        })
      })

      if (!res.ok) throw new Error('Failed to save activity')

      await loadCategories()
      setShowActivityModal(false)
      setEditingActivity(null)
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  async function deleteActivity(id: string) {
    const activity = categories.flatMap(c => c.activities || []).find(a => a.id === id)
    const msg = `Delete "${activity?.name}" activity?\n\nThis will also delete all related completion events & points.\n\nThis action CANNOT be undone!`
    if (!confirm(msg)) return

    try {
      const res = await fetch(`/api/activities?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      const result = await res.json()
      const info = result.cascaded
        ? `Deleted! (${result.cascaded.eventsDeleted} events removed)`
        : 'Deleted!'
      alert(info)
      await loadCategories()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  const [resetting, setResetting] = useState(false)

  async function resetToDefaults() {
    if (!confirm(
      '🔄 Reset to Default Activities?\n\n' +
      'This will:\n' +
      '• Delete ALL current categories & activities\n' +
      '• Delete ALL completion history & points\n' +
      '• Restore the original starter categories & activities\n\n' +
      'This action CANNOT be undone!'
    )) return

    setResetting(true)
    try {
      const res = await fetch('/api/reset-defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to reset')
      }
      await loadCategories()
      alert('✅ Activities have been reset to defaults!')
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setResetting(false)
    }
  }

  function openCategoryModal(category?: Category) {
    setEditingCategory(category || {
      name: '',
      description: '',
      icon: '📌',
      color: '#3B82F6',
      position: categories.length,
      isActive: true
    })
    setShowCategoryModal(true)
  }

  function openActivityModal(categoryId: string, activity?: Activity) {
    setEditingActivity(activity || {
      categoryId,
      name: '',
      description: '',
      icon: '✓',
      defaultPoints: 10,
      frequency: 'DAILY',
      position: 0,
      isActive: true,
      requiresNote: false,
      requiresPhoto: false
    })
    setShowActivityModal(true)
  }

  const categoryFileRef = useRef<HTMLInputElement>(null)
  const activityFileRef = useRef<HTMLInputElement>(null)

  const iconOptions = ['📌', '🏠', '🧹', '🍽️', '🧺', '🌱', '🔧', '💪', '📚', '🎯', '⭐', '✓', '✨', '🎨', '💼', '🛁', '🐕', '🚗', '🛒', '🍳', '🧴', '🪴', '📦', '🔑']
  const colorOptions = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

  function handleImageUpload(file: File, target: 'category' | 'activity') {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, GIF, SVG, WebP)')
      return
    }
    if (file.size > 512 * 1024) {
      alert('Image must be under 512 KB. Try a smaller image or an emoji instead.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUri = e.target?.result as string
      if (target === 'category') {
        setEditingCategory(prev => prev ? { ...prev, icon: dataUri } : prev)
      } else {
        setEditingActivity(prev => prev ? { ...prev, icon: dataUri } : prev)
      }
    }
    reader.readAsDataURL(file)
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <div style={{ color: '#666', fontWeight: '600' }}>Loading...</div>
        </div>
      </div>
    )
  }

  // Access denied
  if (session && !isManager) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        padding: '20px',
        fontFamily: 'system-ui'
      }}>
        <div style={{
          textAlign: 'center',
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          maxWidth: '400px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🚫</div>
          <h2 style={{ margin: '0 0 12px', fontSize: '24px', fontWeight: '800', color: '#1F2937' }}>
            Managers Only!
          </h2>
          <p style={{ color: '#6B7280', margin: '0 0 24px', lineHeight: '1.5' }}>
            Only family managers and admins can access this area. Ask your family manager for access!
          </p>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Go Home 🏠
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui' }}>
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
          ← Home
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'clamp(16px, 4vw, 32px)', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(20px, 5vw, 32px)', fontWeight: '800', margin: '0 0 4px' }}>⚙️ Manage Activities</h1>
          <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>
            {userRole === 'ADMIN' ? '👑 Admin' : '⭐ Manager'} — Add categories and activities for your family
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => openCategoryModal()}
            style={{
              padding: 'clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 24px)',
              minHeight: '44px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              fontWeight: '700',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              WebkitTapHighlightColor: 'transparent',
              boxShadow: '0 4px 12px rgba(102,126,234,0.3)'
            }}
          >
            ➕ New Category
          </button>
          <button
            onClick={resetToDefaults}
            disabled={resetting}
            style={{
              padding: 'clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 24px)',
              minHeight: '44px',
              background: resetting ? '#E5E7EB' : '#FEF3C7',
              color: '#92400E',
              border: '2px solid #FCD34D',
              borderRadius: '12px',
              fontSize: 'clamp(13px, 3vw, 14px)',
              fontWeight: '700',
              cursor: resetting ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              WebkitTapHighlightColor: 'transparent',
              opacity: resetting ? 0.6 : 1
            }}
          >
            {resetting ? '⏳ Resetting...' : '🔄 Reset to Defaults'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏳</div>
          <div>Loading...</div>
        </div>
      ) : categories.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'white',
          borderRadius: '20px',
          border: '2px dashed #E5E7EB'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📋</div>
          <h3 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: '700', color: '#1F2937' }}>
            No categories yet!
          </h3>
          <p style={{ margin: '0 0 24px', color: '#6B7280', lineHeight: '1.5' }}>
            Create your first category to start adding activities for your family.
          </p>
          <button
            onClick={() => openCategoryModal()}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            ➕ Create First Category
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: 'clamp(12px, 3vw, 24px)' }}>
          {categories.map(category => (
            <div
              key={category.id}
              style={{
                background: 'white',
                border: `2px solid ${category.color || '#E5E7EB'}`,
                borderRadius: '16px',
                padding: 'clamp(12px, 3vw, 20px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                opacity: category.isActive ? 1 : 0.6
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2vw, 12px)', flex: 1, minWidth: 0 }}>
                  <IconDisplay icon={category.icon} fallback="📌" size={32} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: 'clamp(16px, 4vw, 20px)', fontWeight: '700', wordBreak: 'break-word' }}>{category.name}</h3>
                    {category.description && (
                      <p style={{ margin: '4px 0 0', fontSize: 'clamp(12px, 3vw, 14px)', color: '#666', wordBreak: 'break-word' }}>{category.description}</p>
                    )}
                    {!category.isActive && (
                      <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '600' }}>INACTIVE</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => openCategoryModal(category)}
                    style={{ padding: '8px 12px', minHeight: '36px', minWidth: '36px', background: '#F3F4F6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: 'clamp(12px, 3vw, 14px)', WebkitTapHighlightColor: 'transparent' }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteCategory(category.id)}
                    style={{ padding: '8px 12px', minHeight: '36px', minWidth: '36px', background: '#FEE2E2', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: 'clamp(12px, 3vw, 14px)', WebkitTapHighlightColor: 'transparent' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: 'clamp(12px, 3vw, 14px)', fontWeight: '600', color: '#666' }}>
                    ACTIVITIES ({category.activities?.length || 0})
                  </h4>
                  <button
                    onClick={() => openActivityModal(category.id)}
                    style={{
                      padding: '8px 12px',
                      minHeight: '36px',
                      background: category.color || '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: 'clamp(11px, 2.5vw, 12px)',
                      cursor: 'pointer',
                      fontWeight: '700',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    + Add
                  </button>
                </div>

                {category.activities && category.activities.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {category.activities.map(activity => (
                      <div
                        key={activity.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: 'clamp(8px, 2vw, 10px)',
                          background: activity.isActive ? '#F9FAFB' : '#F3F4F6',
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB',
                          gap: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                          <IconDisplay icon={activity.icon} fallback="✓" size={18} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 'clamp(13px, 3.5vw, 14px)', fontWeight: '600', wordBreak: 'break-word' }}>{activity.name}</div>
                            <div style={{ fontSize: 'clamp(11px, 2.5vw, 12px)', color: '#666' }}>
                              ⭐ {activity.defaultPoints} pts · {activity.frequency}
                              {!activity.isActive && ' · INACTIVE'}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <button
                            onClick={() => openActivityModal(category.id, activity)}
                            style={{ padding: '8px', minHeight: '32px', minWidth: '32px', background: 'white', border: '1px solid #E5E7EB', borderRadius: '6px', cursor: 'pointer', fontSize: 'clamp(11px, 2.5vw, 12px)', WebkitTapHighlightColor: 'transparent' }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteActivity(activity.id)}
                            style={{ padding: '8px', minHeight: '32px', minWidth: '32px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '6px', cursor: 'pointer', fontSize: 'clamp(11px, 2.5vw, 12px)', WebkitTapHighlightColor: 'transparent' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '14px' }}>
                    No activities yet — click "+ Add" to create one!
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && editingCategory && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px'
        }}>
          <div style={{
            background: 'white', borderRadius: '20px', padding: 'clamp(20px, 5vw, 32px)',
            maxWidth: '500px', width: '100%', maxHeight: '90vh', overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 clamp(16px, 4vw, 24px)', fontSize: 'clamp(18px, 4.5vw, 24px)', fontWeight: '800' }}>
              {editingCategory.id ? '✏️ Edit Category' : '➕ New Category'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '700' }}>Icon</label>

                {/* Current icon preview */}
                {editingCategory.icon && (
                  <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '8px', background: '#F3F4F6', borderRadius: '10px', border: '2px solid #667eea' }}>
                      <IconDisplay icon={editingCategory.icon} fallback="📌" size={32} />
                    </div>
                    {isImageIcon(editingCategory.icon) && (
                      <button onClick={() => setEditingCategory({ ...editingCategory, icon: '📌' })}
                        style={{ padding: '6px 12px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', color: '#991B1B' }}>
                        ✕ Remove image
                      </button>
                    )}
                  </div>
                )}

                {/* Preset emoji grid */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {iconOptions.map(icon => (
                    <button key={icon} onClick={() => setEditingCategory({ ...editingCategory, icon })}
                      style={{
                        padding: '8px', minHeight: '44px', minWidth: '44px', fontSize: 'clamp(20px, 5vw, 24px)',
                        background: editingCategory.icon === icon ? '#E0E7FF' : '#F3F4F6',
                        border: editingCategory.icon === icon ? '2px solid #667eea' : '1px solid #E5E7EB',
                        borderRadius: '10px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent'
                      }}>{icon}</button>
                  ))}
                </div>

                {/* Custom emoji / text input */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <input
                    type="text"
                    placeholder="Or type any emoji..."
                    maxLength={4}
                    style={{ flex: 1, padding: '10px 12px', border: '2px solid #E5E7EB', borderRadius: '10px', fontSize: '18px', boxSizing: 'border-box' }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value.trim()
                        if (val) { setEditingCategory({ ...editingCategory, icon: val }); (e.target as HTMLInputElement).value = '' }
                      }
                    }}
                    onBlur={e => {
                      const val = e.target.value.trim()
                      if (val) { setEditingCategory({ ...editingCategory, icon: val }); e.target.value = '' }
                    }}
                  />
                </div>

                {/* Image upload */}
                <input ref={categoryFileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0], 'category'); e.target.value = '' }} />
                <button onClick={() => categoryFileRef.current?.click()}
                  style={{ padding: '8px 16px', background: '#EEF2FF', border: '2px dashed #667eea', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', color: '#4338CA', width: '100%', WebkitTapHighlightColor: 'transparent' }}>
                  📷 Upload custom image (PNG, JPG, etc.)
                </button>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '700' }}>Color</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {colorOptions.map(color => (
                    <button key={color} onClick={() => setEditingCategory({ ...editingCategory, color })}
                      style={{
                        width: '44px', height: '44px', background: color,
                        border: editingCategory.color === color ? '3px solid #1F2937' : '2px solid transparent',
                        borderRadius: '10px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent'
                      }} />
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '700' }}>Name *</label>
                <input type="text" value={editingCategory.name || ''} onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '2px solid #E5E7EB', borderRadius: '10px', fontSize: '16px', boxSizing: 'border-box' }}
                  placeholder="e.g., Household Chores" />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '700' }}>Description</label>
                <textarea value={editingCategory.description || ''} onChange={e => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '2px solid #E5E7EB', borderRadius: '10px', fontSize: '16px', minHeight: '80px', boxSizing: 'border-box', resize: 'vertical' }}
                  placeholder="Optional description..." />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={editingCategory.isActive !== false} onChange={e => setEditingCategory({ ...editingCategory, isActive: e.target.checked })}
                  style={{ width: '20px', height: '20px' }} />
                <span style={{ fontSize: '14px', fontWeight: '700' }}>Active (visible to family)</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: 'clamp(16px, 4vw, 24px)' }}>
              <button onClick={saveCategory}
                style={{ flex: 1, minHeight: '48px', padding: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                Save
              </button>
              <button onClick={() => { setShowCategoryModal(false); setEditingCategory(null) }}
                style={{ flex: 1, minHeight: '48px', padding: '12px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {showActivityModal && editingActivity && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px'
        }}>
          <div style={{
            background: 'white', borderRadius: '20px', padding: 'clamp(20px, 5vw, 32px)',
            maxWidth: '500px', width: '100%', maxHeight: '90vh', overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 'clamp(18px, 4.5vw, 24px)', fontWeight: '800' }}>
              {editingActivity.id ? '✏️ Edit Activity' : '➕ New Activity'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '700' }}>Icon</label>

                {/* Current icon preview */}
                {editingActivity.icon && (
                  <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '8px', background: '#F3F4F6', borderRadius: '10px', border: '2px solid #667eea' }}>
                      <IconDisplay icon={editingActivity.icon} fallback="✓" size={32} />
                    </div>
                    {isImageIcon(editingActivity.icon) && (
                      <button onClick={() => setEditingActivity({ ...editingActivity, icon: '✓' })}
                        style={{ padding: '6px 12px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', color: '#991B1B' }}>
                        ✕ Remove image
                      </button>
                    )}
                  </div>
                )}

                {/* Preset emoji grid */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {iconOptions.map(icon => (
                    <button key={icon} onClick={() => setEditingActivity({ ...editingActivity, icon })}
                      style={{
                        padding: '8px', minHeight: '44px', minWidth: '44px', fontSize: '20px',
                        background: editingActivity.icon === icon ? '#E0E7FF' : '#F3F4F6',
                        border: editingActivity.icon === icon ? '2px solid #667eea' : '1px solid #E5E7EB',
                        borderRadius: '10px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent'
                      }}>{icon}</button>
                  ))}
                </div>

                {/* Custom emoji / text input */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <input
                    type="text"
                    placeholder="Or type any emoji..."
                    maxLength={4}
                    style={{ flex: 1, padding: '10px 12px', border: '2px solid #E5E7EB', borderRadius: '10px', fontSize: '18px', boxSizing: 'border-box' }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value.trim()
                        if (val) { setEditingActivity({ ...editingActivity, icon: val }); (e.target as HTMLInputElement).value = '' }
                      }
                    }}
                    onBlur={e => {
                      const val = e.target.value.trim()
                      if (val) { setEditingActivity({ ...editingActivity, icon: val }); e.target.value = '' }
                    }}
                  />
                </div>

                {/* Image upload */}
                <input ref={activityFileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0], 'activity'); e.target.value = '' }} />
                <button onClick={() => activityFileRef.current?.click()}
                  style={{ padding: '8px 16px', background: '#EEF2FF', border: '2px dashed #667eea', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', color: '#4338CA', width: '100%', WebkitTapHighlightColor: 'transparent' }}>
                  📷 Upload custom image (PNG, JPG, etc.)
                </button>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '700' }}>Name *</label>
                <input type="text" value={editingActivity.name || ''} onChange={e => setEditingActivity({ ...editingActivity, name: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '2px solid #E5E7EB', borderRadius: '10px', fontSize: '16px', boxSizing: 'border-box' }}
                  placeholder="e.g., Wash dishes" />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '700' }}>Description</label>
                <textarea value={editingActivity.description || ''} onChange={e => setEditingActivity({ ...editingActivity, description: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '2px solid #E5E7EB', borderRadius: '10px', fontSize: '16px', minHeight: '60px', boxSizing: 'border-box', resize: 'vertical' }}
                  placeholder="Optional description..." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '700' }}>⭐ Points</label>
                  <input type="number" value={editingActivity.defaultPoints || 10} onChange={e => setEditingActivity({ ...editingActivity, defaultPoints: Number(e.target.value) })}
                    style={{ width: '100%', padding: '12px', border: '2px solid #E5E7EB', borderRadius: '10px', fontSize: '16px', boxSizing: 'border-box' }}
                    min={1} max={1000} />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '700' }}>Frequency</label>
                  <select value={editingActivity.frequency || 'DAILY'} onChange={e => setEditingActivity({ ...editingActivity, frequency: e.target.value })}
                    style={{ width: '100%', padding: '12px', border: '2px solid #E5E7EB', borderRadius: '10px', fontSize: '16px', boxSizing: 'border-box' }}>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="ANYTIME">Anytime</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { key: 'isActive', label: 'Active (visible to family)' },
                  { key: 'requiresNote', label: 'Requires a note when completing' },
                  { key: 'requiresPhoto', label: 'Requires a photo when completing' }
                ].map(({ key, label }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input type="checkbox"
                      checked={key === 'isActive' ? editingActivity.isActive !== false : !!(editingActivity as any)[key]}
                      onChange={e => setEditingActivity({ ...editingActivity, [key]: e.target.checked })}
                      style={{ width: '20px', height: '20px' }} />
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={saveActivity}
                style={{ flex: 1, minHeight: '48px', padding: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                Save Activity
              </button>
              <button onClick={() => { setShowActivityModal(false); setEditingActivity(null) }}
                style={{ flex: 1, minHeight: '48px', padding: '12px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
