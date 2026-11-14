'use client'

import { useState, useEffect, useRef } from 'react'
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
  is_story: boolean | null
  expires_at: string | null
  specs: string[] | null
  cost: number | null
  contractor: string | null
  created_at: string
  likes_count?: number
  is_liked?: boolean
  is_saved?: boolean
  comments?: CommentItem[]
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

interface SocialUserItem {
  user_id: string
  handle: string | null
  title: string | null
  owner_names: string | null
  avatar_url: string | null
}

export default function VisualProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<'posts' | 'house' | 'pinned_ideas' | 'saved_posts'>('posts')
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all')

  // Profile & House Metadata
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [plan2dUrl, setPlan2dUrl] = useState<string | null>(null)
  const [ownerNames, setOwnerNames] = useState('')
  const [location, setLocation] = useState('')
  const [bio, setBio] = useState('')
  const [houseTitle, setHouseTitle] = useState('The 1930s Semi')
  const [houseEra, setHouseEra] = useState('1930s Semi-Detached')
  const [currentUserHandle, setCurrentUserHandle] = useState<string>('homeowner')

  // Avatar & Story Menu State
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const avatarMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Social Stats & Modal State
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [socialModalType, setSocialModalType] = useState<'followers' | 'following' | null>(null)
  const [socialList, setSocialList] = useState<SocialUserItem[]>([])
  const [loadingSocial, setLoadingSocial] = useState(false)

  // Data collections
  const [rooms, setRooms] = useState<RoomCollection[]>([])
  const [gridPosts, setGridPosts] = useState<GridPost[]>([])
  const [savedPosts, setSavedPosts] = useState<GridPost[]>([])
  const [activeStories, setActiveStories] = useState<GridPost[]>([])
  const [savedPins, setSavedPins] = useState<SavedPin[]>([])
  const [pinnedProducts, setPinnedProducts] = useState<PinnedProduct[]>([])

  // Lightbox & Modals
  const [selectedPost, setSelectedPost] = useState<GridPost | null>(null)
  const [commentInput, setCommentInput] = useState('')
  const [storyIndex, setStoryIndex] = useState<number | null>(null)
  const [showPinIdeaModal, setShowPinIdeaModal] = useState(false)
  const [pinningIdea, setPinningIdea] = useState(false)
  const [ideaFile, setIdeaFile] = useState<File | null>(null)
  const [newIdea, setNewIdea] = useState({ title: '', category: 'Interior Look', source_url: '', notes: '' })

  const [showPinProductModal, setShowPinProductModal] = useState(false)
  const [pinningProduct, setPinningProduct] = useState(false)
  const [newProduct, setNewProduct] = useState({ name: '', brand: '', price: '', room: '', url: '' })

  // Close avatar menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setShowAvatarMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
        if (house.handle) setCurrentUserHandle(house.handle)
        if (Array.isArray(house.pinned_products)) setPinnedProducts(house.pinned_products)
      }

      await fetchRooms()

      const { count: followersC } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', auth.user.id)
        .eq('status', 'accepted')

      const { count: followingC } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', auth.user.id)
        .eq('status', 'accepted')

      setFollowersCount(followersC || 0)
      setFollowingCount(followingC || 0)

      // Fetch posts strictly scoped to user ID
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })

      if (postsData) {
        const now = Date.now()
        const stories = postsData.filter(
          (p) => p.is_story && (!p.expires_at || new Date(p.expires_at).getTime() > now)
        )
        const permanent = postsData.filter((p) => !p.is_story)

        // Enrich permanent posts with likes, comments, and saves
        const enhancedPosts = await Promise.all(
          permanent.map(async (p) => {
            const { count: likesCount } = await supabase
              .from('post_likes')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', p.id)

            const { data: userLike } = await supabase
              .from('post_likes')
              .select('id')
              .eq('post_id', p.id)
              .eq('user_id', auth.user.id)
              .maybeSingle()

            const { data: userSave } = await supabase
              .from('saved_posts')
              .select('id')
              .eq('post_id', p.id)
              .eq('user_id', auth.user.id)
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

        setActiveStories(stories)
        setGridPosts(enhancedPosts)
      }

      // Fetch Saved Posts bookmarks
      const { data: savedBookmarks } = await supabase
        .from('saved_posts')
        .select('post_id')
        .eq('user_id', auth.user.id)

      if (savedBookmarks && savedBookmarks.length > 0) {
        const postIds = savedBookmarks.map((s) => s.post_id)
        const { data: bookmarkedPostsData } = await supabase
          .from('posts')
          .select('*')
          .in('id', postIds)
          .order('created_at', { ascending: false })

        if (bookmarkedPostsData) {
          const enhancedSaved = await Promise.all(
            bookmarkedPostsData.map(async (p) => {
              const { count: likesCount } = await supabase
                .from('post_likes')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', p.id)

              const { data: userLike } = await supabase
                .from('post_likes')
                .select('id')
                .eq('post_id', p.id)
                .eq('user_id', auth.user.id)
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
                is_saved: true,
                comments: commentsData || [],
              }
            })
          )
          setSavedPosts(enhancedSaved)
        }
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

  // Handle Like Toggle
  const toggleLikePost = async () => {
    if (!selectedPost || !user) return
    const isCurrentlyLiked = selectedPost.is_liked
    const newLikedState = !isCurrentlyLiked
    const newCount = Math.max(0, (selectedPost.likes_count || 0) + (newLikedState ? 1 : -1))

    if (newLikedState) {
      await supabase.from('post_likes').insert([{ post_id: selectedPost.id, user_id: user.id }])
    } else {
      await supabase.from('post_likes').delete().eq('post_id', selectedPost.id).eq('user_id', user.id)
    }

    const updated = { ...selectedPost, is_liked: newLikedState, likes_count: newCount }
    setSelectedPost(updated)
    setGridPosts(gridPosts.map((p) => (p.id === updated.id ? updated : p)))
    setSavedPosts(savedPosts.map((p) => (p.id === updated.id ? updated : p)))
  }

  // Handle Save / Bookmark Toggle
  const toggleSavePost = async () => {
    if (!selectedPost || !user) return
    const isCurrentlySaved = selectedPost.is_saved
    const newSavedState = !isCurrentlySaved

    if (newSavedState) {
      await supabase.from('saved_posts').insert([{ post_id: selectedPost.id, user_id: user.id }])
      setSavedPosts([ { ...selectedPost, is_saved: true }, ...savedPosts ])
    } else {
      await supabase.from('saved_posts').delete().eq('post_id', selectedPost.id).eq('user_id', user.id)
      setSavedPosts(savedPosts.filter((p) => p.id !== selectedPost.id))
    }

    const updated = { ...selectedPost, is_saved: newSavedState }
    setSelectedPost(updated)
    setGridPosts(gridPosts.map((p) => (p.id === updated.id ? updated : p)))
  }

  // Handle Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPost || !user || !commentInput.trim()) return

    const content = commentInput.trim()
    const { data, error } = await supabase
      .from('post_comments')
      .insert([
        {
          post_id: selectedPost.id,
          user_id: user.id,
          user_handle: currentUserHandle,
          content: content,
        },
      ])
      .select()
      .single()

    if (!error && data) {
      const updatedComments = [...(selectedPost.comments || []), data]
      const updatedPost = { ...selectedPost, comments: updatedComments }
      setSelectedPost(updatedPost)
      setGridPosts(gridPosts.map((p) => (p.id === updatedPost.id ? updatedPost : p)))
      setSavedPosts(savedPosts.map((p) => (p.id === updatedPost.id ? updatedPost : p)))
      setCommentInput('')
    }
  }

  // Handle Avatar Image Upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingAvatar(true)
    setShowAvatarMenu(false)

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `avatars/${user.id}-${Date.now()}.${ext}`

    const { error: uploadErr } = await supabase.storage.from('post-images').upload(path, file)
    if (uploadErr) {
      alert('Error uploading avatar: ' + uploadErr.message)
      setUploadingAvatar(false)
      return
    }

    const { data } = supabase.storage.from('post-images').getPublicUrl(path)
    const newAvatarUrl = data.publicUrl

    const { error: updateErr } = await supabase
      .from('houses')
      .upsert({ user_id: user.id, avatar_url: newAvatarUrl }, { onConflict: 'user_id' })

    setUploadingAvatar(false)
    if (!updateErr) {
      setAvatarUrl(newAvatarUrl)
    } else {
      alert('Error updating profile picture: ' + updateErr.message)
    }
  }

  const openSocialModal = async (type: 'followers' | 'following') => {
    if (!user) return
    setSocialModalType(type)
    setLoadingSocial(true)

    const queryField = type === 'followers' ? 'following_id' : 'follower_id'
    const targetField = type === 'followers' ? 'follower_id' : 'following_id'

    const { data: followsData } = await supabase
      .from('follows')
      .select(targetField)
      .eq(queryField, user.id)
      .eq('status', 'accepted')

    if (followsData) {
      const userIds = followsData.map((f: any) => f[targetField])
      if (userIds.length > 0) {
        const { data: housesData } = await supabase
          .from('houses')
          .select('user_id, handle, title, owner_names, avatar_url')
          .in('user_id', userIds)

        setSocialList(housesData || [])
      } else {
        setSocialList([])
      }
    }
    setLoadingSocial(false)
  }

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

  if (loading) return <div className="p-6 text-xs text-[#888]">Loading profile...</div>

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
    <div className="pb-16 bg-[#111111] min-h-screen text-[#EDEDED] font-sans">
      <div className="px-5 pt-6 pb-4 space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold tracking-widest uppercase text-[#888]">
            PROFILE
          </p>
          <div className="flex items-center gap-2.5">
            <Link
              href="/timeline"
              className="text-xs font-semibold text-white bg-[#1A1A1A] hover:bg-[#262626] border border-[#2A2A2A] px-3.5 py-1.5 rounded-full transition-colors"
            >
              Logbook
            </Link>
            <Link
              href="/settings"
              className="text-xs font-semibold text-white bg-[#1A1A1A] hover:bg-[#262626] border border-[#2A2A2A] px-3.5 py-1.5 rounded-full transition-colors"
            >
              Edit Profile
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            accept="image/*"
            className="hidden"
          />

          <div className="relative" ref={avatarMenuRef}>
            <button
              type="button"
              onClick={() => setShowAvatarMenu(!showAvatarMenu)}
              className={`relative shrink-0 rounded-full p-0.5 transition-transform cursor-pointer ${
                hasStories
                  ? 'bg-gradient-to-tr from-cyan-500 via-purple-500 to-pink-500 active:scale-95 animate-rgb'
                  : 'bg-[#333]'
              }`}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={ownerNames || handle}
                  className="w-24 h-24 rounded-full object-cover border-2 border-[#111]"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#1E1E1E] text-white flex items-center justify-center text-3xl font-bold tracking-tight border-2 border-[#111]">
                  {displayInitial}
                </div>
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                  Saving...
                </div>
              )}
            </button>

            {hasStories && (
              <button
                type="button"
                onClick={() => setStoryIndex(0)}
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#111] shadow"
              >
                {activeStories.length} Story
              </button>
            )}

            {showAvatarMenu && (
              <div className="absolute left-0 mt-2 w-48 rounded-2xl bg-[#1A1A1A] border border-[#333] shadow-2xl py-1.5 z-50 text-white">
                {hasStories && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAvatarMenu(false)
                      setStoryIndex(0)
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-[#CCC] hover:bg-[#262626] hover:text-white transition-colors"
                  >
                    👁 View Active Story
                  </button>
                )}
                <Link
                  href="/upload"
                  onClick={() => setShowAvatarMenu(false)}
                  className="block w-full text-left px-4 py-2.5 text-xs font-semibold text-[#CCC] hover:bg-[#262626] hover:text-white transition-colors border-t border-[#222]"
                >
                  + Post a 24h Story
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setShowAvatarMenu(false)
                    fileInputRef.current?.click()
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-cyan-400 hover:bg-[#262626] transition-colors border-t border-[#222]"
                >
                  📷 Change Profile Photo
                </button>
              </div>
            )}
          </div>

          <div className="space-y-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-white truncate leading-tight">
              @{handle}
            </h1>
            <p className="text-sm font-medium text-[#A3A3A3] truncate">
              {ownerNames || houseTitle}
            </p>
            {bio && <p className="text-xs text-[#888] line-clamp-2 pt-0.5">{bio}</p>}
            {location && <p className="text-xs font-medium text-[#777] pt-0.5">{location}</p>}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 text-xs font-medium text-[#A3A3A3] border-t border-[#222]">
          <span>
            Houses: <strong className="font-bold text-white">1</strong>
          </span>
          <span>
            Rooms: <strong className="font-bold text-white">{rooms.length}</strong>
          </span>
          <span>
            Posts: <strong className="font-bold text-white">{gridPosts.length}</strong>
          </span>
          <button
            type="button"
            onClick={() => openSocialModal('followers')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Followers: <strong className="font-bold text-white">{followersCount}</strong>
          </button>
          <button
            type="button"
            onClick={() => openSocialModal('following')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Following: <strong className="font-bold text-white">{followingCount}</strong>
          </button>
        </div>
      </div>

      <div className="bg-[#161616] border-y border-[#222] px-5 py-4 space-y-3">
        <div className="max-w-2xl mx-auto space-y-3 w-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white">Renovation Stage</span>
            <span className="text-xs font-bold text-[#CCC]">{avgProgress}% Complete</span>
          </div>

          <div className="relative pt-1">
            <div className="w-full h-2.5 bg-[#0D0D0D] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(12, avgProgress)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-semibold text-[#777] pt-2">
              <span className={avgProgress >= 0 ? 'text-white' : ''}>Planning</span>
              <span className={avgProgress >= 40 ? 'text-white' : ''}>Structural</span>
              <span className={avgProgress >= 80 ? 'text-white' : ''}>Interior Style</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Navigation Tabs */}
      <div className="px-5 pt-3 border-b border-[#222] flex items-center justify-center gap-6 bg-[#111] sticky top-[57px] z-40 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('posts')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 shrink-0 ${
            activeTab === 'posts'
              ? 'border-white text-white'
              : 'border-transparent text-[#777] hover:text-[#CCC]'
          }`}
        >
          Posts ({gridPosts.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('house')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 shrink-0 ${
            activeTab === 'house'
              ? 'border-white text-white'
              : 'border-transparent text-[#777] hover:text-[#CCC]'
          }`}
        >
          My House
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pinned_ideas')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 shrink-0 ${
            activeTab === 'pinned_ideas'
              ? 'border-white text-white'
              : 'border-transparent text-[#777] hover:text-[#CCC]'
          }`}
        >
          Pinned Ideas ({savedPins.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('saved_posts')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 shrink-0 ${
            activeTab === 'saved_posts'
              ? 'border-white text-white'
              : 'border-transparent text-[#777] hover:text-[#CCC]'
          }`}
        >
          Saved ({savedPosts.length})
        </button>
      </div>

      {activeTab === 'posts' && (
        <div className="pt-4 px-3 max-w-5xl mx-auto space-y-4">
          {rooms.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-2 px-2">
              <button
                type="button"
                onClick={() => setSelectedRoomFilter('all')}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                  selectedRoomFilter === 'all'
                    ? 'bg-white text-black shadow-sm'
                    : 'bg-[#1C1C1C] text-[#AAA] border border-[#2A2A2A]'
                }`}
              >
                All Rooms
              </button>
              {rooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setSelectedRoomFilter(room.id)}
                  className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                    selectedRoomFilter === room.id
                      ? 'bg-white text-black shadow-sm'
                      : 'bg-[#1C1C1C] text-[#AAA] border border-[#2A2A2A]'
                  }`}
                >
                  {room.name}
                </button>
              ))}
            </div>
          )}

          {visiblePosts.length === 0 ? (
            <div className="mx-5 p-10 rounded-2xl bg-[#181818] border border-[#262626] text-center space-y-3">
              <p className="text-xs font-medium text-[#888]">No photos or videos posted yet.</p>
              <Link
                href="/upload"
                className="inline-block px-5 py-2.5 rounded-full bg-white text-black text-xs font-semibold"
              >
                + Post First Update
              </Link>
            </div>
          ) : (
            <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
              {visiblePosts.map((post) => {
                const isVideo = post.media_type === 'video'
                const hasSpecs = Array.isArray(post.specs) && post.specs.length > 0
                return (
                  <div key={post.id} className="break-inside-avoid">
                    <button
                      type="button"
                      onClick={() => setSelectedPost(post)}
                      className="relative w-full rounded-2xl overflow-hidden bg-[#1A1A1A] group text-left focus:outline-none block shadow-md hover:ring-2 hover:ring-white/40 transition-all cursor-pointer"
                    >
                      {post.image_url ? (
                        isVideo ? (
                          <video
                            src={post.image_url}
                            muted
                            playsInline
                            className="w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <img
                            src={post.image_url}
                            alt={post.caption || 'Renovation photo'}
                            className="w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        )
                      ) : (
                        <div className="w-full p-4 flex flex-col justify-between bg-[#1C1C1C] min-h-[140px]">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#888]">
                            {getRoomName(post.room_id)}
                          </span>
                          <p className="text-xs text-[#DDD] line-clamp-5 leading-snug pt-2">
                            {post.caption || post.stage || 'Note'}
                          </p>
                        </div>
                      )}

                      {isVideo && (
                        <span className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-black/75 text-white flex items-center justify-center text-[10px] shadow">
                          ▶
                        </span>
                      )}

                      {!isVideo && hasSpecs && (
                        <span className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center text-xs shadow">
                          🏷
                        </span>
                      )}

                      {post.room_id && post.image_url && (
                        <div className="absolute bottom-2.5 left-2.5 max-w-[85%] truncate bg-black/50 backdrop-blur-md border border-white/15 text-white text-[10px] font-medium px-2.5 py-1 rounded-full shadow">
                          {getRoomName(post.room_id)}
                        </div>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'saved_posts' && (
        <div className="pt-4 px-3 max-w-5xl mx-auto space-y-4">
          {savedPosts.length === 0 ? (
            <div className="mx-5 p-10 rounded-2xl bg-[#181818] border border-[#262626] text-center space-y-2">
              <p className="text-xs font-bold text-white">No saved posts yet</p>
              <p className="text-[11px] text-[#888]">Bookmark posts while browsing the feed to save them here.</p>
            </div>
          ) : (
            <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
              {savedPosts.map((post) => (
                <div key={post.id} className="break-inside-avoid">
                  <button
                    type="button"
                    onClick={() => setSelectedPost(post)}
                    className="relative w-full rounded-2xl overflow-hidden bg-[#1A1A1A] group text-left focus:outline-none block shadow-md hover:ring-2 hover:ring-white/40 transition-all cursor-pointer"
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

      {activeTab === 'house' && (
        <div className="px-5 pt-4 max-w-2xl mx-auto space-y-4">
          <div className="rounded-2xl bg-[#181818] border border-[#262626] p-5 space-y-3.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-white">{houseTitle}</h2>
                <p className="text-xs text-[#888]">{houseEra}</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#111] border border-[#262626] text-xs font-semibold text-white">
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

          <div className="rounded-2xl bg-[#181818] border border-[#262626] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#888]">
                House Specs & Paints ({pinnedProducts.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowPinProductModal(true)}
                className="text-xs font-semibold text-white underline hover:text-[#CCC]"
              >
                + Add Spec
              </button>
            </div>

            {pinnedProducts.length === 0 ? (
              <p className="text-xs text-[#777]">
                Save your paint colours, flooring, and hardware specs here for easy reference.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {pinnedProducts.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#111] border border-[#262626] space-y-1.5 relative"
                  >
                    <button
                      type="button"
                      onClick={() => removePinnedProduct(item.id)}
                      className="absolute top-2 right-2.5 text-sm text-[#777] hover:text-red-400"
                    >
                      ×
                    </button>
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-[#222] text-[#CCC] font-semibold">
                      {item.brand}
                    </span>
                    <p className="text-xs font-bold text-white line-clamp-1">{item.name}</p>
                    <p className="text-[11px] text-[#888]">
                      {item.price || 'Saved'} {item.room ? `· ${item.room}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'pinned_ideas' && (
        <div className="px-5 pt-4 max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Pinned Ideas & Looks</h2>
              <p className="text-xs text-[#888]">Saved inspiration, paint shades & layouts</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPinIdeaModal(true)}
              className="px-4 py-2 rounded-full bg-white text-black text-xs font-semibold shadow-sm hover:bg-[#E0E0E0]"
            >
              + Pin Idea
            </button>
          </div>

          {savedPins.length === 0 ? (
            <button
              type="button"
              onClick={() => setShowPinIdeaModal(true)}
              className="w-full p-8 rounded-2xl bg-[#181818] border border-dashed border-[#333] text-sm text-white text-center space-y-1.5"
            >
              <p className="text-xs font-bold text-white">Start your Pinned Ideas board</p>
              <p className="text-[11px] text-[#888]">
                Save kitchen layouts, paint shades, or garden inspiration you love.
              </p>
            </button>
          ) : (
            <div className="columns-2 gap-3 space-y-3">
              {savedPins.map((pin) => (
                <div
                  key={pin.id}
                  className="break-inside-avoid rounded-2xl bg-[#181818] border border-[#262626] overflow-hidden flex flex-col justify-between relative shadow-md"
                >
                  <button
                    type="button"
                    onClick={() => handleDeleteIdea(pin.id)}
                    title="Remove pin"
                    className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-black/75 text-white text-xs flex items-center justify-center shadow"
                  >
                    ×
                  </button>

                  {pin.image_url ? (
                    <img src={pin.image_url} alt={pin.title} className="w-full object-cover bg-[#0D0D0D]" />
                  ) : (
                    <div className="w-full h-24 bg-[#141414] p-3.5 flex items-end">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#888]">
                        {pin.category || 'Idea'}
                      </span>
                    </div>
                  )}

                  <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      {pin.image_url && pin.category && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#888]">
                          {pin.category}
                        </span>
                      )}
                      <p className="text-xs font-bold text-white line-clamp-2">{pin.title}</p>
                      {pin.notes && <p className="text-[11px] text-[#888] line-clamp-2 pt-1">{pin.notes}</p>}
                    </div>

                    {pin.source_url && (
                      <a
                        href={pin.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-[11px] font-semibold text-white underline pt-1"
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

      {socialModalType && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSocialModalType(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#181818] border border-[#333] p-5 space-y-4 shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <h2 className="text-sm font-bold capitalize">{socialModalType}</h2>
              <button
                type="button"
                onClick={() => setSocialModalType(null)}
                className="text-[#888] hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            {loadingSocial ? (
              <p className="text-xs text-[#888] text-center py-6">Loading list...</p>
            ) : socialList.length === 0 ? (
              <p className="text-xs text-[#888] text-center py-6">No accounts found.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {socialList.map((item: any) => {
                  const displayName = item.handle || item.owner_names || 'homeowner'
                  const initial = displayName[0].toUpperCase()
                  return (
                    <div
                      key={item.user_id}
                      className="p-3 rounded-xl bg-[#111] border border-[#262626] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.avatar_url ? (
                          <img
                            src={item.avatar_url}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover border border-[#262626] shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#222] text-white flex items-center justify-center text-xs font-bold border border-[#262626] shrink-0">
                            {initial}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">@{displayName}</p>
                          <p className="text-[11px] text-[#888] truncate">{item.title || 'House Passport'}</p>
                        </div>
                      </div>

                      <Link
                        href={`/profile/${item.user_id}`}
                        onClick={() => setSocialModalType(null)}
                        className="px-3 py-1 rounded-full bg-white text-black text-xs font-semibold shrink-0 ml-2"
                      >
                        View
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox Modal with Full Likes, Comments & Save Features */}
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
              <div className="flex items-center gap-3">
                <Link href="/timeline" className="text-xs font-semibold text-white underline">
                  Edit in Logbook
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedPost(null)}
                  className="w-8 h-8 rounded-full bg-[#262626] text-white flex items-center justify-center text-base hover:bg-[#333]"
                >
                  ×
                </button>
              </div>
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
                  onClick={toggleLikePost}
                  className={`flex items-center gap-1.5 font-medium cursor-pointer ${selectedPost.is_liked ? 'text-red-500' : 'text-[#AAA] hover:text-white'}`}
                >
                  <span>{selectedPost.is_liked ? '❤️' : '🤍'}</span>
                  <span className="text-xs">{selectedPost.likes_count}</span>
                </button>
                <span className="text-xs text-[#AAA]">💬 {(selectedPost.comments || []).length} Comments</span>

                <button
                  type="button"
                  onClick={toggleSavePost}
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

                <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-1">
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

      {storyIndex !== null && activeStories[storyIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between p-5"
          onClick={() =>
            storyIndex + 1 < activeStories.length ? setStoryIndex(storyIndex + 1) : setStoryIndex(null)
          }
        >
          <div className="space-y-3">
            <div className="flex gap-1">
              {activeStories.map((_, idx) => (
                <div key={idx} className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden">
                  <div className={`h-full bg-white ${idx <= storyIndex ? 'w-full' : 'w-0'}`} />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold">
                {getRoomName(activeStories[storyIndex].room_id)} · 24h Story
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setStoryIndex(null)
                }}
                className="px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-semibold"
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
              <p className="text-lg font-bold text-center px-6">{activeStories[storyIndex].caption}</p>
            )}
          </div>

          {activeStories[storyIndex].caption && activeStories[storyIndex].image_url && (
            <p className="text-center text-xs bg-black/80 px-5 py-3 rounded-2xl font-medium">
              {activeStories[storyIndex].caption}
            </p>
          )}
        </div>
      )}

      {showPinIdeaModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowPinIdeaModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#181818] border border-[#333] p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Pin an Inspiration Idea</h2>
              <button type="button" onClick={() => setShowPinIdeaModal(false)} className="text-[#888] text-xl">
                ×
              </button>
            </div>

            <form onSubmit={handleCreateIdea} className="space-y-3.5">
              <input
                type="text"
                required
                placeholder="Idea title (e.g., Shaker Kitchen Island)"
                value={newIdea.title}
                onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-[#111] text-white placeholder-[#666] border border-[#262626] rounded-xl"
              />
              <select
                value={newIdea.category}
                onChange={(e) => setNewIdea({ ...newIdea, category: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-[#111] text-white border border-[#262626] rounded-xl"
              >
                <option value="Interior Look">Interior Look</option>
                <option value="Exterior & Garden">Exterior & Garden</option>
                <option value="Kitchen & Dining">Kitchen & Dining</option>
                <option value="Bathroom">Bathroom</option>
                <option value="Paint & Materials">Paint & Materials</option>
              </select>
              <label className="block cursor-pointer px-3.5 py-3 text-xs bg-[#111] border border-dashed border-[#333] rounded-xl text-[#888]">
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
                className="w-full px-3.5 py-2.5 text-xs bg-[#111] text-white placeholder-[#666] border border-[#262626] rounded-xl"
              />
              <textarea
                rows={2}
                placeholder="Why you like it..."
                value={newIdea.notes}
                onChange={(e) => setNewIdea({ ...newIdea, notes: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-[#111] text-white placeholder-[#666] border border-[#262626] rounded-xl resize-none"
              />
              <button
                type="submit"
                disabled={pinningIdea}
                className="w-full py-3 bg-white text-black text-xs font-bold rounded-xl shadow-sm hover:bg-[#E0E0E0]"
              >
                {pinningIdea ? 'Pinning...' : 'Save to Pinned Ideas'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showPinProductModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowPinProductModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#181818] border border-[#333] p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Pin Paint or Product Spec</h2>
              <button type="button" onClick={() => setShowPinProductModal(false)} className="text-[#888] text-xl">
                ×
              </button>
            </div>
            <form onSubmit={handleAddPinnedProduct} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Product / Paint name"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-[#111] text-white placeholder-[#666] border border-[#262626] rounded-xl"
              />
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  placeholder="Brand"
                  value={newProduct.brand}
                  onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                  className="px-3.5 py-2.5 text-xs bg-[#111] text-white placeholder-[#666] border border-[#262626] rounded-xl"
                />
                <input
                  type="text"
                  placeholder="Price (e.g. £56)"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  className="px-3.5 py-2.5 text-xs bg-[#111] text-white placeholder-[#666] border border-[#262626] rounded-xl"
                />
              </div>
              <select
                value={newProduct.room}
                onChange={(e) => setNewProduct({ ...newProduct, room: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-[#111] text-white border border-[#262626] rounded-xl"
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
                className="w-full py-3 bg-white text-black text-xs font-bold rounded-xl shadow-sm hover:bg-[#E0E0E0]"
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