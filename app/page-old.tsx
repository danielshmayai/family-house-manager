"use client"
import React, { useEffect, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'

type Task = any
type EventItem = any

export default function Page(){
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('Today')
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(()=>{
    setLoading(true)
    Promise.all([
      fetch('/api/tasks').then(async r => { if (!r.ok) throw new Error('Failed to fetch tasks'); return r.json() }),
      fetch('/api/events/today').then(async r => { if (!r.ok) return []; return r.json() }).catch(()=>[])
    ]).then(([tData, eData])=>{
      const list = Array.isArray(tData) ? tData : (tData?.tasks || [])
      setTasks(list)
      setEvents(Array.isArray(eData) ? eData : (eData?.events || []))
    }).catch(err=>{
      console.error(err)
      setError(String(err?.message || err))
    }).finally(()=>setLoading(false))
  },[])

  // Helper to check if a task was completed today
  function isTaskCompletedToday(taskId: string){
    return events.some(e => e.taskId === taskId && e.eventType === 'TASK_COMPLETED')
  }

  const quickActions = [
    { id: 'clean-kitchen', name: 'Clean kitchen', icon: '🧽', color: '#FFD29A' },
    { id: 'take-out-trash', name: 'Take out trash', icon: '🗑️', color: '#FFB86B' },
    { id: 'do-dishes', name: 'Do dishes', icon: '🍽️', color: '#FFE6B3' },
    { id: 'water-plants', name: 'Water plants', icon: '💧', color: '#A7E7FF' },
    { id: 'laundry', name: 'Laundry', icon: '🧺', color: '#FFD0E0' },
    { id: 'fix-leak', name: 'Fix leak', icon: '🔧', color: '#F4C2C2' }
  ]

  async function completeQuick(actionId: string){
    if (!(session && (session.user as any)?.id)) return signIn()
    
    // Find matching task by name/key if exists
    const matchingTask = tasks.find(t => 
      t.key?.includes(actionId) || 
      t.name?.toLowerCase().includes(actionId.replace(/-/g, ' '))
    )
    
    const payload: any = { 
      eventType: 'TASK_COMPLETED', 
      recordedById: (session.user as any).id, 
      taskId: matchingTask?.id,
      meta: { quickAction: actionId } 
    }

    // Ensure we have a householdId. Prefer session value; fall back to server lookup.
    let householdId = (session.user as any).householdId
    if (!householdId) {
      try {
        const u = await fetch(`/api/users?id=${(session.user as any).id}`).then(r => r.json()).catch(()=>null)
        // `/api/users?id=` may return a single object or an array depending on implementation
        if (u) {
          if (Array.isArray(u) && u.length) householdId = u[0].householdId
          else if (u.householdId) householdId = u.householdId
        }
      } catch {}
    }

    if (householdId) payload.householdId = householdId
    else {
      // Give a clearer message to the user instead of a raw 400
      alert('Unable to determine your household. Please join or create a household in settings before logging quick actions.')
      return
    }
    
    try {
      const res = await fetch('/api/events', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const body = await res.json().catch(()=>({}))
      if (!res.ok){
        console.error('events POST error', body)
        alert('Failed to log event: ' + (body.error || 'server error'))
        return
      }

      // Reload events to update checklist and timeline
      const d = await fetch('/api/events/today').then(r=>r.json()).catch(()=>[])
      const list = Array.isArray(d) ? d : (d?.events || [])
      setEvents(list)
    } catch(err){
      console.error('completeQuick error', err)
      alert('Network error, try again')
    }
  }

  // Complete a specific chore by task id (used in Chores tab)
  async function completeChore(taskId: string){
    if (!(session && (session.user as any)?.id)) return signIn()
    const payload = { eventType: 'TASK_COMPLETED', recordedById: (session.user as any).id, taskId }
    try{
      const res = await fetch('/api/events', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const body = await res.json().catch(()=>({}))
      if (!res.ok) { alert('Failed to complete chore: ' + (body.error || 'server error')); return }
      // refresh events and tasks
      const d = await fetch('/api/events/today').then(r=>r.json()).catch(()=>[])
      setEvents(Array.isArray(d) ? d : (d?.events || []))
    }catch(e){ console.error(e); alert('Network error') }
  }

  // Load household + members for House/Family tabs
  const [household, setHousehold] = useState<any>(null)
  useEffect(()=>{
    if ((session as any)?.user?.householdId){
      fetch(`/api/households?id=${(session as any).user.householdId}`).then(r=>r.json()).then(h=>setHousehold(h)).catch(()=>null)
    }
  },[session])

  return (
    <div>
      <div className="profile-card">
        <div className="profile-left">
          <div className="profile-name">Home Team</div>
          <div className="profile-sub">Household: Cozy Home</div>
        </div>
        <div className="profile-right">
          <div className="points">13 ⭐</div>
        </div>
      </div>

      <div className="tabs">
        {['Today','Chores','House','Family'].map(t => (
          <div key={t} className={`tab ${activeTab===t? 'active':''}`} onClick={()=>setActiveTab(t)}>{t}</div>
        ))}
      </div>

      {activeTab === 'Today' && (
        <>
          <section className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="quick-grid">
          {quickActions.map(a=> (
            <button key={a.id} className="quick-card" style={{background:a.color}} onClick={()=>completeQuick(a.id)}>
              <div className="qa-icon">{a.icon}</div>
              <div className="qa-title">{a.name}</div>
            </button>
          ))}
        </div>
          </section>

          <section className="today-checklist">
            <h3>Today's Checklist</h3>
            {loading ? (
              <div style={{color:'#888'}}>Loading...</div>
            ) : (
              <ul>
                {tasks.slice(0, 6).map((task: Task) => {
                  const completed = isTaskCompletedToday(task.id)
                  return (
                    <li key={task.id} style={{opacity: completed ? 0.6 : 1}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span>{completed ? '✓' : '○'}</span>
                        <span>{task.name}</span>
                      </div>
                      <span style={{color:'#888',fontSize:12}}>+{task.defaultPoints}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="timeline">
            <h3>Today</h3>
            <div className="events">
              {events.length===0 && <div style={{color:'#888'}}>No events yet</div>}
              {events.map((e: EventItem)=> {
                let meta = null
                try { meta = e.metadata ? JSON.parse(e.metadata) : null } catch {}
                const taskName = tasks.find(t => t.id === e.taskId)?.name
                const description = meta?.quickAction 
                  ? `Quick: ${meta.quickAction.replace(/-/g, ' ')}` 
                  : taskName 
                  ? taskName
                  : e.eventType.replace(/_/g, ' ').toLowerCase()
                
                return (
                  <div key={e.id} className="event-row">
                    <div className="event-time">{new Date(e.occurredAt).toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit'})}</div>
                    <div className="event-desc">
                      {description} — {e.recordedByName || e.recordedById}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}

      {activeTab === 'Chores' && (
        <section className="chores-section">
          <h3>Chores</h3>
          <ul>
            {tasks.map((t: Task) => <li key={t.id}>{t.name}</li>)}
          </ul>
        </section>
      )}

      {activeTab === 'House' && (
        <section className="house-section">
          <h3>House</h3>
          <div className="profile-card">
            <div className="profile-left">
              <div className="profile-name">Cozy Home</div>
              <div className="profile-sub">Household details</div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'Family' && (
        <section className="family-section">
          <h3>Family</h3>
          <div className="members-placeholder">Family members will appear here</div>
        </section>
      )}

      <section className="today-checklist">
        <h3>Today's Checklist</h3>
        {loading ? (
          <div style={{color:'#888'}}>Loading...</div>
        ) : (
          <ul>
            {tasks.slice(0, 6).map((task: Task) => {
              const completed = isTaskCompletedToday(task.id)
              return (
                <li key={task.id} style={{opacity: completed ? 0.6 : 1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span>{completed ? '✓' : '○'}</span>
                    <span>{task.name}</span>
                  </div>
                  <span style={{color:'#888',fontSize:12}}>+{task.defaultPoints}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="timeline">
        <h3>Today</h3>
        <div className="events">
          {events.length===0 && <div style={{color:'#888'}}>No events yet</div>}
          {events.map((e: EventItem)=> {
            let meta = null
            try { meta = e.metadata ? JSON.parse(e.metadata) : null } catch {}
            const taskName = tasks.find(t => t.id === e.taskId)?.name
            const description = meta?.quickAction 
              ? `Quick: ${meta.quickAction.replace(/-/g, ' ')}` 
              : taskName 
              ? taskName
              : e.eventType.replace(/_/g, ' ').toLowerCase()
            
            return (
              <div key={e.id} className="event-row">
                <div className="event-time">{new Date(e.occurredAt).toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit'})}</div>
                <div className="event-desc">
                  {description} — {e.recordedByName || e.recordedById}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="journal">
        <h3>Journal</h3>
        <input type="date" />
      </section>

      <div className="bottom-nav">
        <div style={{cursor:'pointer'}} onClick={()=>setActiveTab('Today')}>🏠 Today</div>
        <div style={{cursor:'pointer'}} onClick={()=>{ window.location.href = '/add' }}>➕ Add</div>
        <div style={{cursor:'pointer'}} onClick={()=>{ window.location.href = '/leaderboard' }}>🏆 Leaderboard</div>
      </div>
    </div>
  )
}
