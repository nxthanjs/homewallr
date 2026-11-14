'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface NotificationItem {
  id: string
  actor_id: string | null
  actor_handle: string | null
  type: 'follow' | 'like' | 'comment' | 'accept_follow'
  content_preview?: string | null
  created_at: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (data) {
        setNotifications(data)
      }
      setLoading(false)
    }

    fetchNotifications()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111] text-[#EDEDED] font-sans flex items-center justify-center">
        <p className="text-xs text-[#888]">Loading activity...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#111] text-[#EDEDED] font-sans pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#222] pb-3">
          <h1 className="text-lg font-bold text-white tracking-tight">Activity</h1>
          <Link href="/feed" className="text-xs font-medium text-[#888] hover:text-white">
            ← Back to Feed
          </Link>
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-xs text-[#777]">
            No notifications yet.
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => {
              const icon = notif.type === 'follow' ? '👤' : notif.type === 'like' ? '❤️' : '💬'

              return (
                <div
                  key={notif.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#1A1A1A] border border-[#262626]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#222] border border-[#333] text-white flex items-center justify-center text-sm shrink-0">
                      {icon}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-white leading-snug">
                        <Link href={`/profile/${notif.actor_id}`} className="font-bold hover:underline">
                          @{notif.actor_handle || 'user'}
                        </Link>{' '}
                        <span className="text-[#CCC]">
                          {notif.type === 'follow' && 'now follows you.'}
                          {notif.type === 'like' && notif.content_preview}
                          {notif.type === 'comment' && notif.content_preview}
                          {notif.type === 'accept_follow' && notif.content_preview}
                        </span>
                      </p>
                      <p className="text-[10px] text-[#777]">Recent activity</p>
                    </div>
                  </div>

                  {notif.actor_id && (
                    <Link
                      href={`/profile/${notif.actor_id}`}
                      className="px-3.5 py-1.5 rounded-full bg-white text-black text-xs font-semibold shrink-0 hover:bg-neutral-200 transition-colors"
                    >
                      View
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}