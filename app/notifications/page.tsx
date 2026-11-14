'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface NotificationItem {
  id: string
  actor_id: string | null
  actor_handle: string | null
  type: 'follow' | 'like' | 'comment' | 'accept_follow'
  content?: string | null
  content_preview?: string | null
  created_at: string
  post_id: string | null
  posts?: {
    id: string
    image_url: string | null
    caption: string | null
    media_type: 'image' | 'video' | null
    stage: string | null
    cost: number | null
  } | null
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<any | null>(null)

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('notifications')
        .select(`
          *,
          posts (
            id,
            image_url,
            caption,
            media_type,
            stage,
            cost
          )
        `)
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
              const handle = notif.actor_handle || 'user'

              return (
                <div
                  key={notif.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#1A1A1A] border border-[#262626] gap-3 shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#222] border border-[#333] text-white flex items-center justify-center text-sm shrink-0">
                      {icon}
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs text-white leading-snug truncate">
                        <Link href={`/profile/${notif.actor_id}`} className="font-bold hover:underline">
                          @{handle}
                        </Link>{' '}
                        <span className="text-[#CCC]">
                          {notif.type === 'follow' && 'started following your house passport.'}
                          {notif.type === 'accept_follow' && 'accepted your follow request.'}
                          {notif.type === 'like' && 'liked your post.'}
                          {notif.type === 'comment' && (
                            <span>
                              commented:{' '}
                              <span className="text-white italic">
                                &ldquo;{notif.content || notif.content_preview || 'Left a comment'}&rdquo;
                              </span>
                            </span>
                          )}
                        </span>
                      </p>
                      <p className="text-[10px] text-[#777]">
                        {new Date(notif.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="shrink-0">
                    {notif.posts ? (
                      <button
                        type="button"
                        onClick={() => setSelectedPost(notif.posts)}
                        className="px-3.5 py-1.5 rounded-full bg-white text-black text-xs font-semibold shrink-0 hover:bg-neutral-200 transition-colors cursor-pointer"
                      >
                        View Post
                      </button>
                    ) : notif.actor_id ? (
                      <Link
                        href={`/profile/${notif.actor_id}`}
                        className="px-3.5 py-1.5 rounded-full bg-white text-black text-xs font-semibold shrink-0 hover:bg-neutral-200 transition-colors inline-block"
                      >
                        View Profile
                      </Link>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* Post Preview Lightbox Modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#181818] border border-[#262626] overflow-hidden shadow-2xl space-y-3 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <div>
                <p className="text-xs font-bold text-white">{selectedPost.stage || 'Renovation Update'}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="w-7 h-7 rounded-full bg-[#262626] text-white flex items-center justify-center text-sm"
              >
                ×
              </button>
            </div>

            {selectedPost.image_url && (
              <div className="bg-black rounded-xl overflow-hidden flex items-center justify-center max-h-[50vh]">
                {selectedPost.media_type === 'video' ? (
                  <video src={selectedPost.image_url} controls autoPlay playsInline className="w-full max-h-[50vh] object-contain" />
                ) : (
                  <img src={selectedPost.image_url} alt="" className="w-full max-h-[50vh] object-contain mx-auto" />
                )}
              </div>
            )}

            {selectedPost.caption && (
              <p className="text-xs text-[#DDD] leading-relaxed pt-1">{selectedPost.caption}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}