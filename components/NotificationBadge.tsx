'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

export default function NotificationBadge() {
  const { data: session } = useSession()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!session?.user) return
    
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications')
        if (res.ok) {
          const data = await res.json()
          setCount(data?.notifications?.length || 0)
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err)
      }
    }

    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [session])

  if (!session?.user || count === 0) return null

  return (
    <div className="notification-badge" style={{
      position: 'relative',
      display: 'inline-block',
      marginLeft: 12
    }}>
      <span style={{
        background: '#ef4444',
        color: 'white',
        borderRadius: '50%',
        padding: '2px 6px',
        fontSize: 12,
        fontWeight: 'bold'
      }}>
        {count}
      </span>
    </div>
  )
}
