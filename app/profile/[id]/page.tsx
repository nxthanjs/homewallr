'use client'

import { useState, useEffect, Suspense } from 'react'
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

  // Follow Back States
  const [currentAuthUser, setCurrentAuthUser] = useState<any>(null)
  const [theyFollowMe, setTheyFollowMe] = useState(false)
  const [iFollowThem, setIFollowThem] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    if (!targetUserId) return

    const loadTargetProfile = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) setCurrentAuthUser(authUser)

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
      }

      // 1. Fetch target user's house profile
      const { data: houseData } = await supabase
        .from('houses')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle()

      if (houseData) setHouse(houseData)
      if (houseData && Array.isArray(houseData.pinned_products)) {
        setPinnedProducts(houseData.pinned_products)
      }

      // 2. Fetch target user's rooms
      const { data: roomData } = await supabase
        .from('rooms')
        .select('id, name, floor_level, status, progress')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: true })

      if (roomData) setRooms(roomData)

      // 3. Fetch target user's posts
      const { data: postData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('is_story', false)
        .order('created_at', { ascending: false })

      if (postData && postData.length > 0) {
        setPosts(postData)
      } else {
        const { data: allPosts } = await supabase
          .from('posts')
          .select('*')
          .eq('is_story', false)
          .order('created_at', { ascending: false })
        if (allPosts) setPosts(allPosts)
      }

      // 4. Fetch follower stats
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

    const { error } = await supabase.from('follows').insert([
      {
        follower_id: currentAuthUser.id,
        following_id: targetUserId,
        status: 'accepted',
      },
    ])

    setFollowLoading(false)
    if (!error) {
      setIFollowThem(true)
    } else {
      alert('Error following user: ' + error.message)
    }
  }

  if (loading) return <div className="p-6 text-xs text-[#888] bg-[#111] min-h-screen">Loading passport...</div>
  if (!house) return <div className="p-6 text-xs text-[#888] bg-[#111] min-h-screen">House passport not found.</div>

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

          {/* Follow Back Button / Status */}
          {currentAuthUser && currentAuthUser.id !== targetUserId && (
            <div className="shrink-0">
              {theyFollowMe && !iFollowThem && (
                <button
                  type="button"
                  onClick={handleFollowBack}
                  disabled={followLoading}
                  className="px-4 py-2 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-colors shadow-sm"
                >
                  {followLoading ? 'Following...' : 'Follow Back'}
                </button>
              )}
              {iFollowThem && (
                <span className="px-4 py-2 rounded-full bg-[#222] text-[#AAA] text-xs font-semibold border border-[#333]">
                  Following
                </span>
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

      <div className="pt-4 px-3 max-w-5xl mx-auto">
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
      </div>
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