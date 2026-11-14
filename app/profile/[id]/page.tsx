'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { PinnedProduct } from '@/app/profile/page'

interface RoomCollection {
  id: string
  name: string
  floor_level: string | null
  status: string
  progress: number
}

interface CommentItem {
  id: string
  user_handle: string
  content: string
  created_at: string
}

interface GridPost {
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
  likes_count?: number
  is_liked?: boolean
  is_saved?: boolean
  comments?: CommentItem[]
}

function UserProfileContent() {
  const params = useParams()
  const router = useRouter()
  const targetUserId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [house, setHouse] = useState<any>(null)
  const [rooms, setRooms] = useState<RoomCollection[]>([])
  const [posts, setPosts] = useState<GridPost[]>([])
  const [pinnedProducts, setPinnedProducts] = useState<PinnedProduct[]>([])
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [selectedPost, setSelectedPost] = useState<GridPost | null>(null)
  const [commentInput, setCommentInput] = useState('')

  // Follow & Action States
  const [currentAuthUser, setCurrentAuthUser] = useState<any>(null)
  const [currentUserHandle, setCurrentUserHandle] = useState<string>('homeowner')
  const [theyFollowMe, setTheyFollowMe] = useState(false)
  const [iFollowThem, setIFollowThem] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!targetUserId) return

    const loadTargetProfile = async () => {
      setLoading(true)

      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        setCurrentAuthUser(authUser)

        // Fetch current user's handle for notifications & comments
        const { data: myHouse } = await supabase
          .from('houses')
          .select('handle')
          .eq('user_id', authUser.id)
          .maybeSingle()

        if (myHouse?.handle) {
          setCurrentUserHandle(myHouse.handle)
        }
      }

      let isFollowingViewer = false
      if (authUser && targetUserId) {
        // Check if they follow you
        const { data: followerRow } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', targetUserId)
          .eq('following_id', authUser.id)
          .maybeSingle()

        setTheyFollowMe(!!followerRow)

        // Check if you follow them
        const { data: followingRow } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', authUser.id)
          .eq('following_id', targetUserId)
          .maybeSingle()

        setIFollowThem(!!followingRow)
        isFollowingViewer = !!followingRow
      }

      // 1. Fetch target user's house profile
      const { data: houseData } = await supabase
        .from('houses')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle()

      if (!houseData) {
        setLoading(false)
        return
      }

      setHouse(houseData)
      if (Array.isArray(houseData.pinned_products)) {
        setPinnedProducts(houseData.pinned_products)
      }

      // 2. Check Privacy: If private and viewer isn't following (and isn't the owner), restrict rooms/posts
      const isOwner = authUser?.id === targetUserId
      const isPrivate = houseData.is_private === true

      if (isPrivate && !isOwner && !isFollowingViewer) {
        setRooms([])
        setPosts([])
        setLoading(false)
        return
      }

      // 3. Fetch target user's rooms strictly scoped to targetUserId
      const { data: roomData } = await supabase
        .from('rooms')
        .select('id, name, floor_level, status, progress')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: true })

      if (roomData) setRooms(roomData)

      // 4. Fetch target user's posts strictly scoped to targetUserId with database persistence for likes, saves, and comments
      const { data: postData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('is_story', false)
        .order('created_at', { ascending: false })

      if (postData && authUser) {
        const enhancedPosts: GridPost[] = await Promise.all(
          postData.map(async (p) => {
            const { count: likesCount } = await supabase
              .from('post_likes')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', p.id)

            const { data: userLike } = await supabase
              .from('post_likes')
              .select('id')
              .eq('post_id', p.id)
              .eq('user_id', authUser.id)
              .maybeSingle()

            const { data: userSave } = await supabase
              .from('saved_posts')
              .select('id')
              .eq('post_id', p.id)
              .eq('user_id', authUser.id)
              .maybeSingle()

            const { data: commentsData } = await supabase
              .from('post_comments')
              .select('*')
              .eq('post_id', p.id)
              .order('created_at', { ascending: true })

            return {
              ...p,
              likes_count: likesCount || 0,
              is_liked: !!userLike,
              is_saved: !!userSave,
              comments: commentsData || [],
            }
          })
        )
        setPosts(enhancedPosts)
      } else {
        setPosts([])
      }

      // 5. Fetch follower stats
      const { count: followersC } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetUserId)
        .eq('status', 'accepted')

      const { count: followingC } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetUserId)
        .eq('status', 'accepted')

      setFollowersCount(followersC || 0)
      setFollowingCount(followingC || 0)
      setLoading(false)
    }

    loadTargetProfile()
  }, [targetUserId])

  const handleFollowBack = async () => {
    if (!currentAuthUser || !targetUserId) return
    setFollowLoading(true)

    const { error: followError } = await supabase.from('follows').insert([
      {
        follower_id: currentAuthUser.id,
        following_id: targetUserId,
        status: 'accepted',
      },
    ])

    if (!followError) {
      await supabase.from('notifications').insert([
        {
          user_id: targetUserId,
          actor_id: currentAuthUser.id,
          actor_handle: currentUserHandle,
          type: 'follow',
        },
      ])

      setIFollowThem(true)
      setFollowersCount((prev) => prev + 1)
      window.location.reload()
    } else {
      alert('Error following user: ' + followError.message)
    }

    setFollowLoading(false)
  }

  const handleUnfollow = async () => {
    if (!currentAuthUser || !targetUserId) return
    setFollowLoading(true)
    setShowDropdown(false)

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', currentAuthUser.id)
      .eq('following_id', targetUserId)

    setFollowLoading(false)
    if (!error) {
      setIFollowThem(false)
      setFollowersCount((prev) => Math.max(0, prev - 1))
    } else {
      alert('Error unfollowing user: ' + error.message)
    }
  }

  const handleBlockUser = async () => {
    if (!currentAuthUser || !targetUserId) return
    if (!confirm('Are you sure you want to block this user? This will also remove them from your followers.')) return
    
    setFollowLoading(true)
    setShowDropdown(false)

    await supabase.from('blocked_users').insert([
      {
        blocker_id: currentAuthUser.id,
        blocked_id: targetUserId,
      },
    ])

    await supabase
      .from('follows')
      .delete()
      .or(`and(follower_id.eq.${currentAuthUser.id},following_id.eq.${targetUserId}),and(follower_id.eq.${targetUserId},following_id.eq.${currentAuthUser.id})`)

    setFollowLoading(false)
    router.push('/feed')
  }

  const getRoomName = (roomId: string | null) => {
    if (!roomId) return 'Whole House'
    return rooms.find((r) => r.id === roomId)?.name || 'Room'
  }

  const toggleLikeModalPost = async () => {
    if (!selectedPost || !currentAuthUser) return
    const isCurrentlyLiked = selectedPost.is_liked
    const newLikedState = !isCurrentlyLiked
    const newCount = Math.max(0, (selectedPost.likes_count || 0) + (newLikedState ? 1 : -1))

    const updated = { ...selectedPost, is_liked: newLikedState, likes_count: newCount }
    setSelectedPost(updated)
    setPosts(posts.map((p) => (p.id === updated.id ? updated : p)))

    if (newLikedState) {
      const { error } = await supabase.from('post_likes').insert([{ post_id: selectedPost.id, user_id: currentAuthUser.id }])
      if (error) {
        alert('Error liking post: ' + error.message)
        return
      }

      if (selectedPost.user_id !== currentAuthUser.id) {
        await supabase.from('notifications').insert([
          {
            user_id: selectedPost.user_id,
            actor_id: currentAuthUser.id,
            actor_handle: currentUserHandle,
            type: 'like',
            post_id: selectedPost.id,
          },
        ])
      }
    } else {
      await supabase.from('post_likes').delete().eq('post_id', selectedPost.id).eq('user_id', currentAuthUser.id)
    }
  }

  const toggleSaveModalPost = async () => {
    if (!selectedPost || !currentAuthUser) return
    const isCurrentlySaved = selectedPost.is_saved
    const newSavedState = !isCurrentlySaved

    const updated = { ...selectedPost, is_saved: newSavedState }
    setSelectedPost(updated)
    setPosts(posts.map((p) => (p.id === updated.id ? updated : p)))

    if (newSavedState) {
      await supabase.from('saved_posts').insert([{ post_id: selectedPost.id, user_id: currentAuthUser.id }])
    } else {
      await supabase.from('saved_posts').delete().eq('post_id', selectedPost.id).eq('user_id', currentAuthUser.id)
    }
  }

  const handleAddCommentModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPost || !currentAuthUser || !commentInput.trim()) return

    const text = commentInput.trim()
    const { data, error } = await supabase
      .from('post_comments')
      .insert([
        {
          post_id: selectedPost.id,
          user_id: currentAuthUser.id,
          user_handle: currentUserHandle,
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
      const updatedComments = [...(selectedPost.comments || []), data]
      const updatedPost = { ...selectedPost, comments: updatedComments }

      setSelectedPost(updatedPost)
      setPosts(posts.map((p) => (p.id === updatedPost.id ? updatedPost : p)))
      setCommentInput('')

      if (selectedPost.user_id !== currentAuthUser.id) {
        await supabase.from('notifications').insert([
          {
            user_id: selectedPost.user_id,
            actor_id: currentAuthUser.id,
            actor_handle: currentUserHandle,
            type: 'comment',
            post_id: selectedPost.id,
          },
        ])
      }
    }
  }

  if (loading) return <div className="p-6 text-xs text-[#888] bg-[#111] min-h-screen">Loading passport...</div>
  if (!house) return <div className="p-6 text-xs text-[#888] bg-[#111] min-h-screen">House passport not found.</div>

  const isPrivateLocked = house.is_private && currentAuthUser?.id !== targetUserId && !iFollowThem

  return (
    <div className="pb-16 bg-[#111111] min-h-screen text-[#EDEDED] font-sans">
      <div className="px-5 pt-6 pb-4 space-y-4 max-w-2xl mx-auto">
        <Link href="/feed" className="text-xs font-medium text-[#888] hover:text-white">
          ← Back to Feed
        </Link>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-5 min-w-0">
            <div className="relative shrink-0 rounded-full p-0.5 bg-gradient-to-tr from-cyan-500 via-purple-500 to-pink-500">
              {house.avatar_url ? (
                <img src={house.avatar_url} alt="" className="w-24 h-24 rounded-full object-cover border-2 border-[#111]" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#1E1E1E] text-white flex items-center justify-center text-3xl font-bold border-2 border-[#111]">
                  {(house.handle || house.owner_names || 'U')[0].toUpperCase()}
                </div>
              )}
            </div>

            <div className="space-y-1 min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-white truncate">@{house.handle || 'homeowner'}</h1>
              <p className="text-sm font-medium text-[#A3A3A3] truncate">{house.owner_names || house.title || 'House Passport'}</p>
              {house.bio && <p className="text-xs text-[#888] line-clamp-2">{house.bio}</p>}
              {house.location && <p className="text-xs font-medium text-[#777]">{house.location}</p>}
            </div>
          </div>

          {/* Follow Actions & Menu */}
          {currentAuthUser && currentAuthUser.id !== targetUserId && (
            <div className="shrink-0 relative" ref={dropdownRef}>
              {theyFollowMe && !iFollowThem ? (
                <button
                  type="button"
                  onClick={handleFollowBack}
                  disabled={followLoading}
                  className="px-4 py-2 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-colors shadow-sm"
                >
                  {followLoading ? 'Following...' : 'Follow Back'}
                </button>
              ) : iFollowThem ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="px-4 py-2 rounded-full bg-[#222] hover:bg-[#2A2A2A] text-[#AAA] hover:text-white text-xs font-semibold border border-[#333] transition-colors"
                  >
                    Following ▾
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-36 rounded-xl bg-[#1A1A1A] border border-[#333] shadow-xl py-1 z-50">
                      <button
                        type="button"
                        onClick={handleUnfollow}
                        disabled={followLoading}
                        className="w-full text-left px-4 py-2 text-xs text-[#CCC] hover:bg-[#262626] hover:text-white transition-colors"
                      >
                        Unfollow
                      </button>
                      <button
                        type="button"
                        onClick={handleBlockUser}
                        disabled={followLoading}
                        className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-950/40 transition-colors"
                      >
                        Block Account
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleFollowBack}
                  disabled={followLoading}
                  className="px-4 py-2 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-colors shadow-sm"
                >
                  {followLoading ? 'Following...' : 'Follow'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 text-xs font-medium text-[#A3A3A3] border-t border-[#222]">
          <span>Rooms: <strong className="font-bold text-white">{rooms.length}</strong></span>
          <span>Posts: <strong className="font-bold text-white">{posts.length}</strong></span>
          <span>Followers: <strong className="font-bold text-white">{followersCount}</strong></span>
          <span>Following: <strong className="font-bold text-white">{followingCount}</strong></span>
        </div>
      </div>

      {isPrivateLocked ? (
        <div className="mx-5 mt-8 p-10 rounded-2xl bg-[#181818] border border-[#262626] text-center space-y-2 max-w-md mx-auto">
          <p className="text-sm font-bold text-white">This House Passport is Private</p>
          <p className="text-xs text-[#888]">Follow this account to view their rooms and renovation posts.</p>
        </div>
      ) : (
        <div className="pt-4 px-3 max-w-5xl mx-auto">
          {posts.length === 0 ? (
            <div className="mx-5 p-10 rounded-2xl bg-[#181818] border border-[#262626] text-center">
              <p className="text-xs font-medium text-[#888]">No posts from this user yet.</p>
            </div>
          ) : (
            <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
              {posts.map((post) => (
                <div key={post.id} className="break-inside-avoid">
                  <button
                    type="button"
                    onClick={() => setSelectedPost(post)}
                    className="relative w-full rounded-2xl overflow-hidden bg-[#1A1A1A] group text-left block shadow-md cursor-pointer hover:ring-2 hover:ring-white/40 transition-all"
                  >
                    {post.image_url ? (
                      post.media_type === 'video' ? (
                        <video src={post.image_url} muted playsInline className="w-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <img src={post.image_url} alt="" className="w-full object-cover group-hover:scale-105 transition-transform" />
                      )
                    ) : (
                      <div className="w-full p-4 bg-[#1C1C1C] min-h-[120px] flex items-center justify-center text-xs text-[#888]">
                        Note Update
                      </div>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Full Screen Lightbox Modal with Database Persisted Reactions & Comments */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-[#181818] border border-[#262626] overflow-hidden shadow-2xl space-y-3 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3.5 flex items-center justify-between border-b border-[#262626] shrink-0">
              <div>
                <p className="text-xs font-bold text-white">{getRoomName(selectedPost.room_id)}</p>
                {selectedPost.stage && (
                  <p className="text-[11px] text-[#888] font-medium">{selectedPost.stage}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="w-8 h-8 rounded-full bg-[#262626] text-white flex items-center justify-center text-base hover:bg-[#333]"
              >
                ×
              </button>
            </div>

            {selectedPost.image_url && (
              <div className="bg-black shrink-0 flex items-center justify-center max-h-[50vh] overflow-hidden">
                {selectedPost.media_type === 'video' ? (
                  <video src={selectedPost.image_url} controls autoPlay playsInline className="w-full max-h-[50vh] object-contain" />
                ) : (
                  <img src={selectedPost.image_url} alt="" className="w-full max-h-[50vh] object-contain mx-auto" />
                )}
              </div>
            )}

            <div className="px-4 space-y-2 overflow-y-auto flex-1 pb-2">
              <div className="flex items-center gap-4 text-sm pt-1">
                <button
                  type="button"
                  onClick={toggleLikeModalPost}
                  className={`flex items-center gap-1.5 font-medium cursor-pointer ${selectedPost.is_liked ? 'text-red-500' : 'text-[#AAA] hover:text-white'}`}
                >
                  <span>{selectedPost.is_liked ? '❤️' : '🤍'}</span>
                  <span className="text-xs">{selectedPost.likes_count}</span>
                </button>
                <span className="text-xs text-[#AAA]">💬 {(selectedPost.comments || []).length} Comments</span>

                <button
                  type="button"
                  onClick={toggleSaveModalPost}
                  className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
                    selectedPost.is_saved
                      ? 'bg-cyan-500 text-black border-cyan-400'
                      : 'bg-[#222] text-[#CCC] border-[#333] hover:text-white'
                  }`}
                >
                  {selectedPost.is_saved ? '🔖 Saved' : '📌 Save Post'}
                </button>

                {selectedPost.cost && (
                  <span className="text-xs font-bold text-white">£{Number(selectedPost.cost).toLocaleString()}</span>
                )}
              </div>

              {selectedPost.caption && <p className="text-xs text-[#DDD] leading-relaxed">{selectedPost.caption}</p>}
              
              {selectedPost.specs && selectedPost.specs.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedPost.specs.map((s, i) => (
                    <span key={i} className="text-[10px] px-2.5 py-1 rounded-full bg-[#222] text-[#CCC] font-semibold">
                      🏷 {s}
                    </span>
                  ))}
                </div>
              )}

              {/* Comments Section */}
              <div className="pt-3 border-t border-[#262626] space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#888]">Comments</p>
                
                {(selectedPost.comments || []).length === 0 ? (
                  <p className="text-xs text-[#666] italic">No comments yet. Leave a reaction or comment below!</p>
                ) : (
                  <div className="space-y-2 max-h-28 overflow-y-auto">
                    {selectedPost.comments?.map((c) => (
                      <div key={c.id} className="text-xs space-y-0.5 bg-[#121212] p-2.5 rounded-xl border border-[#222]">
                        <span className="font-bold text-white mr-1.5">@{c.user_handle}</span>
                        <span className="text-[#CCC]">{c.content}</span>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleAddCommentModal} className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-[#121212] text-white placeholder-[#666] border border-[#262626] rounded-xl focus:outline-none focus:border-white"
                  />
                  <button type="submit" className="px-3.5 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-[#E0E0E0]">
                    Post
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function UserProfilePage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-[#888] bg-[#111] min-h-screen">Loading...</div>}>
      <UserProfileContent />
    </Suspense>
  )
}