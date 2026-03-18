'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/language-context'
import { t } from '@/lib/i18n'
import LanguageToggle from '@/components/LanguageToggle'

type User = {
  id: string
  name: string | null
  email: string
  role: string
  householdId: string | null
  createdAt: string
}

export default function UsersPage(){
  const { data: session, update: updateSession } = useSession()
  const router = useRouter()
  const { lang } = useLang()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setLoading(false)
    }
  }

  async function updateUser(userId: string, updates: Partial<User>) {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, ...updates })
      })
      
      if (!res.ok) throw new Error('Failed to update user')

      // Refresh session so updated name/role is reflected immediately
      await updateSession()
      await loadUsers()
      setShowEditModal(false)
      setEditingUser(null)
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  async function removeUser(userId: string) {
    if (!confirm(t(lang, 'removeConfirm'))) return
    
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, householdId: null })
      })
      
      if (!res.ok) throw new Error('Failed to remove user')
      await loadUsers()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  async function generateInvite() {
    setInviteLoading(true)
    try {
      const householdId = (session?.user as any)?.householdId
      if (!householdId) throw new Error('No household found')
      
      const res = await fetch('/api/households', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'generateInvite',
          householdId,
          email: inviteEmail || undefined
        })
      })
      
      if (!res.ok) throw new Error('Failed to generate invite')
      const data = await res.json()
      setInviteCode(data.code)
      setInviteEmail('')
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setInviteLoading(false)
    }
  }

  function openEditModal(user: User) {
    setEditingUser(user)
    setShowEditModal(true)
  }

  const isAdmin = (session?.user as any)?.role === 'ADMIN'
  const isManager = isAdmin || (session?.user as any)?.role === 'MANAGER'

  return (
    <div style={{ 
      padding: 'clamp(12px, 3vw, 24px)', 
      maxWidth: '1000px', 
      margin: '0 auto', 
      fontFamily: 'system-ui' 
    }}>
      <div style={{ marginBottom: 'clamp(16px, 4vw, 32px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => router.back()}
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
            {t(lang, 'back')}
          </button>
          <LanguageToggle />
          {isManager && (
            <button
              onClick={() => setShowInviteModal(true)}
              style={{
                padding: '10px 16px',
                background: '#667eea',
                border: 'none',
                borderRadius: '8px',
                fontSize: 'clamp(13px, 3.5vw, 14px)',
                fontWeight: '600',
                cursor: 'pointer',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minHeight: '40px',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {t(lang, 'inviteMember')}
            </button>
          )}
        </div>
        <h1 style={{
          fontSize: 'clamp(24px, 6vw, 36px)',
          fontWeight: '800',
          margin: '0 0 8px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {t(lang, 'teamMembers')}
        </h1>
        <p style={{ color: '#666', margin: 0, fontSize: 'clamp(13px, 3.5vw, 16px)' }}>{t(lang, 'manageMembers')}</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'clamp(40px, 10vw, 60px) 0', color: '#666' }}>
          <div style={{ fontSize: 'clamp(36px, 10vw, 48px)', marginBottom: '16px' }}>⏳</div>
          <div style={{ fontSize: 'clamp(14px, 3.5vw, 16px)' }}>{t(lang, 'loading')}</div>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', 
          gap: 'clamp(12px, 3vw, 20px)' 
        }}>
          {users.map(user => {
            const isCurrentUser = (session?.user as any)?.id === user.id
            
            return (
              <div 
                key={user.id}
                style={{
                  background: 'white',
                  border: isCurrentUser ? '3px solid #667eea' : '2px solid #E5E7EB',
                  borderRadius: '16px',
                  padding: 'clamp(16px, 4vw, 24px)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  position: 'relative',
                  WebkitTapHighlightColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'
                }}
              >
                {isCurrentUser && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: '#667eea',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700'
                  }}>
                    {t(lang, 'youBadge')}
                  </div>
                )}

                {/* Avatar */}
                <div style={{
                  width: 'clamp(64px, 16vw, 80px)',
                  height: 'clamp(64px, 16vw, 80px)',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${getGradientColors(user.name || user.email)})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'clamp(28px, 7vw, 36px)',
                  fontWeight: '700',
                  color: 'white',
                  margin: '0 auto clamp(12px, 3vw, 16px)'
                }}>
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </div>

                {/* User Info */}
                <div style={{ textAlign: 'center', marginBottom: 'clamp(12px, 3vw, 16px)' }}>
                  <div style={{
                    fontSize: 'clamp(16px, 4vw, 20px)',
                    fontWeight: '700',
                    marginBottom: '4px',
                    wordBreak: 'break-word'
                  }}>
                    {user.name || t(lang, 'unnamed')}
                  </div>
                  <div style={{ 
                    fontSize: 'clamp(12px, 3vw, 14px)', 
                    color: '#666',
                    marginBottom: '8px',
                    wordBreak: 'break-all'
                  }}>
                    {user.email}
                  </div>
                  
                  {/* Role Badge */}
                  <div style={{
                    display: 'inline-block',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    fontSize: 'clamp(10px, 2.5vw, 12px)',
                    fontWeight: '700',
                    background: user.role === 'ADMIN' ? '#FEF3C7' : user.role === 'MANAGER' ? '#E0E7FF' : '#DBEAFE',
                    color: user.role === 'ADMIN' ? '#92400E' : user.role === 'MANAGER' ? '#3730A3' : '#1E40AF'
                  }}>
                    {user.role === 'ADMIN' ? t(lang, 'roleAdmin') : user.role === 'MANAGER' ? t(lang, 'roleManager') : t(lang, 'roleMember')}
                  </div>
                </div>

                {/* Member Since */}
                <div style={{
                  fontSize: 'clamp(11px, 2.5vw, 12px)',
                  color: '#999',
                  textAlign: 'center',
                  marginBottom: 'clamp(12px, 3vw, 16px)',
                  paddingTop: 'clamp(10px, 2.5vw, 12px)',
                  borderTop: '1px solid #E5E7EB'
                }}>
                  {t(lang, 'memberSince')} {new Date(user.createdAt).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </div>

                {/* Actions */}
                {isManager && (
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px',
                    justifyContent: 'center'
                  }}>
                    <button
                      onClick={() => openEditModal(user)}
                      style={{
                        flex: 1,
                        minHeight: '44px',
                        padding: 'clamp(8px, 2vw, 10px)',
                        background: '#F3F4F6',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: 'clamp(12px, 3vw, 14px)',
                        fontWeight: '600',
                        cursor: 'pointer',
                        color: '#374151',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                    >
                      {t(lang, 'edit')}
                    </button>
                    {!isCurrentUser && (
                      <button
                        onClick={() => removeUser(user.id)}
                        style={{
                          flex: 1,
                          minHeight: '44px',
                          padding: 'clamp(8px, 2vw, 10px)',
                          background: '#FEE2E2',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: 'clamp(12px, 3vw, 14px)',
                          fontWeight: '600',
                          cursor: 'pointer',
                          color: '#991B1B',
                          WebkitTapHighlightColor: 'transparent'
                        }}
                      >
                        {t(lang, 'remove')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: 'clamp(16px, 4vw, 32px)',
            maxWidth: '500px',
            width: '90%',
            margin: '16px'
          }}>
            <h2 style={{ margin: '0 0 clamp(16px, 4vw, 24px)', fontSize: 'clamp(18px, 4.5vw, 24px)', fontWeight: '700' }}>
              {t(lang, 'editUser')}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  {t(lang, 'nameLabel')}
                </label>
                <input
                  type="text"
                  value={editingUser.name || ''}
                  onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                  placeholder="Enter user name"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  {t(lang, 'roleLabel')}
                </label>
                <select
                  value={editingUser.role}
                  onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                >
                  <option value="MEMBER">{t(lang, 'roleMember')}</option>
                  <option value="MANAGER">{t(lang, 'roleManager')}</option>
                  <option value="ADMIN">{t(lang, 'roleAdmin')}</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => updateUser(editingUser.id, { 
                  name: editingUser.name, 
                  role: editingUser.role 
                })}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {t(lang, 'saveChanges')}
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingUser(null)
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {t(lang, 'cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: 'clamp(16px, 4vw, 32px)',
            maxWidth: '500px',
            width: '90%',
            margin: '16px'
          }}>
            <h2 style={{ margin: '0 0 clamp(16px, 4vw, 24px)', fontSize: 'clamp(18px, 4.5vw, 24px)', fontWeight: '700' }}>
              {t(lang, 'inviteNewMember')}
            </h2>

            {!inviteCode ? (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                    {t(lang, 'emailOptional')}
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                    placeholder="member@example.com"
                  />
                  <p style={{ fontSize: '12px', color: '#666', margin: '8px 0 0' }}>
                    {t(lang, 'emailOptionalNote')}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button
                    onClick={generateInvite}
                    disabled={inviteLoading}
                    style={{
                      flex: 1,
                      padding: '14px',
                      background: inviteLoading ? '#9CA3AF' : '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: inviteLoading ? 'not-allowed' : 'pointer',
                      minHeight: '48px'
                    }}
                  >
                    {inviteLoading ? t(lang, 'generating') : t(lang, 'generateInviteCode')}
                  </button>
                  <button
                    onClick={() => {
                      setShowInviteModal(false)
                      setInviteEmail('')
                    }}
                    style={{
                      flex: 1,
                      padding: '14px',
                      background: '#F3F4F6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      minHeight: '48px'
                    }}
                  >
                    {t(lang, 'cancel')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  background: '#F0FDF4',
                  border: '2px solid #10B981',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '14px', color: '#059669', marginBottom: '12px', fontWeight: '600' }}>
                    {t(lang, 'inviteCodeGenerated')}
                  </div>
                  <div style={{
                    background: 'white',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '20px',
                    fontWeight: '700',
                    textAlign: 'center',
                    color: '#667eea',
                    fontFamily: 'monospace',
                    letterSpacing: '2px'
                  }}>
                    {inviteCode}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteCode)
                      alert(t(lang, 'codeCopied'))
                    }}
                    style={{
                      width: '100%',
                      marginTop: '12px',
                      padding: '10px',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {t(lang, 'copyCode')}
                  </button>
                </div>

                <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
                  {t(lang, 'shareCode')}
                </p>

                <button
                  onClick={() => {
                    setShowInviteModal(false)
                    setInviteCode('')
                    setInviteEmail('')
                  }}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: '#F3F4F6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {t(lang, 'close')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
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
