'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface HouseProfile {
  user_id: string
  handle: string | null
  owner_names: string | null
  title: string | null
  era: string | null
  location: string | null
  bio: string | null
  avatar_url: string | null
  is_private?: boolean | null
}

interface PostResult {
  id: string
  user_id: string
  stage: string | null
  caption: string | null
  image_url: string | null
  specs: string[] | null
  cost: number | null
  created_at: string
}

export default function ExplorePage() {
  const [user, setUser] = useState<User | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'houses' | 'posts'>('all')
  const [houses, setHouses] = useState<HouseProfile[]>([])
  const [posts, setPosts] = useState<PostResult[]>([])
  const [loading, setLoading] = useState(false)
  const [requestingIds, setRequestingIds] = useState<Record<string, boolean>>({})

  const popularTags = [
    'Farrow & Ball',
    'Herringbone',
    'Panelling',
    'Dining Room',
    'Kitchen',
    'Utility',
  ]

  useEffect(() => {
    const init = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (auth.user) setUser(auth.user)
    }
    init()
  }, [])

  const handleSearch = async (term: string) => {
    setSearchQuery(term)
    const q = term.toLowerCase().trim().replace('@', '') // Strip leading @ if typed
    if (!q) {
      setHouses([])
      setPosts([])
      return
    }

    setLoading(true)

    // 1. Search Houses across handles, titles, eras, locations, bios, and owner names
    const { data: houseData } = await supabase
      .from('houses')
      .select('*')
      .or(`handle.ilike.%${q}%,title.ilike.%${q}%,era.ilike.%${q}%,location.ilike.%${q}%,owner_names.ilike.%${q}%,bio.ilike.%${q}%`)

    // 2. Search Rooms by name (e.g., "Dining Room", "Kitchen")
    const { data: roomMatches } = await supabase
      .from('rooms')
      .select('user_id')
      .ilike('name', `%${q}%`)

    const roomUserIds = Array.from(new Set((roomMatches || []).map((r) => r.user_id)))
    let roomHouses: HouseProfile[] = []
    if (roomUserIds.length > 0) {
      const { data: hData } = await supabase
        .from('houses')
        .select('*')
        .in('user_id', roomUserIds)
      if (hData) roomHouses = hData
    }

    // Combine and deduplicate houses
    const combinedHouses = new Map<string, HouseProfile>()
    ;[...(houseData || []), ...roomHouses].forEach((h) => {
      combinedHouses.set(h.user_id, h)
    })
    setHouses(Array.from(combinedHouses.values()))

    // 3. Search Posts across captions, stages, costs, and tagged specs/products
    const { data: postData } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })

    const filteredPosts = (postData || []).filter((p) => {
      const matchCaption = p.caption?.toLowerCase().includes(q)
      const matchStage = p.stage?.toLowerCase().includes(q)
      const matchCost = p.cost?.toString().includes(q)
      const matchSpecs = Array.isArray(p.specs) && p.specs.some((s: string) => s.toLowerCase().includes(q))
      return matchCaption || matchStage || matchCost || matchSpecs
    })

    setPosts(filteredPosts)
    setLoading(false)
  }

  const handleRequestFollow = async (targetUserId: string, isPrivate: boolean) => {
    if (!user) {
      alert('Please sign in to send a follow request.')
      return
    }

    setRequestingIds((prev) => ({ ...prev, [targetUserId]: true }))

    // Insert follow request with 'pending' status for private accounts and 'accepted' for public ones
    const { error } = await supabase.from('follows').insert([
      { 
        follower_id: user.id, 
        following_id: targetUserId, 
        status: isPrivate ? 'pending' : 'accepted' 
      }
    ])

    if (error) {
      if (error.code === '23505') {
        alert('You have already sent a follow request or are following this house.')
      } else {
        alert('Error sending request: ' + error.message)
      }
    } else {
      alert(isPrivate ? 'Follow request sent!' : 'Now following!')
    }
    setRequestingIds((prev) => ({ ...prev, [targetUserId]: false }))
  }

  return (
    <div className="px-5 pt-6 pb-20 space-y-5 bg-[#111111] min-h-screen max-w-xl mx-auto font-sans">
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#888]">
          Discovery & Search
        </p>
        <h1 className="text-lg font-bold text-white">Explore HomeWallr</h1>
      </div>

      {/* Clean Straightforward Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by @handle, rooms, paint brands, or tags..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full px-4 py-3.5 pl-10 text-xs bg-[#181818] text-white placeholder-[#666] border border-[#262626] rounded-2xl focus:outline-none focus:border-white shadow-inner"
        />
        <span className="absolute left-3.5 top-3.5 text-sm text-[#888]">🔍</span>
        {searchQuery && (
          <button
            type="button"
            onClick={() => handleSearch('')}
            className="absolute right-3.5 top-3.5 text-xs text-[#888] hover:text-white"
          >
            Clear ×
          </button>
        )}
      </div>

      {/* Quick Filter Tags */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#777]">Quick Tags</p>
        <div className="flex flex-wrap gap-2">
          {popularTags.map((tag, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSearch(tag)}
              className="px-3 py-1.5 rounded-full bg-[#1C1C1C] hover:bg-[#262626] border border-[#2A2A2A] text-xs text-[#CCC] font-medium transition-colors"
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Results Filter Tabs */}
      <div className="flex gap-2 border-b border-[#222] pb-3">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-semibold ${activeFilter === 'all' ? 'bg-white text-black' : 'text-[#888]'}`}
        >
          All Results
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('houses')}
          className={`px-3 py-1 rounded-full text-xs font-semibold ${activeFilter === 'houses' ? 'bg-white text-black' : 'text-[#888]'}`}
        >
          Houses ({houses.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('posts')}
          className={`px-3 py-1 rounded-full text-xs font-semibold ${activeFilter === 'posts' ? 'bg-white text-black' : 'text-[#888]'}`}
        >
          Posts & Specs ({posts.length})
        </button>
      </div>

      {/* Content Feed */}
      {loading ? (
        <p className="text-xs text-[#888] text-center py-8">Searching community accounts...</p>
      ) : searchQuery && houses.length === 0 && posts.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#181818] border border-[#262626] text-center space-y-1">
          <p className="text-xs font-bold text-white">No matching results found for &quot;{searchQuery}&quot;</p>
          <p className="text-[11px] text-[#888]">Try searching by @handle, room names, or paint brands.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(activeFilter === 'all' || activeFilter === 'houses') && houses.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#888]">Matching Houses</h2>
              <div className="space-y-2">
                {houses.map((house) => {
                  const isPrivate = house.is_private === true
                  const isSelf = user?.id === house.user_id

                  return (
                    <div key={house.user_id} className="p-4 rounded-2xl bg-[#181818] border border-[#262626] flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-white">@{house.handle || 'homeowner'}</h3>
                          {isPrivate && (
                            <span className="text-[9px] px-2 py-0.5 rounded bg-amber-950/40 text-amber-400 font-semibold border border-amber-900/50">
                              🔒 Private Passport
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#CCC] font-medium">{house.title || 'House Passport'}</p>
                        <p className="text-[11px] text-[#888]">{house.era} · {house.location || 'UK'}</p>
                      </div>

                      {isSelf ? (
                        <Link href="/profile" className="px-3.5 py-1.5 rounded-full bg-[#222] text-[#CCC] text-xs font-semibold border border-[#333]">
                          Your Profile
                        </Link>
                      ) : isPrivate ? (
                        <button
                          type="button"
                          disabled={requestingIds[house.user_id]}
                          onClick={() => handleRequestFollow(house.user_id, isPrivate)}
                          className="px-3.5 py-1.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold transition-colors"
                        >
                          {requestingIds[house.user_id] ? 'Sending...' : 'Request Follow'}
                        </button>
                      ) : (
                        <Link href={`/profile/${house.user_id}`} className="px-3.5 py-1.5 rounded-full bg-white text-black text-xs font-semibold hover:bg-[#E0E0E0] transition-colors">
                          View Passport →
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {(activeFilter === 'all' || activeFilter === 'posts') && posts.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#888]">Matching Posts & Specs</h2>
              <div className="grid grid-cols-2 gap-3">
                {posts.map((post) => (
                  <div key={post.id} className="rounded-2xl bg-[#181818] border border-[#262626] overflow-hidden space-y-2 pb-3">
                    {post.image_url && (
                      <img src={post.image_url} alt="" className="w-full h-32 object-cover" />
                    )}
                    <div className="px-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#888] uppercase">{post.stage || 'Update'}</span>
                        {post.cost && <span className="text-[10px] font-bold text-white">£{Number(post.cost).toLocaleString()}</span>}
                      </div>
                      <p className="text-xs text-white line-clamp-2">{post.caption}</p>
                      {post.specs && post.specs.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {post.specs.map((s, idx) => (
                            <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-[#222] text-cyan-400 font-semibold">
                              🏷 {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}