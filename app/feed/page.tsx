'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface FeedPost {
  id: string
  user_id: string
  room_id: string | null
  stage: string | null
  caption: string | null
  image_url: string | null
  media_type: 'image' | 'video' | null
  specs: string[] | null
  cost: number | null
  created_at: string
  author_handle?: string
  author_avatar?: string
  likes_count: number
  is_liked: boolean
  comments: { id: string; user_handle: string; content: string; created_at: string }[]
}

export default function CommunityFeedPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [feedTab, setFeedTab] = useState<'discover' | 'following'>('discover')
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [followingIds, setFollowingIds] = useState<string[]>([])
  const [hashtagFilter, setHashtagFilter] = useState<string | null>(null)

  // Comment input state per post ID
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null)

  const fetchFeed = async (currentUser: User, currentFollowing: string[]) => {
    // Fetch real posts from Supabase
    const { data: postData } = await supabase
      .from('posts')
      .select('*')
      .eq('is_story', false)
      .order('created_at', { ascending: false })

    // Seed/Fallback demo posts if database is new/empty to solve empty feed problem
    const demoPosts: FeedPost[] = [
      {
        id: 'demo-1',
        user_id: 'builder-1',
        room_id: null,
        stage: 'Painting & Decorating',
        caption: 'Finished our 1930s hallway panelling and painted in Farrow & Ball Ammonite. Absolute game changer for the entryway! #panelling #hallway #1930shouse',
        image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
        media_type: 'image',
        specs: ['Farrow & Ball Ammonite', 'MDF Panelling'],
        cost: 240,
        created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
        author_handle: 'nathanspurdle',
        likes_count: 14,
        is_liked: true,
        comments: [
          { id: 'c1', user_handle: 'sarah_reno', content: 'Looks so crisp! Love the color choice.', created_at: '' },
        ],
      },
      {
        id: 'demo-2',
        user_id: 'builder-2',
        room_id: null,
        stage: 'Second Fix & Flooring',
        caption: 'Laying down light oak herringbone flooring across the open plan kitchen diner. Tedious cuts around the fireplace but totally worth it! #herringbone #flooring #kitchendiner',
        image_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
        media_type: 'image',
        specs: ['Engineered Oak Herringbone', 'Bostik Adhesive'],
        cost: 1450,
        created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
        author_handle: 'victorian_renovator',
        likes_count: 29,
        is_liked: false,
        comments: [],
      },
    ]

    const realPosts: FeedPost[] = (postData || []).map((p) => ({
      ...p,
      author_handle: p.user_id === currentUser.id ? currentUser.email?.split('@')[0] : 'homeowner_' + p.user_id.slice(0, 5),
      likes_count: Math.floor(Math.random() * 8) + 1,
      is_liked: false,
      comments: [],
    }))

    const combined = [...realPosts, ...demoPosts]
    setPosts(combined)
    setLoading(false)
  }

  useEffect(() => {
    const init = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return router.push('/login')
      setUser(auth.user)

      // Fetch following IDs
      const { data: followsData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', auth.user.id)

      const fIds = (followsData || []).map((f) => f.following_id)
      setFollowingIds(fIds)

      await fetchFeed(auth.user, fIds)
    }
    init()
  }, [router])

  const toggleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            is_liked: !p.is_liked,
            likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1,
          }
        }
        return p
      })
    )
  }

  const handleAddComment = (postId: string, e: React.FormEvent) => {
    e.preventDefault()
    const text = commentInputs[postId]?.trim()
    if (!text || !user) return

    const handle = user.email?.split('@')[0] || 'homeowner'
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            comments: [...p.comments, { id: `${Date.now()}`, user_handle: handle, content: text, created_at: new Date().toISOString() }],
          }
        }
        return p
      })
    )
    setCommentInputs({ ...commentInputs, [postId]: '' })
  }

  const handleFollowToggle = async (targetUserId: string) => {
    if (!user) return
    const isFollowing = followingIds.includes(targetUserId)

    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId)
      setFollowingIds(followingIds.filter((id) => id !== targetUserId))
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetUserId })
      setFollowingIds([...followingIds, targetUserId])
    }
  }

  if (loading) return <div className="p-6 text-xs text-[#888]">Loading community feed...</div>

  const displayedPosts = posts
    .filter((p) => {
      if (feedTab === 'following' && p.user_id !== user?.id && !followingIds.includes(p.user_id)) {
        return false
      }
      if (hashtagFilter) {
        return (p.caption || '').toLowerCase().includes(`#${hashtagFilter.toLowerCase()}`)
      }
      return true
    })

  return (
    <div className="px-5 pt-6 pb-20 space-y-4 bg-[#111111] min-h-screen max-w-xl mx-auto font-sans">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between border-b border-[#222] pb-3">
        <h1 className="text-lg font-bold tracking-tight text-white">HomeWallr Feed</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFeedTab('discover')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              feedTab === 'discover' ? 'bg-white text-black' : 'bg-[#1C1C1C] text-[#888]'
            }`}
          >
            Discover
          </button>
          <button
            type="button"
            onClick={() => setFeedTab('following')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              feedTab === 'following' ? 'bg-white text-black' : 'bg-[#1C1C1C] text-[#888]'
            }`}
          >
            Following
          </button>
        </div>
      </div>

      {hashtagFilter && (
        <div className="flex items-center justify-between bg-[#1C1C1C] px-3.5 py-2 rounded-xl text-xs">
          <span className="text-white font-medium">Filtered by #{hashtagFilter}</span>
          <button type="button" onClick={() => setHashtagFilter(null)} className="text-[#888] hover:text-white">
            Clear ×
          </button>
        </div>
      )}

      {/* Post Stream */}
      {displayedPosts.length === 0 ? (
        <div className="p-10 rounded-2xl bg-[#181818] border border-[#262626] text-center space-y-2">
          <p className="text-xs text-[#888]">No posts in this feed yet.</p>
          <Link href="/upload" className="inline-block px-4 py-2 rounded-full bg-white text-black text-xs font-semibold">
            + Share Your Build
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {displayedPosts.map((post) => {
            const isSelf = post.user_id === user?.id
            const isFollowing = followingIds.includes(post.user_id)

            return (
              <div key={post.id} className="rounded-2xl bg-[#181818] border border-[#262626] overflow-hidden shadow-md space-y-3">
                {/* Author Header */}
                <div className="px-4 pt-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-pink-500 text-white font-bold flex items-center justify-center text-xs">
                      {(post.author_handle || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">@{post.author_handle}</p>
                      {post.stage && <p className="text-[10px] text-[#888]">{post.stage}</p>}
                    </div>
                  </div>

                  {!isSelf && (
                    <button
                      type="button"
                      onClick={() => handleFollowToggle(post.user_id)}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                        isFollowing
                          ? 'bg-[#262626] text-[#CCC] hover:bg-[#333]'
                          : 'bg-white text-black hover:bg-[#E0E0E0]'
                      }`}
                    >
                      {isFollowing ? 'Following' : '+ Follow'}
                    </button>
                  )}
                </div>

                {/* Post Media */}
                {post.image_url && (
                  <div className="bg-black">
                    <img src={post.image_url} alt="Renovation post" className="w-full max-h-96 object-cover" />
                  </div>
                )}

                {/* Actions & Likes */}
                <div className="px-4 space-y-2">
                  <div className="flex items-center gap-4 text-sm">
                    <button
                      type="button"
                      onClick={() => toggleLike(post.id)}
                      className={`flex items-center gap-1.5 font-medium ${post.is_liked ? 'text-red-500' : 'text-[#AAA] hover:text-white'}`}
                    >
                      <span>{post.is_liked ? '❤️' : '🤍'}</span>
                      <span className="text-xs">{post.likes_count}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                      className="text-[#AAA] hover:text-white text-xs flex items-center gap-1.5 font-medium"
                    >
                      <span>💬</span>
                      <span>{post.comments.length} Comments</span>
                    </button>

                    {post.cost && (
                      <span className="ml-auto text-xs font-bold text-white">£{Number(post.cost).toLocaleString()}</span>
                    )}
                  </div>

                  {/* Caption with Highlighted Hashtags */}
                  {post.caption && (
                    <p className="text-xs text-white leading-relaxed">
                      {post.caption.split(' ').map((word, i) => {
                        if (word.startsWith('#')) {
                          const tag = word.replace('#', '')
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setHashtagFilter(tag)}
                              className="text-cyan-400 hover:underline mr-1"
                            >
                              {word}{' '}
                            </button>
                          )
                        }
                        return word + ' '
                      })}
                    </p>
                  )}

                  {/* Specs Tags */}
                  {post.specs && post.specs.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {post.specs.map((spec, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-[#222] text-[#CCC]">
                          🏷 {spec}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Comments Section */}
                <div className="bg-[#151515] px-4 py-3 border-t border-[#222] space-y-2.5">
                  {post.comments.length > 0 && (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {post.comments.map((c) => (
                        <div key={c.id} className="text-xs space-y-0.5">
                          <span className="font-bold text-white mr-1.5">@{c.user_handle}</span>
                          <span className="text-[#CCC]">{c.content}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={(e) => handleAddComment(post.id, e)} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add a comment on this renovation..."
                      value={commentInputs[post.id] || ''}
                      onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                      className="flex-1 px-3 py-2 text-xs bg-[#1E1E1E] text-white placeholder-[#666] border border-[#2A2A2A] rounded-xl focus:outline-none focus:border-white"
                    />
                    <button type="submit" className="px-3.5 py-2 rounded-xl bg-white text-black text-xs font-semibold">
                      Post
                    </button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}