'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface CommentItem {
  id: string
  user_handle: string
  content: string
  created_at: string
}

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
  is_saved: boolean
  comments: CommentItem[]
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

  const fetchFeed = async (currentUser: User) => {
    // Fetch real posts from Supabase
    const { data: postData } = await supabase
      .from('posts')
      .select('*')
      .eq('is_story', false)
      .order('created_at', { ascending: false })

    const realPosts: FeedPost[] = await Promise.all(
      (postData || []).map(async (p) => {
        // Fetch author house handle & avatar
        const { data: houseData } = await supabase
          .from('houses')
          .select('handle, avatar_url')
          .eq('user_id', p.user_id)
          .maybeSingle()

        const authorHandle = houseData?.handle || (p.user_id === currentUser.id ? currentUser.email?.split('@')[0] : 'homeowner')
        const authorAvatar = houseData?.avatar_url || undefined

        // Fetch likes count & user like status
        const { count: likesCount } = await supabase
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', p.id)

        const { data: userLike } = await supabase
          .from('post_likes')
          .select('id')
          .eq('post_id', p.id)
          .eq('user_id', currentUser.id)
          .maybeSingle()

        // Fetch user save status
        const { data: userSave } = await supabase
          .from('saved_posts')
          .select('id')
          .eq('post_id', p.id)
          .eq('user_id', currentUser.id)
          .maybeSingle()

        // Fetch comments
        const { data: commentsData } = await supabase
          .from('post_comments')
          .select('*')
          .eq('post_id', p.id)
          .order('created_at', { ascending: true })

        return {
          ...p,
          author_handle: authorHandle,
          author_avatar: authorAvatar,
          likes_count: likesCount || 0,
          is_liked: !!userLike,
          is_saved: !!userSave,
          comments: commentsData || [],
        }
      })
    )

    setPosts(realPosts)
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
        .eq('status', 'accepted')

      const fIds = (followsData || []).map((f) => f.following_id)
      setFollowingIds(fIds)

      await fetchFeed(auth.user)
    }
    init()
  }, [router])

  const toggleLike = async (postId: string, postOwnerId: string) => {
    if (!user) return
    const post = posts.find((p) => p.id === postId)
    if (!post) return

    const isCurrentlyLiked = post.is_liked
    const newLikedState = !isCurrentlyLiked
    const newCount = Math.max(0, post.likes_count + (newLikedState ? 1 : -1))

    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, is_liked: newLikedState, likes_count: newCount } : p))
    )

    if (newLikedState) {
      const { error } = await supabase.from('post_likes').insert([{ post_id: postId, user_id: user.id }])
      if (error) console.error('Error liking post:', error.message)

      // Send notification if liking someone else's post
      if (postOwnerId !== user.id) {
        await supabase.from('notifications').insert([
          {
            user_id: postOwnerId,
            actor_id: user.id,
            actor_handle: post.author_handle,
            type: 'like',
            post_id: postId,
          },
        ])
      }
    } else {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
    }
  }

  const toggleSave = async (postId: string) => {
    if (!user) return
    const post = posts.find((p) => p.id === postId)
    if (!post) return

    const isCurrentlySaved = post.is_saved
    const newSavedState = !isCurrentlySaved

    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, is_saved: newSavedState } : p))
    )

    if (newSavedState) {
      await supabase.from('saved_posts').insert([{ post_id: postId, user_id: user.id }])
    } else {
      await supabase.from('saved_posts').delete().eq('post_id', postId).eq('user_id', user.id)
    }
  }

  const handleAddComment = async (postId: string, postOwnerId: string, e: React.FormEvent) => {
    e.preventDefault()
    const text = commentInputs[postId]?.trim()
    if (!text || !user) return

    // Fetch current user handle
    const { data: myHouse } = await supabase
      .from('houses')
      .select('handle')
      .eq('user_id', user.id)
      .maybeSingle()

    const handle = myHouse?.handle || user.email?.split('@')[0] || 'homeowner'

    const { data, error } = await supabase
      .from('post_comments')
      .insert([
        {
          post_id: postId,
          user_id: user.id,
          user_handle: handle,
          content: text,
        },
      ])
      .select()
      .single()

    if (error) {
      alert('Error posting comment: ' + error.message)
      return
    }

    if (data) {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              comments: [...p.comments, data],
            }
          }
          return p
        })
      )
      setCommentInputs({ ...commentInputs, [postId]: '' })

      // Send notification if commenting on someone else's post
      if (postOwnerId !== user.id) {
        await supabase.from('notifications').insert([
          {
            user_id: postOwnerId,
            actor_id: user.id,
            actor_handle: handle,
            type: 'comment',
            post_id: postId,
          },
        ])
      }
    }
  }

  const handleFollowToggle = async (targetUserId: string) => {
    if (!user) return
    const isFollowing = followingIds.includes(targetUserId)

    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId)
      setFollowingIds(followingIds.filter((id) => id !== targetUserId))
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetUserId, status: 'accepted' })
      setFollowingIds([...followingIds, targetUserId])
    }
  }

  if (loading) return <div className="p-6 text-xs text-[#888] bg-[#111] min-h-screen">Loading community feed...</div>

  const displayedPosts = posts.filter((p) => {
    if (feedTab === 'following' && p.user_id !== user?.id && !followingIds.includes(p.user_id)) {
      return false
    }
    if (hashtagFilter) {
      return (p.caption || '').toLowerCase().includes(`#${hashtagFilter.toLowerCase()}`)
    }
    return true
  })

  return (
    <div className="px-5 pt-6 pb-20 space-y-4 bg-[#111111] min-h-screen max-w-xl mx-auto font-sans text-[#EDEDED]">
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
                    {post.author_avatar ? (
                      <img src={post.author_avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-[#262626]" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-pink-500 text-white font-bold flex items-center justify-center text-xs">
                        {(post.author_handle || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <Link href={`/profile/${post.user_id}`} className="text-xs font-bold text-white hover:underline">
                        @{post.author_handle}
                      </Link>
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
                    {post.media_type === 'video' ? (
                      <video src={post.image_url} controls playsInline className="w-full max-h-96 object-cover" />
                    ) : (
                      <img src={post.image_url} alt="Renovation post" className="w-full max-h-96 object-cover" />
                    )}
                  </div>
                )}

                {/* Actions & Likes */}
                <div className="px-4 space-y-2">
                  <div className="flex items-center gap-4 text-sm">
                    <button
                      type="button"
                      onClick={() => toggleLike(post.id, post.user_id)}
                      className={`flex items-center gap-1.5 font-medium cursor-pointer ${post.is_liked ? 'text-red-500' : 'text-[#AAA] hover:text-white'}`}
                    >
                      <span>{post.is_liked ? '❤️' : '🤍'}</span>
                      <span className="text-xs">{post.likes_count}</span>
                    </button>

                    <span className="text-xs text-[#AAA]">💬 {post.comments.length} Comments</span>

                    <button
                      type="button"
                      onClick={() => toggleSave(post.id)}
                      className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
                        post.is_saved
                          ? 'bg-cyan-500 text-black border-cyan-400'
                          : 'bg-[#222] text-[#CCC] border-[#333] hover:text-white'
                      }`}
                    >
                      {post.is_saved ? '🔖 Saved' : '📌 Save Post'}
                    </button>

                    {post.cost && (
                      <span className="text-xs font-bold text-white">£{Number(post.cost).toLocaleString()}</span>
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

                  <form onSubmit={(e) => handleAddComment(post.id, post.user_id, e)} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add a comment on this renovation..."
                      value={commentInputs[post.id] || ''}
                      onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                      className="flex-1 px-3 py-2 text-xs bg-[#1E1E1E] text-white placeholder-[#666] border border-[#2A2A2A] rounded-xl focus:outline-none focus:border-white"
                    />
                    <button type="submit" className="px-3.5 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-[#E0E0E0]">
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