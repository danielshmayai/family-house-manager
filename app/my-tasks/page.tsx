"use client"
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/language-context'
import { t } from '@/lib/i18n'

type Activity = {
  id: string
  name: string
  icon?: string | null
  defaultPoints: number
  category: { name: string }
}

type UserTask = {
  id: string
  title: string
  description?: string
  activityId?: string | null
  activity?: { id: string; name: string; icon?: string | null; defaultPoints: number } | null
  points?: number | null
  assignedById: string
  assignedToId: string
  isCompleted: boolean
  completedAt?: string
  createdAt: string
  assignedBy: { id: string; name: string | null; role: string }
  assignedTo: { id: string; name: string | null }
}

type FamilyMember = {
  id: string
  name: string | null
  role: string
}

// Flying star particle
type Star = { id: number; x: number; size: number; delay: number; color: string }

const STAR_COLORS = ['#FBBF24', '#F59E0B', '#FCD34D', '#FDE68A', '#FACC15']
const BONUS_POINTS = 20

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 5 + Math.random() * 90,
    size: 16 + Math.floor(Math.random() * 20),
    delay: Math.random() * 600,
    color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]
  }))
}

export default function MyTasksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { lang } = useLang()
  const sessionUser = session?.user as any
  const userId = sessionUser?.id
  const householdId = sessionUser?.householdId
  const userRole = sessionUser?.role
  const userIsManager = userRole === 'ADMIN' || userRole === 'MANAGER'

  const [tasks, setTasks] = useState<UserTask[]>([])
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Add task modal
  const [showModal, setShowModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [assignTo, setAssignTo] = useState<string>('')
  const [selectedActivityId, setSelectedActivityId] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [newPoints, setNewPoints] = useState<string>('')
  const [saving, setSaving] = useState(false)

  // Bonus animation
  const [showBonus, setShowBonus] = useState(false)
  const [stars] = useState<Star[]>(() => generateStars(18))
  const bonusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const viewedUserId = selectedMemberId || userId

  const loadTasks = useCallback(async () => {
    if (!viewedUserId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/my-tasks?userId=${viewedUserId}`)
      if (res.ok) setTasks(await res.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [viewedUserId])

  useEffect(() => {
    if (status === 'loading') return
    if (status !== 'authenticated') { router.push('/auth/login'); return }
    if (!householdId) return
    loadTasks()
  }, [status, loadTasks, householdId, router])

  useEffect(() => {
    if (!userIsManager || !householdId) return
    fetch(`/api/users?householdId=${householdId}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMembers(data) })
      .catch(() => {})
  }, [userIsManager, householdId])

  useEffect(() => {
    if (!userIsManager) return
    fetch('/api/activities')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setActivities(data) })
      .catch(() => {})
  }, [userIsManager])

  // Split tasks
  const managerTasks = tasks.filter(t => t.assignedById !== t.assignedToId)
  const selfTasks = tasks.filter(t => t.assignedById === t.assignedToId)

  const managerDone = managerTasks.filter(t => t.isCompleted).length
  const managerTotal = managerTasks.length
  const progress = managerTotal > 0 ? (managerDone / managerTotal) * 100 : 0
  const allManagerDone = managerTotal > 0 && managerDone === managerTotal

  async function toggleTask(task: UserTask) {
    setToggling(task.id)
    try {
      const res = await fetch('/api/my-tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, isCompleted: !task.isCompleted })
      })
      if (res.ok) {
        const { task: updated, bonusGranted } = await res.json()
        setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
        if (bonusGranted) triggerBonusAnimation()
      }
    } catch { /* ignore */ }
    finally { setToggling(null) }
  }

  function triggerBonusAnimation() {
    setShowBonus(true)
    if (bonusTimer.current) clearTimeout(bonusTimer.current)
    bonusTimer.current = setTimeout(() => setShowBonus(false), 3800)
  }

  async function deleteTask(task: UserTask) {
    const isSelf = task.assignedById === task.assignedToId
    const confirmMsg = isSelf
      ? t(lang, 'deleteTaskConfirm')(task.title)
      : t(lang, 'cancelAssignmentConfirm')(task.title)
    if (!confirm(confirmMsg)) return
    setDeleting(task.id)
    try {
      const res = await fetch(`/api/my-tasks?id=${task.id}`, { method: 'DELETE' })
      if (res.ok) setTasks(prev => prev.filter(t => t.id !== task.id))
    } catch { /* ignore */ }
    finally { setDeleting(null) }
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/my-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim() || undefined,
          assignedToId: assignTo || viewedUserId,
          activityId: selectedActivityId || undefined,
          points: (!selectedActivityId && newPoints) ? parseInt(newPoints, 10) : undefined
        })
      })
      if (res.ok) {
        const task = await res.json()
        setTasks(prev => [task, ...prev])
        setShowModal(false)
        setNewTitle('')
        setNewDesc('')
        setAssignTo('')
        setSelectedActivityId('')
        setNewPoints('')
      }
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  // Unique categories derived from activities list
  const uniqueCategories = Array.from(new Set(activities.map(a => a.category.name)))

  function openModal() {
    setNewTitle('')
    setNewDesc('')
    setAssignTo(viewedUserId || '')
    setSelectedActivityId('')
    setSelectedCategory('')
    setShowModal(true)
  }

  if (status === 'loading') {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: '#666' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <div style={{ fontSize: '16px', fontWeight: '600' }}>{t(lang, 'loading')}</div>
      </div>
    )
  }

  const viewedMember = members.find(m => m.id === viewedUserId)
  const viewedName = viewedMember?.name || sessionUser?.name || ''

  return (
    <>
      {/* Keyframe styles */}
      <style>{`
        @keyframes starFly {
          0%   { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
          60%  { opacity: 1; }
          100% { transform: translateY(-85vh) scale(0.4) rotate(360deg); opacity: 0; }
        }
        @keyframes bonusPop {
          0%   { transform: scale(0.4) translateY(30px); opacity: 0; }
          50%  { transform: scale(1.12) translateY(-8px); opacity: 1; }
          75%  { transform: scale(0.95) translateY(0); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes bonusFade {
          0%   { opacity: 1; }
          70%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes progressGlow {
          0%, 100% { box-shadow: 0 0 6px rgba(102,126,234,0.4); }
          50%       { box-shadow: 0 0 16px rgba(102,126,234,0.8); }
        }
      `}</style>

      {/* Bonus overlay */}
      {showBonus && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none',
          animation: 'bonusFade 3.8s ease forwards'
        }}>
          {/* Stars */}
          {stars.map(star => (
            <div key={star.id} style={{
              position: 'absolute',
              bottom: '10%',
              left: `${star.x}%`,
              fontSize: `${star.size}px`,
              animation: `starFly 2.2s ease-out ${star.delay}ms forwards`,
              color: star.color,
              willChange: 'transform, opacity'
            }}>⭐</div>
          ))}
          {/* Bonus card */}
          <div style={{
            position: 'absolute', top: '30%', left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #FFF7ED, #FFFBEB)',
            border: '3px solid #F59E0B',
            borderRadius: '24px',
            padding: '28px 40px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(245,158,11,0.4)',
            animation: 'bonusPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
            minWidth: '240px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏆</div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: '#92400E', marginBottom: '6px' }}>
              {t(lang, 'bonusTitle')}
            </div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#F59E0B', marginBottom: '4px' }}>
              +{BONUS_POINTS} ⭐
            </div>
            <div style={{ fontSize: '14px', color: '#78350F', fontWeight: '600' }}>
              {t(lang, 'bonusMsg')(BONUS_POINTS)}
            </div>
          </div>
        </div>
      )}

      <div style={{
        maxWidth: '800px', margin: '0 auto',
        padding: 'clamp(16px, 4vw, 28px) clamp(12px, 3vw, 20px)',
        paddingBottom: '100px'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ margin: '0 0 4px', fontSize: 'clamp(22px, 5.5vw, 28px)', fontWeight: '900', color: '#1F2937' }}>
                {t(lang, 'myTasksTitle')}
              </h1>
              <p style={{ margin: 0, color: '#6B7280', fontSize: 'clamp(13px, 3vw, 14px)' }}>
                {t(lang, 'myTasksSubtitle')}
              </p>
            </div>
            <button onClick={openModal} style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white', border: 'none', borderRadius: '12px',
              fontSize: 'clamp(13px, 3vw, 15px)', fontWeight: '700',
              cursor: 'pointer', boxShadow: '0 4px 14px rgba(102,126,234,0.4)',
              WebkitTapHighlightColor: 'transparent'
            }}>
              {t(lang, 'addTask')}
            </button>
          </div>
        </div>

        {/* Manager member selector */}
        {userIsManager && members.length > 1 && (
          <div style={{
            background: 'white', borderRadius: '16px', padding: '14px 16px',
            border: '2px solid #E5E7EB', marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#6B7280', marginBottom: '10px' }}>
              👤 {t(lang, 'taskAssignToLabel')}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => setSelectedMemberId(null)} style={{
                padding: '7px 14px',
                background: !selectedMemberId ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#F3F4F6',
                color: !selectedMemberId ? 'white' : '#374151',
                border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent'
              }}>
                {sessionUser?.name?.split(' ')[0] || t(lang, 'taskAssignSelf')}
              </button>
              {members.filter(m => m.id !== userId).map(m => (
                <button key={m.id} onClick={() => setSelectedMemberId(m.id)} style={{
                  padding: '7px 14px',
                  background: selectedMemberId === m.id ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : '#F3F4F6',
                  color: selectedMemberId === m.id ? 'white' : '#374151',
                  border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
                  cursor: 'pointer', WebkitTapHighlightColor: 'transparent'
                }}>
                  {m.name || t(lang, 'unnamed')}
                </button>
              ))}
            </div>
            {selectedMemberId && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#9CA3AF', fontWeight: '600' }}>
                {t(lang, 'viewingTasksFor')(viewedName)}
              </div>
            )}
          </div>
        )}

        {/* Progress bar for manager-assigned tasks */}
        {managerTotal > 0 && (
          <div style={{
            background: allManagerDone
              ? 'linear-gradient(135deg, #D1FAE5, #A7F3D0)'
              : 'white',
            borderRadius: '18px',
            padding: '18px 20px',
            marginBottom: '24px',
            border: allManagerDone ? '2px solid #10B981' : '2px solid #E5E7EB',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            transition: 'all 0.4s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: allManagerDone ? '#065F46' : '#374151' }}>
                {allManagerDone ? t(lang, 'allTasksDone') : t(lang, 'myTasksManagerSection')}
              </div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: allManagerDone ? '#059669' : '#667eea' }}>
                {t(lang, 'progressLabel')(managerDone, managerTotal)}
              </div>
            </div>
            {/* Track */}
            <div style={{
              background: allManagerDone ? 'rgba(16,185,129,0.2)' : '#F3F4F6',
              borderRadius: '999px', height: '12px', overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: allManagerDone
                  ? 'linear-gradient(90deg, #10B981, #059669)'
                  : 'linear-gradient(90deg, #667eea, #764ba2)',
                borderRadius: '999px',
                transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
                animation: !allManagerDone && progress > 0 ? 'progressGlow 2s ease infinite' : 'none'
              }} />
            </div>
            {allManagerDone && (
              <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '13px', color: '#059669', fontWeight: '700' }}>
                🎉 {t(lang, 'bonusMsg')(BONUS_POINTS)}
              </div>
            )}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF', fontSize: '15px' }}>
            ⏳ {t(lang, 'loading')}
          </div>
        )}

        {!loading && (
          <>
            {/* Manager-assigned tasks */}
            <TaskSection
              title={t(lang, 'myTasksManagerSection') as string}
              tasks={managerTasks}
              emptyMsg={t(lang, 'myTasksEmptyManager') as string}
              sessionUserId={userId}
              userIsManager={userIsManager}
              toggling={toggling}
              deleting={deleting}
              onToggle={toggleTask}
              onDelete={deleteTask}
              accentColor="#667eea"
            />

            <div style={{ height: '24px' }} />

            {/* Self-assigned tasks */}
            <TaskSection
              title={t(lang, 'myTasksSelfSection') as string}
              tasks={selfTasks}
              emptyMsg={t(lang, 'myTasksEmptySelf') as string}
              sessionUserId={userId}
              userIsManager={userIsManager}
              toggling={toggling}
              deleting={deleting}
              onToggle={toggleTask}
              onDelete={deleteTask}
              accentColor="#10B981"
            />
          </>
        )}
      </div>

      {/* Add Task Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 1000
        }} onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div style={{
            background: 'white', borderRadius: '24px 24px 0 0',
            width: '100%', maxWidth: '600px',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column',
            maxHeight: '92vh', overflow: 'hidden'
          }}>

            {/* Handle + title */}
            <div style={{ padding: '16px 20px 0', flexShrink: 0, textAlign: 'center' }}>
              <div style={{ width: '40px', height: '4px', background: '#E5E7EB', borderRadius: '999px', margin: '0 auto 14px' }} />
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#1F2937', marginBottom: '16px' }}>
                {t(lang, 'newTaskTitle')}
              </div>
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: 'auto', padding: '0 20px', flex: 1 }}>
              <form onSubmit={handleAddTask} id="add-task-form">

                {/* ── Category + Activity picker (managers only) ── */}
                {userIsManager && activities.length > 0 && (
                  <div style={{ marginBottom: '18px' }}>

                    {/* Section label */}
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#6B7280', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {t(lang, 'taskFromActivityLabel')}
                    </div>

                    {/* Category pills — horizontal scroll */}
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', WebkitOverflowScrolling: 'touch' as any }}>
                      {/* "No activity" pill */}
                      <button
                        type="button"
                        onClick={() => { setSelectedCategory(''); setSelectedActivityId('') }}
                        style={{
                          flexShrink: 0, padding: '8px 16px', borderRadius: '20px',
                          border: `2px solid ${!selectedCategory ? '#667eea' : '#E5E7EB'}`,
                          background: !selectedCategory ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#F9FAFB',
                          color: !selectedCategory ? 'white' : '#6B7280',
                          fontSize: '13px', fontWeight: '700',
                          cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {t(lang, 'taskActivityNone')}
                      </button>

                      {/* Category buttons */}
                      {uniqueCategories.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => { setSelectedCategory(cat); setSelectedActivityId('') }}
                          style={{
                            flexShrink: 0, padding: '8px 16px', borderRadius: '20px',
                            border: `2px solid ${selectedCategory === cat ? '#667eea' : '#E5E7EB'}`,
                            background: selectedCategory === cat ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#F9FAFB',
                            color: selectedCategory === cat ? 'white' : '#374151',
                            fontSize: '13px', fontWeight: '700',
                            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Activity cards grid */}
                    {selectedCategory && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
                        gap: '8px',
                        marginTop: '10px'
                      }}>
                        {activities.filter(a => a.category.name === selectedCategory).map(a => {
                          const isSelected = selectedActivityId === a.id
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => {
                                const picking = isSelected ? '' : a.id
                                setSelectedActivityId(picking)
                                if (picking && !newTitle.trim()) setNewTitle(a.name)
                              }}
                              style={{
                                padding: '12px 6px',
                                borderRadius: '14px',
                                border: `2px solid ${isSelected ? '#667eea' : '#E5E7EB'}`,
                                background: isSelected ? 'linear-gradient(135deg, #EEF2FF, #F5F3FF)' : 'white',
                                boxShadow: isSelected ? '0 0 0 3px rgba(102,126,234,0.2)' : 'none',
                                cursor: 'pointer',
                                textAlign: 'center',
                                WebkitTapHighlightColor: 'transparent',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ fontSize: '26px', lineHeight: 1, marginBottom: '6px' }}>{a.icon || '⚡'}</div>
                              <div style={{ fontSize: '11px', fontWeight: '700', color: isSelected ? '#4338CA' : '#374151', lineHeight: 1.2 }}>
                                {a.name}
                              </div>
                              <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '3px' }}>+{a.defaultPoints}⭐</div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Title ── */}
                <div style={{ marginBottom: '14px' }}>
                  <label htmlFor="task-title-input" style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                    {t(lang, 'taskTitleLabel')}
                  </label>
                  <input
                    id="task-title-input"
                    autoFocus
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. Clean room, Finish homework…"
                    required
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: '12px',
                      border: '2px solid #E5E7EB', fontSize: '15px', outline: 'none',
                      boxSizing: 'border-box', fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* ── Description ── */}
                <div style={{ marginBottom: '14px' }}>
                  <label htmlFor="task-desc-input" style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                    {t(lang, 'taskDescriptionLabel')}
                  </label>
                  <textarea
                    id="task-desc-input"
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    rows={2}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: '12px',
                      border: '2px solid #E5E7EB', fontSize: '15px', outline: 'none',
                      resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* ── Custom points (managers, no activity selected) ── */}
                {userIsManager && !selectedActivityId && (assignTo !== userId || assignTo === '') && (
                  <div style={{ marginBottom: '14px' }}>
                    <label htmlFor="task-points-input" style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                      ⭐ {lang === 'he' ? 'נקודות למשימה (אופציונלי)' : 'Task Points (optional)'}
                    </label>
                    <input
                      id="task-points-input"
                      type="number"
                      min={0}
                      max={10000}
                      value={newPoints}
                      onChange={e => setNewPoints(e.target.value)}
                      placeholder="0"
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: '12px',
                        border: '2px solid #fde68a', fontSize: '15px', outline: 'none',
                        boxSizing: 'border-box', fontFamily: 'inherit', background: '#fffbeb'
                      }}
                    />
                  </div>
                )}

                {/* ── Assign-to (managers) — pill buttons ── */}
                {userIsManager && members.length > 1 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#6B7280', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {t(lang, 'taskAssignToLabel')}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {members.map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setAssignTo(m.id)}
                          style={{
                            padding: '8px 16px', borderRadius: '20px',
                            border: `2px solid ${assignTo === m.id ? '#667eea' : '#E5E7EB'}`,
                            background: assignTo === m.id ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#F9FAFB',
                            color: assignTo === m.id ? 'white' : '#374151',
                            fontSize: '13px', fontWeight: '700',
                            cursor: 'pointer', WebkitTapHighlightColor: 'transparent'
                          }}
                        >
                          {m.name || t(lang, 'unnamed')}{m.id === userId ? ` (${t(lang, 'taskAssignSelf')})` : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </form>
            </div>

            {/* Fixed footer buttons */}
            <div style={{
              padding: '14px 20px 40px', display: 'flex', gap: '10px',
              flexShrink: 0, borderTop: '1px solid #F3F4F6'
            }}>
              <button type="button" onClick={() => setShowModal(false)} style={{
                flex: 1, padding: '13px', borderRadius: '12px',
                border: '2px solid #E5E7EB', background: 'white',
                fontSize: '15px', fontWeight: '700', cursor: 'pointer', color: '#374151',
                WebkitTapHighlightColor: 'transparent'
              }}>
                {t(lang, 'cancel')}
              </button>
              <button type="submit" form="add-task-form" disabled={saving} style={{
                flex: 2, padding: '13px',
                background: saving ? '#E5E7EB' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: saving ? '#9CA3AF' : 'white',
                border: 'none', borderRadius: '12px',
                fontSize: '15px', fontWeight: '700',
                cursor: saving ? 'not-allowed' : 'pointer',
                WebkitTapHighlightColor: 'transparent'
              }}>
                {saving ? t(lang, 'savingTask') : t(lang, 'saveTask')}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}

// ── Task section component ──────────────────────────────────────────────────
type TaskSectionProps = {
  title: string
  tasks: UserTask[]
  emptyMsg: string
  sessionUserId: string
  userIsManager: boolean
  toggling: string | null
  deleting: string | null
  onToggle: (task: UserTask) => void
  onDelete: (task: UserTask) => void
  accentColor: string
}

function TaskSection({
  title, tasks, emptyMsg,
  sessionUserId, userIsManager,
  toggling, deleting,
  onToggle, onDelete,
  accentColor
}: TaskSectionProps) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px'
      }}>
        <h2 style={{ margin: 0, fontSize: 'clamp(15px, 3.5vw, 17px)', fontWeight: '800', color: '#1F2937' }}>
          {title}
        </h2>
        <span style={{
          background: accentColor + '1A',
          color: accentColor,
          fontWeight: '800', fontSize: '12px',
          padding: '2px 10px', borderRadius: '999px'
        }}>
          {tasks.filter(t => t.isCompleted).length}/{tasks.length}
        </span>
      </div>

      {tasks.length === 0 && (
        <div style={{
          background: '#F9FAFB', borderRadius: '16px', padding: '28px 20px',
          textAlign: 'center', border: '2px dashed #E5E7EB'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
          <div style={{ fontSize: '14px', color: '#9CA3AF', fontWeight: '600' }}>{emptyMsg}</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {tasks.map(task => {
          const isSelf = task.assignedById === task.assignedToId
          const canDelete = userIsManager || task.assignedToId === sessionUserId
          const activityIcon = task.activity?.icon || '📋'

          return (
            <div key={task.id} style={{
              background: task.isCompleted
                ? 'linear-gradient(135deg, #F0FDF4, #DCFCE7)'
                : 'white',
              border: `2px solid ${task.isCompleted ? '#86EFAC' : '#E5E7EB'}`,
              borderRadius: '16px',
              padding: 'clamp(12px, 3vw, 16px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              transition: 'all 0.3s ease',
              opacity: deleting === task.id ? 0.4 : 1
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                {/* Toggle checkbox - first in DOM = rightmost in RTL */}
                <button
                  onClick={() => onToggle(task)}
                  disabled={!!toggling}
                  style={{
                    flexShrink: 0,
                    width: '28px', height: '28px',
                    borderRadius: '8px',
                    border: `2.5px solid ${task.isCompleted ? '#10B981' : accentColor}`,
                    background: task.isCompleted ? '#10B981' : 'transparent',
                    cursor: toggling ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', color: 'white',
                    transition: 'all 0.2s ease',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                >
                  {toggling === task.id ? '⏳' : task.isCompleted ? '✓' : ''}
                </button>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <div style={{
                      flex: 1,
                      fontSize: 'clamp(14px, 3.5vw, 15px)',
                      fontWeight: '700',
                      color: task.isCompleted ? '#6B7280' : '#1F2937',
                      textDecoration: task.isCompleted ? 'line-through' : 'none',
                      wordBreak: 'break-word'
                    }}>
                      {task.title}
                    </div>
                    {/* Cancel/delete button - small, inside content */}
                    {canDelete && (
                      <button
                        onClick={() => onDelete(task)}
                        disabled={!!deleting}
                        style={{
                          flexShrink: 0,
                          background: 'none', border: 'none',
                          cursor: deleting ? 'not-allowed' : 'pointer',
                          fontSize: '14px', color: '#D1D5DB',
                          padding: '0 2px',
                          WebkitTapHighlightColor: 'transparent',
                          lineHeight: 1
                        }}
                        title={isSelf ? 'Delete' : 'Cancel assignment'}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {task.description && (
                    <div style={{
                      fontSize: '13px', color: '#9CA3AF', marginTop: '3px',
                      textDecoration: task.isCompleted ? 'line-through' : 'none'
                    }}>
                      {task.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {!isSelf && (
                      <span style={{
                        fontSize: '11px', fontWeight: '700',
                        background: accentColor + '1A', color: accentColor,
                        padding: '2px 8px', borderRadius: '999px'
                      }}>
                        👤 {task.assignedBy.name || '?'}
                      </span>
                    )}
                    {task.activity && (
                      <span style={{
                        fontSize: '11px', fontWeight: '700',
                        background: '#FEF3C7', color: '#92400E',
                        padding: '2px 8px', borderRadius: '999px'
                      }}>
                        {task.activity.icon || '⚡'} {task.activity.name}
                      </span>
                    )}
                    {!task.activity && task.points && task.points > 0 && (
                      <span style={{
                        fontSize: '11px', fontWeight: '700',
                        background: '#FEF3C7', color: '#B45309',
                        padding: '2px 8px', borderRadius: '999px'
                      }}>
                        ⭐ {task.points}
                      </span>
                    )}
                    {task.isCompleted && task.completedAt && (
                      <span style={{ fontSize: '11px', color: '#10B981', fontWeight: '700' }}>
                        ✓ {new Date(task.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Activity icon - last in DOM = leftmost in RTL */}
                <div style={{
                  flexShrink: 0,
                  fontSize: '22px',
                  lineHeight: 1,
                  marginTop: '2px',
                  opacity: task.isCompleted ? 0.5 : 1
                }}>
                  {activityIcon}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
