'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface NotificationItem {
  id: string
  type: 'like' | 'comment' | 'follow' | 'accept_follow'
  actor_handle: string
  actor_avatar?: string
  content_preview?: string
  created_at: string
}

export default function NotificationsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initNotifications = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return router.push('/login')
      setUser(auth.user)

      // Fetch actual followers to generate real "new follower" notifications
      const { data: followers } = await supabase
        .from('follows')
        .select('follower_id, created_at')
        .eq('following_id', auth.user.id)
        .order('created_at', { ascending: false })

      const followerNotifs: NotificationItem[] = (followers || []).map((f, i) => ({
        id: `follow-${f.follower_id}-${i}`,
        type: 'follow',
        actor_handle: 'homeowner_' + f.follower_id.slice(0, 5),
        created_at: f.created_at,
      }))

      // Curated / demo social activity items to ensure the activity feed feels lively
      const demoNotifs: NotificationItem[] = [
        {
          id: 'n-1',
          type: 'like',
          actor_handle: 'sarah_reno',
          content_preview: 'liked your post about 1930s hallway panelling',
          created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
        {
          id: 'n-2',
          type: 'comment',
          actor_handle: 'victorian_renovator',
          content_preview: 'commented: "Looks so crisp! What paint finish is that?"',
          created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
        },
        {
          id: 'n-3',
          type: 'accept_follow',
          actor_handle: 'pandy_builds',
          content_preview: 'accepted your follow request.',
          created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        },
      ]

      setNotifications([...followerNotifs, ...demoNotifs])
      setLoading(false)
    }

    initNotifications()
  }, [router])

  if (loading) return <div className="p-6 text-xs text-[#888]">Loading activity...</div>

  return (
    <div className="px-5 pt-6 pb-20 space-y-4 bg-[#111111] min-h-screen max-w-xl mx-auto font-sans">
      <div className="space-y-1 border-b border-[#222] pb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#888]">
          Activity
        </p>
        <h1 className="text-lg font-bold text-white">Notifications</h1>
      </div>

      {notifications.length === 0 ? (
        <div className="p-10 rounded-2xl bg-[#181818] border border-[#262626] text-center space-y-2">
          <p className="text-xs text-[#888]">No activity yet. When builders follow you or interact with your posts, it will show up here.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((notif) => {
            let icon = '💬'
            if (notif.type === 'like') icon = '❤️'
            if (notif.type === 'follow') icon = '👤'
            if (notif.type === 'accept_follow') icon = '✨'

            return (
              <div
                key={notif.id}
                className="p-4 rounded-2xl bg-[#181818] border border-[#262626] flex items-center justify-between gap-3 shadow-sm hover:border-[#333] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#222] border border-[#333] text-white flex items-center justify-center text-sm shrink-0">
                    {icon}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-white leading-snug">
                      <strong className="font-bold">@{notif.actor_handle}</strong>{' '}
                      <span className="text-[#CCC]">
                        {notif.type === 'follow' && 'started following your house passport.'}
                        {notif.type === 'like' && notif.content_preview}
                        {notif.type === 'comment' && notif.content_preview}
                        {notif.type === 'accept_follow' && notif.content_preview}
                      </span>
                    </p>
                    <p className="text-[10px] text-[#777]">Recent activity</p>
                  </div>
                </div>

                {notif.type === 'follow' && (
                  <Link
                    href="/profile"
                    className="px-3.5 py-1.5 rounded-full bg-white text-black text-xs font-semibold shrink-0"
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
  )
}