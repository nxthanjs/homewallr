'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { PinnedProduct } from '@/app/profile/page'

// 1. Rename your main logic to an inner component
function UserProfileContent() {
  const params = useParams()
  const router = useRouter()
  const targetUserId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [house, setHouse] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [pinnedProducts, setPinnedProducts] = useState<PinnedProduct[]>([])
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [selectedPost, setSelectedPost] = useState<any | null>(null)

  useEffect(() => {
    if (!targetUserId) return

    const loadTargetProfile = async () => {
      const { data: houseData } = await supabase
        .from('houses')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle()

      if (houseData) setHouse(houseData)
      if (houseData && Array.isArray(houseData.pinned_products)) {
        setPinnedProducts(houseData.pinned_products)
      }

      const { data: roomData } = await supabase
        .from('rooms')
        .select('id, name, floor_level, status, progress')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: true })

      if (roomData) setRooms(roomData)

      const { data: postData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('is_story', false)
        .order('created_at', { ascending: false })

      if (postData) setPosts(postData)

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

  if (loading) return <div className="p-6 text-xs text-[#888]">Loading passport...</div>
  if (!house) return <div className="p-6 text-xs text-[#888]">House passport not found.</div>

  return (
    <div className="pb-16 bg-[#111111] min-h-screen text-[#EDEDED] font-sans">
      <div className="px-5 pt-6 pb-4 space-y-4 max-w-2xl mx-auto">
        <Link href="/feed" className="text-xs font-medium text-[#888] hover:text-white">
          ← Back to Feed
        </Link>

        <div className="flex items-center gap-5">
          <div className="relative shrink-0 rounded-full p-0.5 bg-gradient-to-tr from-cyan-500 via-purple-500 to-pink-500">
            {house.avatar_url ? (
              <img src={house.avatar_url} alt="" className="w-24 h-24 rounded-full object-cover border-2 border-[#111]" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[#1E1E1E] text-white flex items-center justify-center text-3xl font-bold border-2 border-[#111]">
                {(house.handle || 'U')[0].toUpperCase()}
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

// 2. Export the default page wrapped in Suspense
export default function UserProfilePage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-[#888] bg-[#111] min-h-screen">Loading...</div>}>
      <UserProfileContent />
    </Suspense>
  )
}