'use client'
import React, { useState } from 'react'

export default function BugReporter(){
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(){
    if (!title || !description) { setMsg('Please provide title and description'); return }
    setLoading(true)
    try{
      const res = await fetch('/api/bugs',{ method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ title, description, reportedBy: 'interactive' }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'failed')
      setMsg('Reported — thanks!')
      setTitle('')
      setDescription('')
      setOpen(false)
    }catch(e){
      const msg = e && typeof e === 'object' && 'message' in e ? (e as any).message : String(e)
      setMsg('Failed to submit: '+msg)
    }finally{ setLoading(false) }
  }

  return (
    <div style={{position:'fixed',right:12,bottom:12,zIndex:9999}}>
      <button onClick={()=>setOpen(true)} style={{background:'#ef4444',color:'#fff',padding:'10px 12px',borderRadius:8,border:'none'}}>Report Bug</button>
      {open && (
        <div style={{width:320,background:'#fff',boxShadow:'0 6px 18px rgba(0,0,0,0.12)',padding:12,borderRadius:8,marginTop:8}}>
          <h4 style={{margin:0,marginBottom:8}}>Report a bug</h4>
          <input placeholder="Short title" value={title} onChange={e=>setTitle(e.target.value)} style={{width:'100%',padding:8,marginBottom:8}} />
          <textarea placeholder="Describe the problem and how you'd like it fixed" value={description} onChange={e=>setDescription(e.target.value)} style={{width:'100%',padding:8,height:100}} />
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
            <div style={{color:'#666'}}>{msg}</div>
            <div>
              <button onClick={()=>{setOpen(false); setMsg('')}} style={{marginRight:8}}>Cancel</button>
              <button onClick={submit} disabled={loading} style={{background:'#2563eb',color:'#fff',padding:'8px 10px',borderRadius:6,border:'none'}}>{loading? 'Submitting...' : 'Submit'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
