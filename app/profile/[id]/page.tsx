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

interface GridPost {
  id: string
  room_id: string | null
  stage: string | null
  caption: string | null
  image_url: string | null
  media_type: 'image' | 'video' | null
  specs: string[] | null
  cost: number | null
  created_at: string
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

        // Fetch current user's handle for notifications
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

      // 4. Fetch target user's posts strictly scoped to targetUserId
      const { data: postData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('is_story', false)
        .order('created_at', { ascending: false })

      if (postData) {
        setPosts(postData)
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
                    className="relative w-full rounded-2xl overflow-hidden bg-[#1A1A1A] group text-left block shadow-md"
                  >
                    {post.image_url && <img src={post.image_url} alt="" className="w-full object-cover group-hover:scale-105 transition-transform" />}
                  </button>
                </div>
              ))}
            </div>
          )}
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