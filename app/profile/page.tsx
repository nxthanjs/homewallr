'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import AIFloorPlan from '@/components/AIFloorPlan'

export interface PinnedProduct {
  id: string
  name: string
  brand: string
  price?: string
  room?: string
  url?: string
}

interface RoomCollection {
  id: string
  name: string
  floor_level: string | null
  status: string
  progress: number
  width_m: number | null
  length_m: number | null
}

interface GridPost {
  id: string
  room_id: string | null
  stage: string | null
  caption: string | null
  image_url: string | null
  media_type: 'image' | 'video' | null
  is_story: boolean | null
  expires_at: string | null
  specs: string[] | null
  cost: number | null
  contractor: string | null
  created_at: string
}

interface SavedPin {
  id: string
  title: string
  category: string | null
  image_url: string | null
  source_url: string | null
  notes: string | null
  created_at: string
}

export default function VisualProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<'posts' | 'house' | 'pinned_ideas'>('posts')
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all')

  // Profile & House Metadata
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [plan2dUrl, setPlan2dUrl] = useState<string | null>(null)
  const [ownerNames, setOwnerNames] = useState('')
  const [location, setLocation] = useState('')
  const [bio, setBio] = useState('')
  const [houseTitle, setHouseTitle] = useState('The 1930s Semi')
  const [houseEra, setHouseEra] = useState('1930s Semi-Detached')

  // Data collections
  const [rooms, setRooms] = useState<RoomCollection[]>([])
  const [gridPosts, setGridPosts] = useState<GridPost[]>([])
  const [activeStories, setActiveStories] = useState<GridPost[]>([])
  const [savedPins, setSavedPins] = useState<SavedPin[]>([])
  const [pinnedProducts, setPinnedProducts] = useState<PinnedProduct[]>([])

  // Lightbox & Modals
  const [selectedPost, setSelectedPost] = useState<GridPost | null>(null)
  const [storyIndex, setStoryIndex] = useState<number | null>(null)
  const [showPinIdeaModal, setShowPinIdeaModal] = useState(false)
  const [pinningIdea, setPinningIdea] = useState(false)
  const [ideaFile, setIdeaFile] = useState<File | null>(null)
  const [newIdea, setNewIdea] = useState({ title: '', category: 'Interior Look', source_url: '', notes: '' })

  const [showPinProductModal, setShowPinProductModal] = useState(false)
  const [pinningProduct, setPinningProduct] = useState(false)
  const [newProduct, setNewProduct] = useState({ name: '', brand: '', price: '', room: '', url: '' })

  const fetchRooms = async () => {
    const { data: roomData } = await supabase
      .from('rooms')
      .select('id, name, floor_level, status, progress, width_m, length_m')
      .order('created_at', { ascending: true })
    if (roomData) setRooms(roomData)
  }

  useEffect(() => {
    const loadProfileData = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return router.push('/login')
      setUser(auth.user)

      const { data: house } = await supabase
        .from('houses')
        .select('*')
        .eq('user_id', auth.user.id)
        .maybeSingle()

      if (house) {
        if (house.avatar_url) setAvatarUrl(house.avatar_url)
        if (house.plan_2d_url) setPlan2dUrl(house.plan_2d_url)
        setOwnerNames(house.owner_names || '')
        setLocation(house.location || '')
        setBio(house.bio || '')
        if (house.title) setHouseTitle(house.title)
        if (house.era) setHouseEra(house.era)
        if (Array.isArray(house.pinned_products)) setPinnedProducts(house.pinned_products)
      }

      await fetchRooms()

      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })

      if (postsData) {
        const now = Date.now()
        const stories = postsData.filter(
          (p) => p.is_story && (!p.expires_at || new Date(p.expires_at).getTime() > now)
        )
        const permanent = postsData.filter((p) => !p.is_story)
        setActiveStories(stories)
        setGridPosts(permanent)
      }

      const { data: pinsData } = await supabase
        .from('saved_pins')
        .select('*')
        .order('created_at', { ascending: false })
      if (pinsData) setSavedPins(pinsData)

      setLoading(false)
    }
    loadProfileData()
  }, [router])

  const handleCreateIdea = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newIdea.title.trim()) return
    setPinningIdea(true)

    let imageUrl: string | null = null
    if (ideaFile) {
      const ext = ideaFile.name.split('.').pop() || 'jpg'
      const path = `ideas/${user.id}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('post-images').upload(path, ideaFile)
      if (!upErr) {
        const { data } = supabase.storage.from('post-images').getPublicUrl(path)
        imageUrl = data.publicUrl
      }
    }

    const { data, error } = await supabase
      .from('saved_pins')
      .insert([
        {
          user_id: user.id,
          title: newIdea.title.trim(),
          category: newIdea.category,
          image_url: imageUrl,
          source_url: newIdea.source_url.trim() || null,
          notes: newIdea.notes.trim() || null,
        },
      ])
      .select()
      .single()

    setPinningIdea(false)
    if (error) {
      alert('Error pinning idea: ' + error.message)
    } else if (data) {
      setSavedPins((prev) => [data, ...prev])
      setNewIdea({ title: '', category: 'Interior Look', source_url: '', notes: '' })
      setIdeaFile(null)
      setShowPinIdeaModal(false)
    }
  }

  const handleDeleteIdea = async (id: string) => {
    const { error } = await supabase.from('saved_pins').delete().eq('id', id)
    if (!error) setSavedPins((prev) => prev.filter((p) => p.id !== id))
  }

  const handleAddPinnedProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newProduct.name.trim()) return
    setPinningProduct(true)

    const updated: PinnedProduct[] = [
      ...pinnedProducts,
      {
        id: `${Date.now()}`,
        name: newProduct.name.trim(),
        brand: newProduct.brand.trim() || 'House Spec',
        price: newProduct.price.trim() || undefined,
        room: newProduct.room.trim() || undefined,
        url: newProduct.url.trim() || undefined,
      },
    ]

    const { error } = await supabase
      .from('houses')
      .upsert({ user_id: user.id, pinned_products: updated }, { onConflict: 'user_id' })

    setPinningProduct(false)
    if (!error) {
      setPinnedProducts(updated)
      setNewProduct({ name: '', brand: '', price: '', room: '', url: '' })
      setShowPinProductModal(false)
    }
  }

  const removePinnedProduct = async (id: string) => {
    if (!user) return
    const updated = pinnedProducts.filter((p) => p.id !== id)
    setPinnedProducts(updated)
    await supabase.from('houses').upsert({ user_id: user.id, pinned_products: updated }, { onConflict: 'user_id' })
  }

  if (loading) return <div className="p-6 text-xs text-[#9C9A92]">Loading profile...</div>

  const handle = user?.email?.split('@')[0] || 'homeowner'
  const displayInitial = (ownerNames || handle)[0].toUpperCase()
  const avgProgress = rooms.length > 0 ? Math.round(rooms.reduce((a, r) => a + r.progress, 0) / rooms.length) : 0
  const hasStories = activeStories.length > 0

  const getRoomName = (roomId: string | null) => {
    if (!roomId) return 'Whole House'
    return rooms.find((r) => r.id === roomId)?.name || 'Room'
  }

  const visiblePosts =
    selectedRoomFilter === 'all'
      ? gridPosts
      : gridPosts.filter((p) => p.room_id === selectedRoomFilter)

  return (
    <div className="pb-12 bg-[#151815] min-h-screen">
      {/* 1. Profile Identity Section */}
      <div className="px-5 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-[#9C9A92]">
            PROFILE
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/timeline"
              className="text-[11px] font-medium text-[#F2EFE9] bg-[#222B22] hover:bg-[#2B362B] border border-[#344234] px-3 py-1 rounded-full transition-colors"
            >
              Logbook
            </Link>
            <Link
              href="/settings"
              className="text-[11px] font-medium text-[#F2EFE9] bg-[#1E221E] hover:bg-[#282D28] border border-[#323832] px-3 py-1 rounded-full transition-colors"
            >
              Edit Profile
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => hasStories && setStoryIndex(0)}
            className={`relative shrink-0 rounded-full p-0.5 transition-transform ${
              hasStories
                ? 'bg-gradient-to-tr from-[#8FA680] via-[#C6A467] to-[#6D855E] cursor-pointer active:scale-95'
                : 'bg-transparent cursor-default'
            }`}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={ownerNames || handle}
                className="w-20 h-20 rounded-full object-cover border-2 border-[#151815]"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#263126] text-[#8FA680] flex items-center justify-center text-2xl font-semibold border-2 border-[#151815]">
                {displayInitial}
              </div>
            )}
            {hasStories && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#8FA680] text-[#121612] text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-[#151815]">
                {activeStories.length} Story
              </span>
            )}
          </button>

          <div className="space-y-0.5 min-w-0">
            <h1 className="text-xl font-semibold text-[#F2EFE9] truncate leading-tight">
              {ownerNames || `@${handle}`}
            </h1>
            <p className="text-xs text-[#9C9A92]">@{handle}</p>
            {bio && <p className="text-xs text-[#D5D2C8] line-clamp-2 pt-0.5">{bio}</p>}
            {location && <p className="text-xs font-medium text-[#C6A467] pt-0.5">{location}</p>}
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between pt-2 text-xs text-[#C5C2B8] border-t border-[#262B26]">
          <span>
            Houses: <strong className="font-semibold text-[#F2EFE9]">1</strong>
          </span>
          <span>
            Rooms: <strong className="font-semibold text-[#F2EFE9]">{rooms.length}</strong>
          </span>
          <span>
            Posts: <strong className="font-semibold text-[#F2EFE9]">{gridPosts.length}</strong>
          </span>
        </div>
      </div>

      {/* 2. Full-Width Deep Forest Milestone Band */}
      <div className="bg-[#1D241D] border-y border-[#2D382D] px-5 py-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#F2EFE9]">Renovation Stage</span>
          <span className="text-[11px] font-semibold text-[#8FA680]">{avgProgress}% Complete</span>
        </div>

        <div className="relative pt-1">
          <div className="w-full h-2 bg-[#121512] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#8FA680] rounded-full transition-all duration-500"
              style={{ width: `${Math.max(12, avgProgress)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-medium text-[#7D7B73] pt-1.5">
            <span className={avgProgress >= 0 ? 'text-[#C6A467] font-semibold' : ''}>Planning</span>
            <span className={avgProgress >= 40 ? 'text-[#C6A467] font-semibold' : ''}>Structural</span>
            <span className={avgProgress >= 80 ? 'text-[#C6A467] font-semibold' : ''}>Interior Style</span>
          </div>
        </div>
      </div>

      {/* 3. Clean Underlined Tabs (Posts First, My House Second) */}
      <div className="px-5 pt-2 border-b border-[#2A302A] flex items-center justify-between bg-[#151815]">
        <button
          type="button"
          onClick={() => setActiveTab('posts')}
          className={`pb-2.5 text-xs font-semibold transition-colors border-b-2 ${
            activeTab === 'posts'
              ? 'border-[#8FA680] text-[#F2EFE9]'
              : 'border-transparent text-[#8B8982] hover:text-[#D5D2C8]'
          }`}
        >
          Posts ({gridPosts.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('house')}
          className={`pb-2.5 text-xs font-semibold transition-colors border-b-2 ${
            activeTab === 'house'
              ? 'border-[#8FA680] text-[#F2EFE9]'
              : 'border-transparent text-[#8B8982] hover:text-[#D5D2C8]'
          }`}
        >
          My House
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pinned_ideas')}
          className={`pb-2.5 text-xs font-semibold transition-colors border-b-2 ${
            activeTab === 'pinned_ideas'
              ? 'border-[#8FA680] text-[#F2EFE9]'
              : 'border-transparent text-[#8B8982] hover:text-[#D5D2C8]'
          }`}
        >
          Pinned Ideas ({savedPins.length})
        </button>
      </div>

      {/* TAB 1: POSTS GRID (Instagram 4:5 Portrait Grid) */}
      {activeTab === 'posts' && (
        <div className="pt-3 space-y-3">
          {rooms.length > 0 && (
            <div className="px-5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedRoomFilter('all')}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  selectedRoomFilter === 'all'
                    ? 'bg-[#8FA680] text-[#121612] font-semibold'
                    : 'bg-[#1E221E] text-[#C5C2B8] border border-[#2E332E]'
                }`}
              >
                All Rooms
              </button>
              {rooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setSelectedRoomFilter(room.id)}
                  className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    selectedRoomFilter === room.id
                      ? 'bg-[#8FA680] text-[#121612] font-semibold'
                      : 'bg-[#1E221E] text-[#C5C2B8] border border-[#2E332E]'
                  }`}
                >
                  {room.name}
                </button>
              ))}
            </div>
          )}

          {visiblePosts.length === 0 ? (
            <div className="mx-5 p-8 rounded-2xl bg-[#1E221E] border border-[#2E332E] text-center space-y-2">
              <p className="text-xs text-[#9C9A92]">No photos or videos posted yet.</p>
              <Link
                href="/upload"
                className="inline-block px-4 py-2 rounded-full bg-[#8FA680] text-[#121612] text-xs font-semibold"
              >
                + Post First Update
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 bg-[#0E100E]">
              {visiblePosts.map((post) => {
                const isVideo = post.media_type === 'video'
                const hasSpecs = Array.isArray(post.specs) && post.specs.length > 0
                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => setSelectedPost(post)}
                    className="relative aspect-[4/5] bg-[#1E221E] overflow-hidden group text-left focus:outline-none"
                  >
                    {post.image_url ? (
                      isVideo ? (
                        <video
                          src={post.image_url}
                          muted
                          playsInline
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <img
                          src={post.image_url}
                          alt={post.caption || 'Renovation photo'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      )
                    ) : (
                      <div className="w-full h-full p-2.5 flex flex-col justify-between bg-[#1D241D]">
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-[#8FA680]">
                          {getRoomName(post.room_id)}
                        </span>
                        <p className="text-[11px] text-[#E5E2DA] line-clamp-5 leading-snug">
                          {post.caption || post.stage || 'Note'}
                        </p>
                      </div>
                    )}

                    {isVideo && (
                      <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/75 text-white flex items-center justify-center text-[9px]">
                        ▶
                      </span>
                    )}

                    {!isVideo && hasSpecs && (
                      <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/70 text-[#C6A467] flex items-center justify-center text-[10px]">
                        🏷
                      </span>
                    )}

                    {selectedRoomFilter === 'all' && post.room_id && post.image_url && (
                      <span className="absolute bottom-1.5 left-1.5 max-w-[85%] truncate bg-black/75 backdrop-blur-xs text-[#F2EFE9] text-[9px] font-medium px-1.5 py-0.5 rounded">
                        {getRoomName(post.room_id)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY HOUSE */}
      {activeTab === 'house' && (
        <div className="px-5 pt-4 space-y-4">
          <div className="rounded-2xl bg-[#1C221C] border border-[#2F3B2F] p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-[#F2EFE9]">{houseTitle}</h2>
                <p className="text-[11px] text-[#9C9A92]">{houseEra}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#141814] border border-[#2E382E] text-[11px] font-semibold text-[#8FA680]">
                {avgProgress}% Complete
              </span>
            </div>

            {user && (
              <AIFloorPlan
                userId={user.id}
                rooms={rooms}
                plan2dUrl={plan2dUrl}
                onRoomsUpdated={fetchRooms}
              />
            )}
          </div>

          <div className="rounded-2xl bg-[#1E221E] border border-[#2E332E] p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9C9A92]">
                House Specs & Paints ({pinnedProducts.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowPinProductModal(true)}
                className="text-xs font-medium text-[#8FA680] underline"
              >
                + Add Spec
              </button>
            </div>

            {pinnedProducts.length === 0 ? (
              <p className="text-xs text-[#8B8982]">
                Save your paint colours, flooring, and hardware specs here for easy reference.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {pinnedProducts.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-[#151815] border border-[#2A302A] space-y-1 relative"
                  >
                    <button
                      type="button"
                      onClick={() => removePinnedProduct(item.id)}
                      className="absolute top-1.5 right-2 text-xs text-[#7D7B73] hover:text-red-400"
                    >
                      ×
                    </button>
                    <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-[#232D23] text-[#8FA680] font-medium">
                      {item.brand}
                    </span>
                    <p className="text-xs font-semibold text-[#F2EFE9] line-clamp-1">{item.name}</p>
                    <p className="text-[10px] text-[#9C9A92]">
                      {item.price || 'Saved'} {item.room ? `· ${item.room}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PINNED IDEAS MOODBOARD */}
      {activeTab === 'pinned_ideas' && (
        <div className="px-5 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#F2EFE9]">Pinned Ideas & Looks</h2>
              <p className="text-[11px] text-[#9C9A92]">Saved inspiration, paint shades & layouts</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPinIdeaModal(true)}
              className="px-3 py-1.5 rounded-full bg-[#8FA680] text-[#121612] text-xs font-semibold"
            >
              + Pin Idea
            </button>
          </div>

          {savedPins.length === 0 ? (
            <button
              type="button"
              onClick={() => setShowPinIdeaModal(true)}
              className="w-full p-6 rounded-2xl bg-[#1C221C] border border-dashed border-[#495B42] text-xs text-[#F2EFE9] text-center space-y-1"
            >
              <p className="font-semibold text-[#8FA680]">Start your Pinned Ideas board</p>
              <p className="text-[11px] text-[#9C9A92]">
                Save kitchen layouts, paint shades, or garden inspiration you love.
              </p>
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {savedPins.map((pin) => (
                <div
                  key={pin.id}
                  className="rounded-2xl bg-[#1E221E] border border-[#2E332E] overflow-hidden flex flex-col justify-between relative"
                >
                  <button
                    type="button"
                    onClick={() => handleDeleteIdea(pin.id)}
                    title="Remove pin"
                    className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/75 text-white text-xs flex items-center justify-center"
                  >
                    ×
                  </button>

                  {pin.image_url ? (
                    <img src={pin.image_url} alt={pin.title} className="w-full h-36 object-cover bg-[#121512]" />
                  ) : (
                    <div className="w-full h-24 bg-[#222B22] p-3 flex items-end">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8FA680]">
                        {pin.category || 'Idea'}
                      </span>
                    </div>
                  )}

                  <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
                    <div>
                      {pin.image_url && pin.category && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-[#8FA680]">
                          {pin.category}
                        </span>
                      )}
                      <p className="text-xs font-semibold text-[#F2EFE9] line-clamp-2">{pin.title}</p>
                      {pin.notes && <p className="text-[11px] text-[#9C9A92] line-clamp-2 mt-0.5">{pin.notes}</p>}
                    </div>

                    {pin.source_url && (
                      <a
                        href={pin.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-[11px] font-medium text-[#C6A467] underline pt-1"
                      >
                        Open Link →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#1E221E] border border-[#323832] overflow-hidden shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 flex items-center justify-between border-b border-[#2C322C]">
              <div>
                <p className="text-xs font-semibold text-[#F2EFE9]">{getRoomName(selectedPost.room_id)}</p>
                {selectedPost.stage && (
                  <p className="text-[10px] text-[#8FA680] font-medium">{selectedPost.stage}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Link href="/timeline" className="text-xs font-medium text-[#C6A467] underline">
                  Edit in Logbook
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedPost(null)}
                  className="w-7 h-7 rounded-full bg-[#2A302A] text-[#F2EFE9] flex items-center justify-center text-sm"
                >
                  ×
                </button>
              </div>
            </div>

            {selectedPost.image_url && (
              <div className="bg-black">
                {selectedPost.media_type === 'video' ? (
                  <video src={selectedPost.image_url} controls autoPlay playsInline className="w-full max-h-96" />
                ) : (
                  <img src={selectedPost.image_url} alt="" className="w-full max-h-96 object-contain mx-auto" />
                )}
              </div>
            )}

            <div className="px-4 pb-4 space-y-2">
              {selectedPost.caption && <p className="text-xs text-[#E5E2DA] leading-relaxed">{selectedPost.caption}</p>}
              {selectedPost.specs && selectedPost.specs.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedPost.specs.map((s, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-[#253025] text-[#8FA680] font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen 24h Story Viewer */}
      {storyIndex !== null && activeStories[storyIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between p-4"
          onClick={() =>
            storyIndex + 1 < activeStories.length ? setStoryIndex(storyIndex + 1) : setStoryIndex(null)
          }
        >
          <div className="space-y-3">
            <div className="flex gap-1">
              {activeStories.map((_, idx) => (
                <div key={idx} className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden">
                  <div className={`h-full bg-[#8FA680] ${idx <= storyIndex ? 'w-full' : 'w-0'}`} />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">
                {getRoomName(activeStories[storyIndex].room_id)} · 24h Story
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setStoryIndex(null)
                }}
                className="px-2.5 py-1 rounded-full bg-white/15 text-white"
              >
                Close ×
              </button>
            </div>
          </div>

          <div className="my-auto flex items-center justify-center overflow-hidden">
            {activeStories[storyIndex].image_url ? (
              activeStories[storyIndex].media_type === 'video' ? (
                <video
                  src={activeStories[storyIndex].image_url!}
                  autoPlay
                  playsInline
                  className="max-h-[70vh] rounded-2xl"
                />
              ) : (
                <img
                  src={activeStories[storyIndex].image_url!}
                  alt=""
                  className="max-h-[70vh] rounded-2xl object-contain"
                />
              )
            ) : (
              <p className="text-lg font-medium text-center px-6">{activeStories[storyIndex].caption}</p>
            )}
          </div>

          {activeStories[storyIndex].caption && activeStories[storyIndex].image_url && (
            <p className="text-center text-sm bg-black/65 px-4 py-2.5 rounded-2xl">
              {activeStories[storyIndex].caption}
            </p>
          )}
        </div>
      )}

      {/* Modal: Pin New Idea */}
      {showPinIdeaModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowPinIdeaModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#1E221E] border border-[#343B34] p-5 space-y-3.5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#F2EFE9]">Pin an Inspiration Idea</h2>
              <button type="button" onClick={() => setShowPinIdeaModal(false)} className="text-[#9C9A92] text-lg">
                ×
              </button>
            </div>

            <form onSubmit={handleCreateIdea} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Idea title (e.g., Sage Shaker Kitchen Island)"
                value={newIdea.title}
                onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#141714] text-[#F2EFE9] placeholder-[#6B6962] border border-[#323832] rounded-xl"
              />
              <select
                value={newIdea.category}
                onChange={(e) => setNewIdea({ ...newIdea, category: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#141714] text-[#F2EFE9] border border-[#323832] rounded-xl"
              >
                <option value="Interior Look">Interior Look</option>
                <option value="Exterior & Garden">Exterior & Garden</option>
                <option value="Kitchen & Dining">Kitchen & Dining</option>
                <option value="Bathroom">Bathroom</option>
                <option value="Paint & Materials">Paint & Materials</option>
              </select>
              <label className="block cursor-pointer px-3 py-2.5 text-xs bg-[#141714] border border-dashed border-[#495B42] rounded-xl text-[#9C9A92]">
                {ideaFile ? `Selected: ${ideaFile.name}` : '+ Attach inspiration screenshot (optional)'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setIdeaFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              <input
                type="url"
                placeholder="Source link (optional https://...)"
                value={newIdea.source_url}
                onChange={(e) => setNewIdea({ ...newIdea, source_url: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#141714] text-[#F2EFE9] placeholder-[#6B6962] border border-[#323832] rounded-xl"
              />
              <textarea
                rows={2}
                placeholder="Why you like it..."
                value={newIdea.notes}
                onChange={(e) => setNewIdea({ ...newIdea, notes: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#141714] text-[#F2EFE9] placeholder-[#6B6962] border border-[#323832] rounded-xl resize-none"
              />
              <button
                type="submit"
                disabled={pinningIdea}
                className="w-full py-2.5 bg-[#8FA680] text-[#121612] text-xs font-semibold rounded-xl"
              >
                {pinningIdea ? 'Pinning...' : 'Save to Pinned Ideas'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Pin Product Spec */}
      {showPinProductModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowPinProductModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#1E221E] border border-[#343B34] p-5 space-y-3.5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#F2EFE9]">Pin Paint or Product Spec</h2>
              <button type="button" onClick={() => setShowPinProductModal(false)} className="text-[#9C9A92] text-lg">
                ×
              </button>
            </div>
            <form onSubmit={handleAddPinnedProduct} className="space-y-2.5">
              <input
                type="text"
                required
                placeholder="Product / Paint name"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#141714] text-[#F2EFE9] placeholder-[#6B6962] border border-[#323832] rounded-xl"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Brand"
                  value={newProduct.brand}
                  onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                  className="px-3 py-2 text-xs bg-[#141714] text-[#F2EFE9] placeholder-[#6B6962] border border-[#323832] rounded-xl"
                />
                <input
                  type="text"
                  placeholder="Price (e.g. £56)"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  className="px-3 py-2 text-xs bg-[#141714] text-[#F2EFE9] placeholder-[#6B6962] border border-[#323832] rounded-xl"
                />
              </div>
              <select
                value={newProduct.room}
                onChange={(e) => setNewProduct({ ...newProduct, room: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#141714] text-[#F2EFE9] border border-[#323832] rounded-xl"
              >
                <option value="">Whole House</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={pinningProduct}
                className="w-full py-2.5 bg-[#8FA680] text-[#121612] text-xs font-semibold rounded-xl"
              >
                {pinningProduct ? 'Saving...' : 'Pin Spec'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}