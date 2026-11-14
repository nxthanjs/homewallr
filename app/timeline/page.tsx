'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Room {
  id: string
  name: string
}

interface Post {
  id: string
  room_id: string | null
  stage: string | null
  caption: string | null
  image_url: string | null
  media_type: 'image' | 'video' | null
  specs: string[] | null
  cost: number | null
  contractor: string | null
  created_at: string
}

export default function TimelinePage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedRoomId, setSelectedRoomId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')

  // Edit Post Modal State
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editCaption, setEditCaption] = useState('')
  const [editStage, setEditStage] = useState('')
  const [editRoomId, setEditRoomId] = useState('')
  const [editSpecs, setEditSpecs] = useState('')
  const [editCost, setEditCost] = useState('')
  const [editContractor, setEditContractor] = useState('')

  const fetchData = async () => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return router.push('/login')

    const { data: roomData } = await supabase
      .from('rooms')
      .select('id, name')
      .order('created_at', { ascending: true })
    if (roomData) setRooms(roomData)

    const { data: postData } = await supabase
      .from('posts')
      .select('*')
      .eq('is_story', false)
      .order('created_at', { ascending: false })
    if (postData) setPosts(postData)

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [router])

  const openEditModal = (post: Post) => {
    setEditingPost(post)
    setEditCaption(post.caption || '')
    setEditStage(post.stage || 'Stripping Out')
    setEditRoomId(post.room_id || '')
    setEditSpecs(Array.isArray(post.specs) ? post.specs.join(', ') : '')
    setEditCost(post.cost !== null && post.cost !== undefined ? String(post.cost) : '')
    setEditContractor(post.contractor || '')
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPost) return
    setSavingEdit(true)

    const parsedSpecs = editSpecs
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const { error } = await supabase
      .from('posts')
      .update({
        caption: editCaption.trim() || null,
        stage: editStage,
        room_id: editRoomId || null,
        specs: parsedSpecs,
        cost: editCost ? Number(editCost) : null,
        contractor: editContractor.trim() || null,
      })
      .eq('id', editingPost.id)

    setSavingEdit(false)
    if (error) {
      alert('Failed to update entry: ' + error.message)
      return
    }

    setEditingPost(null)
    await fetchData()
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Delete this renovation logbook entry permanently?')) return
    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (error) {
      alert('Error deleting entry: ' + error.message)
      return
    }
    setPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  const getRoomName = (roomId: string | null) => {
    if (!roomId) return 'Whole House'
    return rooms.find((r) => r.id === roomId)?.name || 'Room'
  }

  const filteredPosts = posts
    .filter((p) => (selectedRoomId === 'all' ? true : p.room_id === selectedRoomId))
    .filter((p) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      const roomName = getRoomName(p.room_id).toLowerCase()
      return (
        (p.caption || '').toLowerCase().includes(q) ||
        (p.stage || '').toLowerCase().includes(q) ||
        (p.contractor || '').toLowerCase().includes(q) ||
        roomName.includes(q) ||
        (p.specs || []).some((s) => s.toLowerCase().includes(q))
      )
    })
    .sort((a, b) => {
      const tA = new Date(a.created_at).getTime()
      const tB = new Date(b.created_at).getTime()
      return sortOrder === 'newest' ? tB - tA : tA - tB
    })

  const filteredSpend = filteredPosts.reduce((sum, p) => sum + (Number(p.cost) || 0), 0)

  if (loading) return <div className="p-6 text-xs text-[#9C9A92]">Loading renovation logbook...</div>

  return (
    <div className="px-5 pt-4 pb-12 space-y-4 bg-[#151815] min-h-screen">
      {/* Header & Summary */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-[#C6A467]">
            House Passport Archive
          </p>
          <h1 className="text-lg font-semibold text-[#F2EFE9]">Build Logbook</h1>
          <p className="text-xs text-[#9C9A92]">
            {filteredPosts.length} entries ·{' '}
            <span className="text-[#C6A467] font-medium">£{filteredSpend.toLocaleString()}</span> logged
          </p>
        </div>

        <Link
          href="/upload"
          className="px-3.5 py-2 rounded-full bg-[#8FA680] hover:bg-[#9FB690] text-[#121612] text-xs font-semibold transition-colors"
        >
          + Log Entry
        </Link>
      </div>

      {/* Search & Controls */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Search captions, paints, trades, rooms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3.5 py-2.5 text-xs bg-[#1E221E] text-[#F2EFE9] placeholder-[#6B6962] border border-[#2E332E] rounded-xl focus:outline-none focus:border-[#8FA680]"
        />

        <div className="flex items-center gap-2">
          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="flex-1 px-3 py-2 text-xs bg-[#1E221E] text-[#F2EFE9] border border-[#2E332E] rounded-xl focus:outline-none focus:border-[#8FA680]"
          >
            <option value="all">All Rooms ({posts.length})</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            className="px-3 py-2 text-xs bg-[#1E221E] text-[#C5C2B8] border border-[#2E332E] rounded-xl hover:border-[#8FA680]"
          >
            {sortOrder === 'newest' ? '↓ Newest' : '↑ Oldest'}
          </button>
        </div>
      </div>

      {/* Vertical Timeline Feed */}
      {filteredPosts.length === 0 ? (
        <div className="rounded-2xl bg-[#1E221E] border border-[#2E332E] p-8 text-center space-y-2">
          <p className="text-xs text-[#9C9A92]">No matching renovation logs found.</p>
          <Link
            href="/upload"
            className="inline-block px-4 py-2 rounded-full bg-[#8FA680] text-[#121612] text-xs font-semibold"
          >
            + Add Milestone
          </Link>
        </div>
      ) : (
        <div className="relative pl-5 border-l-2 border-[#2D382D] space-y-5 ml-1.5">
          {filteredPosts.map((post) => (
            <div key={post.id} className="relative">
              {/* Timeline Node Dot */}
              <span className="absolute -left-[25px] top-1.5 w-3 h-3 rounded-full bg-[#8FA680] ring-4 ring-[#151815]" />

              <div className="rounded-2xl bg-[#1E221E] border border-[#2E332E] overflow-hidden">
                {/* Card Top Meta */}
                <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-[#282E28]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#253025] text-[#8FA680]">
                      {getRoomName(post.room_id)}
                    </span>
                    {post.stage && (
                      <span className="text-[11px] font-medium text-[#C5C2B8]">{post.stage}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => openEditModal(post)}
                      className="text-[#8FA680] hover:underline font-medium"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePost(post.id)}
                      className="text-[#7D7B73] hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Media */}
                {post.image_url && (
                  <div className="bg-black">
                    {post.media_type === 'video' ? (
                      <video
                        src={post.image_url}
                        controls
                        playsInline
                        className="w-full max-h-80 object-contain mx-auto"
                      />
                    ) : (
                      <img
                        src={post.image_url}
                        alt={post.caption || 'Milestone photo'}
                        className="w-full max-h-80 object-cover"
                      />
                    )}
                  </div>
                )}

                {/* Details */}
                <div className="p-3.5 space-y-2">
                  {post.caption && (
                    <p className="text-xs text-[#F2EFE9] leading-relaxed">{post.caption}</p>
                  )}

                  {post.specs && post.specs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {post.specs.map((spec, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded bg-[#141714] border border-[#2C332C] text-[#C5C2B8]"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 text-[10px] text-[#9C9A92]">
                    <span>
                      {new Date(post.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {post.contractor ? ` · ${post.contractor}` : ''}
                    </span>

                    {post.cost !== null && post.cost !== undefined && (
                      <span className="font-semibold text-[#C6A467]">
                        £{Number(post.cost).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Post Modal */}
      {editingPost && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
          onClick={() => setEditingPost(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#1E221E] border border-[#343B34] p-5 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#F2EFE9]">Edit Logbook Entry</h2>
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="text-[#9C9A92] text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-[#9C9A92] mb-1">Room</label>
                  <select
                    value={editRoomId}
                    onChange={(e) => setEditRoomId(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-[#141714] text-[#F2EFE9] border border-[#323832] rounded-xl"
                  >
                    <option value="">Whole House</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-[#9C9A92] mb-1">Stage</label>
                  <select
                    value={editStage}
                    onChange={(e) => setEditStage(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-[#141714] text-[#F2EFE9] border border-[#323832] rounded-xl"
                  >
                    <option value="Planning & Design">Planning & Design</option>
                    <option value="Stripping Out">Stripping Out</option>
                    <option value="First Fix & Structural">First Fix & Structural</option>
                    <option value="Plastering & Prep">Plastering & Prep</option>
                    <option value="Second Fix & Flooring">Second Fix & Flooring</option>
                    <option value="Painting & Decorating">Painting & Decorating</option>
                    <option value="Furnishing & Styling">Furnishing & Styling</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-[#9C9A92] mb-1">Caption / Notes</label>
                <textarea
                  rows={3}
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#141714] text-[#F2EFE9] border border-[#323832] rounded-xl resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#9C9A92] mb-1">
                  Materials / Paint Specs (comma-separated)
                </label>
                <input
                  type="text"
                  value={editSpecs}
                  onChange={(e) => setEditSpecs(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#141714] text-[#F2EFE9] border border-[#323832] rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-[#9C9A92] mb-1">Cost (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#141714] text-[#F2EFE9] border border-[#323832] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#9C9A92] mb-1">Contractor / DIY</label>
                  <input
                    type="text"
                    value={editContractor}
                    onChange={(e) => setEditContractor(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#141714] text-[#F2EFE9] border border-[#323832] rounded-xl"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingEdit}
                className="w-full py-2.5 bg-[#8FA680] text-[#121612] text-xs font-semibold rounded-xl"
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}