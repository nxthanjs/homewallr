'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface RoomItem {
  id: string
  name: string
  floor_level: string | null
  status: string
  progress: number
  width_m?: number | null
  length_m?: number | null
}

interface PostItem {
  id: string
  room_id: string | null
  stage: string | null
  caption: string | null
  image_url: string | null
  media_type: 'image' | 'video' | null
  cost: number | null
  created_at: string
}

export default function HouseDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const [houseTitle, setHouseTitle] = useState('My Home Renovation')
  const [houseEra, setHouseEra] = useState('')
  const [location, setLocation] = useState('')
  const [plan2dUrl, setPlan2dUrl] = useState<string | null>(null)

  const [rooms, setRooms] = useState<RoomItem[]>([])
  const [allPosts, setAllPosts] = useState<PostItem[]>([])

  // Add Room Modal State
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [savingRoom, setSavingRoom] = useState(false)
  const [newRoom, setNewRoom] = useState({
    name: '',
    floor_level: 'Ground Floor',
    status: 'Planning',
  })

  const loadDashboard = async (userId: string) => {
    const { data: house } = await supabase
      .from('houses')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (house) {
      if (house.title) setHouseTitle(house.title)
      if (house.era) setHouseEra(house.era)
      if (house.location) setLocation(house.location)
      if (house.plan_2d_url) setPlan2dUrl(house.plan_2d_url)
    }

    const { data: roomData, error: roomErr } = await supabase
      .from('rooms')
      .select('id, name, floor_level, status, progress, width_m, length_m')
      .order('created_at', { ascending: true })

    if (roomErr) {
      console.error('Error loading rooms:', roomErr.message)
    } else if (roomData) {
      setRooms(roomData)
    }

    const { data: postData } = await supabase
      .from('posts')
      .select('id, room_id, stage, caption, image_url, media_type, cost, created_at')
      .eq('is_story', false)
      .order('created_at', { ascending: false })

    if (postData) setAllPosts(postData)
  }

  useEffect(() => {
    const init = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) {
        router.push('/login')
        return
      }
      setUser(auth.user)
      await loadDashboard(auth.user.id)
      setLoading(false)
    }
    init()
  }, [router])

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newRoom.name.trim()) return
    setSavingRoom(true)

    const { error } = await supabase.from('rooms').insert([
      {
        user_id: user.id,
        name: newRoom.name.trim(),
        floor_level: newRoom.floor_level,
        status: newRoom.status,
        progress: newRoom.status === 'Complete' ? 100 : newRoom.status === 'In Progress' ? 25 : 0,
      },
    ])

    setSavingRoom(false)
    if (error) {
      alert('Could not add room: ' + error.message)
      return
    }

    setNewRoom({ name: '', floor_level: 'Ground Floor', status: 'Planning' })
    setShowAddRoom(false)
    await loadDashboard(user.id)
  }

  if (loading) {
    return <div className="p-6 text-xs text-[#9C9A92]">Loading your house dashboard...</div>
  }

  const avgProgress =
    rooms.length > 0 ? Math.round(rooms.reduce((sum, r) => sum + (r.progress || 0), 0) / rooms.length) : 0
  const totalSpent = allPosts.reduce((sum, p) => sum + (Number(p.cost) || 0), 0)
  const completedRooms = rooms.filter((r) => r.progress >= 100 || r.status === 'Complete').length
  const recentPosts = allPosts.slice(0, 4)

  const getRoomName = (roomId: string | null) => {
    if (!roomId) return 'Whole House'
    return rooms.find((r) => r.id === roomId)?.name || 'Room'
  }

  const getRoomSpent = (roomId: string) =>
    allPosts
      .filter((p) => p.room_id === roomId)
      .reduce((sum, p) => sum + (Number(p.cost) || 0), 0)

  return (
    <div className="px-5 pt-4 pb-10 space-y-5 bg-[#151815] min-h-screen">
      {/* 1. House Overview Hero Card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#222B22] to-[#1B201B] border border-[#323E32] p-4 space-y-3.5 shadow-lg shadow-black/20">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#C6A467]">
              House Passport
            </p>
            <h1 className="text-lg font-semibold text-[#F2EFE9] leading-snug">{houseTitle}</h1>
            {(houseEra || location) && (
              <p className="text-xs text-[#9C9A92]">
                {[houseEra, location].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <Link
            href="/settings"
            className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#272F27] hover:bg-[#323B32] text-[#F2EFE9] border border-[#394539] transition-colors"
          >
            Edit House
          </Link>
        </div>

        {/* Overall Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#D5D2C8]">Overall Renovation</span>
            <span className="font-semibold text-[#8FA680]">{avgProgress}% Complete</span>
          </div>
          <div className="w-full h-2.5 bg-[#121512] rounded-full overflow-hidden border border-[#2C352C]">
            <div
              className="h-full bg-gradient-to-r from-[#7A8F6D] to-[#9FB690] rounded-full transition-all duration-500"
              style={{ width: `${Math.max(6, avgProgress)}%` }}
            />
          </div>
        </div>

        {/* 3 Key Metrics */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="rounded-xl bg-[#151915]/90 p-2.5 border border-[#2D362D]">
            <p className="text-[10px] text-[#9C9A92]">Rooms</p>
            <p className="text-sm font-semibold text-[#F2EFE9]">
              {completedRooms}/{rooms.length}{' '}
              <span className="text-[10px] font-normal text-[#9C9A92]">done</span>
            </p>
          </div>
          <div className="rounded-xl bg-[#151915]/90 p-2.5 border border-[#2D362D]">
            <p className="text-[10px] text-[#9C9A92]">Total Spent</p>
            <p className="text-sm font-semibold text-[#C6A467]">
              £{totalSpent.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl bg-[#151915]/90 p-2.5 border border-[#2D362D]">
            <p className="text-[10px] text-[#9C9A92]">Milestones</p>
            <p className="text-sm font-semibold text-[#F2EFE9]">{allPosts.length}</p>
          </div>
        </div>
      </div>

      {/* 2. Quick Actions Row */}
      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href="/upload"
          className="rounded-xl bg-[#8FA680] hover:bg-[#9FB690] text-[#121612] px-3.5 py-3 flex items-center justify-center gap-2 text-xs font-semibold shadow-sm transition-colors"
        >
          <span>+ Log Milestone</span>
        </Link>
        <button
          type="button"
          onClick={() => setShowAddRoom(true)}
          className="rounded-xl bg-[#1E221E] hover:bg-[#262B26] text-[#F2EFE9] border border-[#2F362F] px-3.5 py-3 flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors"
        >
          <span>+ Add Room</span>
        </button>
      </div>

      {/* 3. Floor Plan Quick Banner (If Not Uploaded Yet) */}
      {!plan2dUrl && (
        <Link
          href="/settings"
          className="block rounded-2xl bg-[#1B201B] border border-dashed border-[#495B42] p-4 space-y-1 hover:bg-[#212721] transition-colors"
        >
          <p className="text-xs font-semibold text-[#8FA680]">✨ Generate Your 2D Floor Plan</p>
          <p className="text-[11px] text-[#9C9A92] leading-relaxed">
            Upload an estate agent plan or sketch in Settings to build your architectural blueprint and auto-populate rooms.
          </p>
        </Link>
      )}

      {/* 4. Rooms & Spaces Grid */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9C9A92]">
            Rooms & Spaces ({rooms.length})
          </h2>
          <button
            type="button"
            onClick={() => setShowAddRoom(true)}
            className="text-xs font-medium text-[#8FA680] hover:text-[#A8BF99] underline"
          >
            + New Room
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="rounded-2xl bg-[#1E221E] border border-[#2E332E] p-6 text-center space-y-2">
            <p className="text-xs font-medium text-[#F2EFE9]">No rooms added yet</p>
            <p className="text-[11px] text-[#9C9A92]">
              Add your rooms manually or upload a floor plan in Settings to generate them automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {rooms.map((room) => {
              const roomSpent = getRoomSpent(room.id)
              return (
                <Link
                  key={room.id}
                  href={`/rooms/${room.id}`}
                  className="rounded-2xl bg-[#1E221E] border border-[#2E332E] hover:border-[#8FA680] p-3.5 space-y-2.5 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-medium text-[#9C9A92] truncate">
                        {room.floor_level || 'Room'}
                      </span>
                      <span className="text-[10px] font-semibold text-[#8FA680] shrink-0">
                        {room.progress}%
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#F2EFE9] truncate">{room.name}</h3>
                  </div>

                  <div className="space-y-1.5">
                    <div className="w-full h-1.5 bg-[#121512] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#8FA680] rounded-full"
                        style={{ width: `${Math.max(5, room.progress)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#9C9A92]">
                      <span>{room.status}</span>
                      {roomSpent > 0 ? (
                        <span className="text-[#C6A467] font-medium">
                          £{roomSpent.toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* 5. Recent Milestones Strip */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9C9A92]">
            Recent Milestones
          </h2>
          <Link href="/timeline" className="text-xs font-medium text-[#8FA680] hover:text-[#A8BF99] underline">
            Full Logbook →
          </Link>
        </div>

        {recentPosts.length === 0 ? (
          <div className="rounded-2xl bg-[#1E221E] border border-[#2E332E] p-5 text-center space-y-2">
            <p className="text-xs text-[#9C9A92]">Your renovation logbook is empty.</p>
            <Link
              href="/upload"
              className="inline-block px-4 py-1.5 rounded-full bg-[#8FA680] text-[#121612] text-xs font-semibold"
            >
              Post First Update
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentPosts.map((post) => (
              <Link
                key={post.id}
                href="/timeline"
                className="flex items-center gap-3 rounded-2xl bg-[#1E221E] border border-[#2E332E] p-2.5 hover:border-[#8FA680] transition-colors"
              >
                {post.image_url ? (
                  post.media_type === 'video' ? (
                    <video
                      src={post.image_url}
                      muted
                      playsInline
                      className="w-14 h-14 rounded-xl object-cover bg-[#121512] shrink-0"
                    />
                  ) : (
                    <img
                      src={post.image_url}
                      alt=""
                      className="w-14 h-14 rounded-xl object-cover bg-[#121512] shrink-0"
                    />
                  )
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-[#252D25] text-[#8FA680] flex items-center justify-center text-xs font-semibold shrink-0">
                    Log
                  </div>
                )}

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8FA680]">
                      {getRoomName(post.room_id)}
                    </span>
                    {post.stage && (
                      <span className="text-[10px] text-[#7D7B73]">· {post.stage}</span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-[#F2EFE9] line-clamp-1">
                    {post.caption || 'Renovation milestone logged'}
                  </p>
                  <p className="text-[10px] text-[#9C9A92]">
                    {new Date(post.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {post.cost ? (
                      <span className="text-[#C6A467]"> · £{Number(post.cost).toLocaleString()}</span>
                    ) : (
                      ''
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Add Room Modal */}
      {showAddRoom && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowAddRoom(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#1E221E] border border-[#343B34] p-5 space-y-3.5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#F2EFE9]">Add a Room or Space</h2>
              <button
                type="button"
                onClick={() => setShowAddRoom(false)}
                className="text-[#9C9A92] hover:text-white text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-[#C5C2B8] mb-1">Room Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Kitchen-Diner, Main Bathroom, Rear Garden"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#141714] text-[#F2EFE9] placeholder-[#6B6962] border border-[#323832] rounded-xl focus:outline-none focus:border-[#8FA680]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-[#C5C2B8] mb-1">Floor / Zone</label>
                  <select
                    value={newRoom.floor_level}
                    onChange={(e) => setNewRoom({ ...newRoom, floor_level: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#141714] text-[#F2EFE9] border border-[#323832] rounded-xl focus:outline-none focus:border-[#8FA680]"
                  >
                    <option value="Ground Floor">Ground Floor</option>
                    <option value="First Floor">First Floor</option>
                    <option value="Loft / Attic">Loft / Attic</option>
                    <option value="Exterior / Garden">Exterior / Garden</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#C5C2B8] mb-1">Stage</label>
                  <select
                    value={newRoom.status}
                    onChange={(e) => setNewRoom({ ...newRoom, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#141714] text-[#F2EFE9] border border-[#323832] rounded-xl focus:outline-none focus:border-[#8FA680]"
                  >
                    <option value="Planning">Planning</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Complete">Complete</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingRoom}
                className="w-full py-2.5 bg-[#8FA680] hover:bg-[#9FB690] text-[#121612] text-xs font-semibold rounded-xl transition-colors"
              >
                {savingRoom ? 'Adding...' : 'Create Room'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}