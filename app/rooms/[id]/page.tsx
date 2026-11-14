'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface RoomDetail {
  id: string
  name: string
  floor_level: string | null
  status: string
  progress: number
  width_m: number | null
  length_m: number | null
}

interface RoomPost {
  id: string
  stage: string | null
  caption: string | null
  image_url: string | null
  media_type: 'image' | 'video' | null
  specs: string[] | null
  cost: number | null
  contractor: string | null
  created_at: string
}

function RoomDetailContent() {
  const params = useParams()
  const router = useRouter()
  const roomId = params?.id as string

  const [room, setRoom] = useState<RoomDetail | null>(null)
  const [posts, setPosts] = useState<RoomPost[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('Planning')

  useEffect(() => {
    if (!roomId || roomId === '[id]') return

    const loadRoom = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return router.push('/login')

      const { data: roomData } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (roomData) {
        setRoom(roomData)
        setProgress(roomData.progress || 0)
        setStatus(roomData.status || 'Planning')
      }

      const { data: postData } = await supabase
        .from('posts')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_story', false)
        .order('created_at', { ascending: false })

      if (postData) setPosts(postData)
      setLoading(false)
    }

    loadRoom()
  }, [roomId, router])

  const handleSaveRoomProgress = async () => {
    if (!room) return
    setSaving(true)
    const { error } = await supabase
      .from('rooms')
      .update({ progress, status })
      .eq('id', room.id)

    setSaving(false)
    if (error) {
      alert('Failed to update room: ' + error.message)
    } else {
      setRoom({ ...room, progress, status })
    }
  }

  const handleDeleteRoom = async () => {
    if (!room) return
    if (!confirm(`Delete "${room.name}"? Posts in this room will remain in your logbook.`)) return

    const { error } = await supabase.from('rooms').delete().eq('id', room.id)
    if (error) {
      alert('Error deleting room: ' + error.message)
      return
    }
    router.push('/')
  }

  if (loading) return <div className="p-6 text-xs text-[#888]">Loading room...</div>
  if (!room) return <div className="p-6 text-xs text-[#888]">Room not found.</div>

  const totalRoomSpent = posts.reduce((sum, p) => sum + (Number(p.cost) || 0), 0)
  const allSpecs = Array.from(new Set(posts.flatMap((p) => p.specs || [])))

  return (
    <div className="px-5 pt-6 pb-16 space-y-5 bg-[#111111] min-h-screen max-w-2xl mx-auto">
      {/* Back Bar */}
      <div className="flex items-center justify-between">
        <Link href="/profile" className="text-xs font-medium text-white hover:underline">
          ← Back to Profile
        </Link>
        <button
          type="button"
          onClick={handleDeleteRoom}
          className="text-[11px] text-[#777] hover:text-red-400"
        >
          Delete Room
        </button>
      </div>

      {/* Room Hero Card */}
      <div className="rounded-2xl bg-[#181818] border border-[#262626] p-5 space-y-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#888]">
              {room.floor_level || 'Room Space'}
            </p>
            <h1 className="text-xl font-semibold text-white">{room.name}</h1>
            {room.width_m && room.length_m && (
              <p className="text-xs text-[#888]">
                Dimensions: {room.width_m}m × {room.length_m}m
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#888]">Room Spend</p>
            <p className="text-base font-semibold text-white">
              £{totalRoomSpent.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Interactive Progress & Status Controls */}
        <div className="rounded-xl bg-[#111] border border-[#262626] p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#CCC]">Completion Progress</span>
            <span className="font-semibold text-white">{progress}%</span>
          </div>

          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={progress}
            onChange={(e) => {
              const val = Number(e.target.value)
              setProgress(val)
              if (val === 100) setStatus('Complete')
              else if (val > 0 && status === 'Planning') setStatus('In Progress')
            }}
            className="w-full accent-white"
          />

          <div className="flex items-center gap-2.5">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-[#181818] text-white border border-[#262626] rounded-xl"
            >
              <option value="Planning">Planning</option>
              <option value="In Progress">In Progress</option>
              <option value="Complete">Complete</option>
            </select>

            <button
              type="button"
              onClick={handleSaveRoomProgress}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-white hover:bg-[#E0E0E0] text-black text-xs font-semibold transition-colors"
            >
              {saving ? 'Saving...' : 'Save Status'}
            </button>
          </div>
        </div>
      </div>

      {/* Room Specs Summary */}
      {allSpecs.length > 0 && (
        <div className="rounded-2xl bg-[#181818] border border-[#262626] p-4 space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#888]">
            Materials & Paints Used Here
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {allSpecs.map((spec, idx) => (
              <span
                key={idx}
                className="text-[11px] px-3 py-1 rounded-full bg-[#222] text-[#CCC] font-medium"
              >
                {spec}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Room Posts & Photos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#888]">
            Room Logbook ({posts.length})
          </h2>
          <Link href="/upload" className="text-xs font-medium text-white underline">
            + Add Update
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-2xl bg-[#181818] border border-[#262626] p-8 text-center space-y-2">
            <p className="text-xs text-[#888]">No milestones logged for {room.name} yet.</p>
            <Link
              href="/upload"
              className="inline-block px-4 py-2 rounded-full bg-white text-black text-xs font-semibold"
            >
              + Log First Milestone
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="rounded-2xl bg-[#181818] border border-[#262626] overflow-hidden shadow-sm"
              >
                {post.image_url && (
                  <div className="bg-black">
                    {post.media_type === 'video' ? (
                      <video src={post.image_url} controls playsInline className="w-full max-h-72" />
                    ) : (
                      <img src={post.image_url} alt="" className="w-full max-h-72 object-cover" />
                    )}
                  </div>
                )}

                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-[#888]">
                    <span className="font-semibold text-white">{post.stage || 'Update'}</span>
                    <span>
                      {new Date(post.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {post.cost ? (
                        <span className="text-white font-semibold">
                          {' '}
                          · £{Number(post.cost).toLocaleString()}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  {post.caption && <p className="text-xs text-[#DDD] leading-relaxed">{post.caption}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function RoomDetailPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-[#888]">Loading room...</div>}>
      <RoomDetailContent />
    </Suspense>
  )
}