'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface Room {
  id: string
  name: string
}

export default function UploadMilestonePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [postMode, setPostMode] = useState<'grid' | 'story'>('story') // Default to story or toggle
  const [roomId, setRoomId] = useState('')
  const [caption, setCaption] = useState('')
  
  // Grid-specific optional details
  const [showExtra, setShowExtra] = useState(false)
  const [stage, setStage] = useState('')
  const [specsInput, setSpecsInput] = useState('')
  const [cost, setCost] = useState('')
  const [contractor, setContractor] = useState('')

  // Story-specific Creative State
  const [storyText, setStoryText] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'normal' | 'mono' | 'warm' | 'cool' | 'dramatic'>('normal')
  const [selectedGif, setSelectedGif] = useState<string | null>(null)
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [showAudioPicker, setShowAudioPicker] = useState(false)

  // Framing, Aspect Ratio, Zoom & Pan State
  const [aspectRatio, setAspectRatio] = useState<'square' | 'portrait' | 'landscape'>('portrait')
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Room modal state for grid mode
  const [showNewRoomModal, setShowNewRoomModal] = useState(false)
  const [newRoomNameInput, setNewRoomNameInput] = useState('')
  const [creatingRoom, setCreatingRoom] = useState(false)

  const popularGifs = ['✨ Renovating', '🔨 Hard Work', '☕ Coffee Break', '🏡 Home Sweet Home', '🎨 Fresh Paint']
  const popularAudio = ['🎵 Chill Acoustic - LoFi', '🎶 Upbeat Indie Renovation', '🎧 Ambient House Vibes', '🎸 Classic Rock Build']

  useEffect(() => {
    const init = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return router.push('/login')
      setUser(auth.user)

      const { data: roomData } = await supabase
        .from('rooms')
        .select('id, name')
        .order('created_at', { ascending: true })
      if (roomData) {
        setRooms(roomData)
        if (roomData.length > 0) setRoomId(roomData[0].id)
      }
      setLoading(false)
    }
    init()
  }, [router])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0] || null
    setFile(chosen)
    if (chosen) {
      setPreviewUrl(URL.createObjectURL(chosen))
      setZoomLevel(1)
      setPosition({ x: 0, y: 0 })
    } else {
      setPreviewUrl(null)
    }
  }

  const handleRoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === 'NEW_ROOM') {
      setShowNewRoomModal(true)
    } else {
      setRoomId(val)
    }
  }

  const handleCreateNewRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoomNameInput.trim() || !user) return
    setCreatingRoom(true)

    const { data: createdRoom, error: err } = await supabase
      .from('rooms')
      .insert([{ user_id: user.id, name: newRoomNameInput.trim() }])
      .select('id, name')
      .single()

    setCreatingRoom(false)
    if (createdRoom) {
      setRooms([...rooms, createdRoom])
      setRoomId(createdRoom.id)
      setNewRoomNameInput('')
      setShowNewRoomModal(false)
    } else if (err) {
      alert('Could not create room: ' + err.message)
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const maxX = (rect.width * (zoomLevel - 1)) / 2
    const maxY = (rect.height * (zoomLevel - 1)) / 2

    const rawX = e.clientX - dragStart.x
    const rawY = e.clientY - dragStart.y

    const clampedX = Math.max(-maxX, Math.min(maxX, rawX))
    const clampedY = Math.max(-maxY, Math.min(maxY, rawY))

    setPosition({ x: clampedX, y: clampedY })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false)
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }

  const handleZoomChange = (newZoom: number) => {
    setZoomLevel(newZoom)
    if (newZoom === 1) setPosition({ x: 0, y: 0 })
  }

  // CSS Filter Class Mapping
  const filterClass =
    selectedFilter === 'mono'
      ? 'grayscale contrast-125'
      : selectedFilter === 'warm'
      ? 'sepia-[0.3] brightness-105'
      : selectedFilter === 'cool'
      ? 'hue-rotate-15 contrast-105'
      : selectedFilter === 'dramatic'
      ? 'contrast-150 brightness-90'
      : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)

    let uploadedUrl: string | null = null
    let mediaType: 'image' | 'video' | null = null

    if (file) {
      const isVideo = file.type.startsWith('video/')
      mediaType = isVideo ? 'video' : 'image'
      const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg')
      const filePath = `${user.id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filePath, file)

      if (uploadError) {
        setSubmitting(false)
        alert('Upload failed: ' + uploadError.message)
        return
      }

      const { data: pubData } = supabase.storage.from('post-images').getPublicUrl(filePath)
      uploadedUrl = pubData.publicUrl
    }

    const isStory = postMode === 'story'
    const expiresAt = isStory ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null

    // For stories, store storyText, filter, gif, and audio in specs or extra columns
    const storySpecs = isStory
      ? [
          selectedFilter !== 'normal' ? `filter:${selectedFilter}` : '',
          selectedGif ? `gif:${selectedGif}` : '',
          selectedAudio ? `audio:${selectedAudio}` : '',
        ].filter(Boolean)
      : specsInput.split(',').map((s) => s.trim()).filter(Boolean)

    const finalCaption = isStory ? storyText : caption.trim()

    const { error } = await supabase.from('posts').insert([
      {
        user_id: user.id,
        room_id: isStory ? null : roomId || null,
        stage: isStory ? null : stage || null,
        caption: finalCaption || null,
        image_url: uploadedUrl,
        media_type: mediaType,
        is_story: isStory,
        expires_at: expiresAt,
        specs: storySpecs,
        cost: isStory ? null : cost ? Number(cost) : null,
        contractor: isStory ? null : contractor.trim() || null,
      },
    ])

    setSubmitting(false)
    if (error) {
      alert('Could not save entry: ' + error.message)
      return
    }

    router.push(isStory ? '/profile' : '/feed')
  }

  if (loading) return <div className="p-6 text-xs text-[#888]">Loading...</div>

  const aspectClass =
    aspectRatio === 'square'
      ? 'aspect-square'
      : aspectRatio === 'portrait'
      ? 'aspect-[4/5]'
      : 'aspect-video'

  return (
    <div className="px-5 pt-6 pb-20 space-y-4 bg-[#111111] min-h-screen max-w-2xl mx-auto text-white font-sans">
      <div>
        <p className="text-[10px] uppercase tracking-widest font-semibold text-[#888]">
          {postMode === 'story' ? 'Instant Sharing' : 'Document Progress'}
        </p>
        <h1 className="text-lg font-semibold text-white">
          {postMode === 'story' ? 'Create 24h Story' : 'Log Renovation Milestone'}
        </h1>
      </div>

      {/* Mode Switcher */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#181818] border border-[#262626]">
        <button
          type="button"
          onClick={() => setPostMode('story')}
          className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
            postMode === 'story' ? 'bg-white text-black' : 'text-[#888] hover:text-white'
          }`}
        >
          ⚡ 24h Quick Story
        </button>
        <button
          type="button"
          onClick={() => setPostMode('grid')}
          className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
            postMode === 'grid' ? 'bg-white text-black' : 'text-[#888] hover:text-white'
          }`}
        >
          🏡 Logbook & Grid Post
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo / Video Upload & Interactive Viewport */}
        {!previewUrl ? (
          <label className="block cursor-pointer rounded-2xl bg-[#181818] border border-dashed border-[#444] hover:border-white p-6 text-center space-y-3 transition-colors group">
            <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center relative group-hover:scale-105 transition-transform shadow-inner">
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 22V12h6v10" />
              </svg>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white text-black text-[10px] font-bold flex items-center justify-center shadow">
                ↑
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-white">+ Tap to Add Story Photo or Video</p>
              <p className="text-[11px] text-[#888]">
                Quick updates, live site progress, or on-the-go snaps
              </p>
            </div>
            <input type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
          </label>
        ) : (
          <div className="space-y-3">
            {/* Interactive Story Canvas Viewport */}
            <div className="relative w-full bg-black rounded-2xl overflow-hidden border border-[#262626] shadow-xl flex items-center justify-center select-none">
              <div
                ref={containerRef}
                className={`relative w-full ${aspectClass} overflow-hidden bg-[#0A0A0A] cursor-grab active:cursor-grabbing touch-none`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              >
                {file?.type.startsWith('video/') ? (
                  <video
                    src={previewUrl}
                    controls
                    autoPlay
                    muted
                    loop
                    style={{
                      transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel})`,
                    }}
                    className={`w-full h-full object-cover pointer-events-none transition-all ${filterClass}`}
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Story preview"
                    style={{
                      transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel})`,
                    }}
                    className={`w-full h-full object-cover pointer-events-none transition-all ${filterClass}`}
                  />
                )}

                {/* Live Overlays on Story Canvas */}
                {storyText && (
                  <div className="absolute inset-x-4 top-1/3 text-center pointer-events-none">
                    <span className="inline-block px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md text-white text-sm font-bold shadow-lg border border-white/20">
                      {storyText}
                    </span>
                  </div>
                )}

                {selectedGif && (
                  <div className="absolute bottom-16 left-4 pointer-events-none">
                    <span className="px-3 py-1 rounded-full bg-pink-500/80 text-white text-[11px] font-bold shadow border border-white/20">
                      {selectedGif}
                    </span>
                  </div>
                )}

                {selectedAudio && (
                  <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] text-cyan-400 font-semibold border border-white/10">
                    <span>🎵</span> {selectedAudio}
                  </div>
                )}

                <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white border border-white/10 shadow pointer-events-none">
                  {aspectRatio}
                </div>
              </div>
            </div>

            {/* Story Creative Tools Bar (Text, Filter, GIF, Audio) */}
            {postMode === 'story' && (
              <div className="space-y-2.5 bg-[#181818] p-3 rounded-xl border border-[#262626]">
                <p className="text-[10px] uppercase font-bold text-[#888] tracking-wider">Story Creative Studio</p>
                
                {/* Text Overlay Input */}
                <input
                  type="text"
                  placeholder="Add overlay text..."
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#111] text-white placeholder-[#666] border border-[#262626] rounded-lg"
                />

                {/* Filters Row */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-[10px] text-[#888] pr-1">Filter:</span>
                  {(['normal', 'mono', 'warm', 'cool', 'dramatic'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setSelectedFilter(f)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase ${
                        selectedFilter === f ? 'bg-white text-black' : 'bg-[#222] text-[#AAA]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {/* GIF & Audio Toggles */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowGifPicker(!showGifPicker)}
                    className="flex-1 py-1.5 rounded-lg bg-[#222] hover:bg-[#2A2A2A] text-[11px] font-medium text-[#CCC] border border-[#333]"
                  >
                    {selectedGif ? '✨ Change Sticker' : '✨ Add GIF Sticker'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAudioPicker(!showAudioPicker)}
                    className="flex-1 py-1.5 rounded-lg bg-[#222] hover:bg-[#2A2A2A] text-[11px] font-medium text-[#CCC] border border-[#333]"
                  >
                    {selectedAudio ? '🎵 Change Audio' : '🎵 Add Music Track'}
                  </button>
                </div>

                {/* GIF Dropdown Drawer */}
                {showGifPicker && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#262626]">
                    {popularGifs.map((g, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => { setSelectedGif(g); setShowGifPicker(false); }}
                        className="px-2.5 py-1 rounded-md bg-[#111] text-[10px] text-pink-400 font-semibold border border-[#333]"
                      >
                        {g}
                      </button>
                    ))}
                    <button type="button" onClick={() => { setSelectedGif(null); setShowGifPicker(false); }} className="text-[10px] text-[#888] px-2">Clear</button>
                  </div>
                )}

                {/* Audio Dropdown Drawer */}
                {showAudioPicker && (
                  <div className="space-y-1 pt-2 border-t border-[#262626]">
                    {popularAudio.map((a, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => { setSelectedAudio(a); setShowAudioPicker(false); }}
                        className="w-full text-left px-2.5 py-1 rounded-md bg-[#111] text-[10px] text-cyan-400 font-semibold border border-[#333]"
                      >
                        {a}
                      </button>
                    ))}
                    <button type="button" onClick={() => { setSelectedAudio(null); setShowAudioPicker(false); }} className="text-[10px] text-[#888] px-2">Clear</button>
                  </div>
                )}
              </div>
            )}

            {/* Aspect Ratio Toggles & Zoom */}
            <div className="flex items-center justify-between bg-[#181818] px-3.5 py-2.5 rounded-xl border border-[#262626]">
              <span className="text-xs font-medium text-[#888]">Frame Ratio:</span>
              <div className="flex items-center gap-1.5">
                {(['portrait', 'square', 'landscape'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => { setAspectRatio(r); setPosition({ x: 0, y: 0 }); }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase ${
                      aspectRatio === r ? 'bg-white text-black' : 'bg-[#222] text-[#AAA]'
                    }`}
                  >
                    {r === 'portrait' ? '4:5' : r === 'square' ? '1:1' : '16:9'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 bg-[#181818] px-4 py-2.5 rounded-xl border border-[#262626]">
              <span className="text-xs font-medium text-[#888] shrink-0">Zoom:</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoomLevel}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="w-full accent-white cursor-pointer"
              />
              <span className="text-xs font-mono text-[#AAA] shrink-0">{zoomLevel.toFixed(1)}x</span>
            </div>

            <button
              type="button"
              onClick={() => { setFile(null); setPreviewUrl(null); setZoomLevel(1); setPosition({ x: 0, y: 0 }); }}
              className="text-[11px] text-[#888] underline hover:text-white"
            >
              Choose a different media file
            </button>
          </div>
        )}

        {/* Grid-Only Fields (Hidden when in Story Mode) */}
        {postMode === 'grid' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-[#AAA] mb-1">Room / Space</label>
              <select
                value={roomId}
                onChange={handleRoomChange}
                className="w-full px-3.5 py-2.5 text-xs bg-[#181818] text-white border border-[#262626] rounded-xl focus:outline-none focus:border-white"
              >
                <option value="">Whole House</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
                <option disabled value="">──────────────</option>
                <option value="NEW_ROOM">+ Add New Room...</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#AAA] mb-1">Notes / Caption</label>
              <textarea
                rows={3}
                placeholder="What was completed today? Any lessons learned or supplier notes..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-4 py-3 text-xs bg-[#181818] text-white placeholder-[#666] border border-[#262626] rounded-xl resize-none focus:outline-none focus:border-white"
              />
            </div>

            {/* Collapsible Optional Details */}
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={() => setShowExtra(!showExtra)}
                className="text-xs font-semibold text-white hover:underline flex items-center gap-1.5"
              >
                <span>{showExtra ? '▾ Hide Stage, Materials, Cost & Contractor' : '▸ Add Stage, Materials, Cost & Contractor (Optional)'}</span>
              </button>

              {showExtra && (
                <div className="space-y-3.5 p-4 rounded-2xl bg-[#181818] border border-[#262626]">
                  <div>
                    <label className="block text-[11px] font-medium text-[#AAA] mb-1">Renovation Stage (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g., Plastering, First Fix, Styling"
                      value={stage}
                      onChange={(e) => setStage(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-[#111] text-white placeholder-[#666] border border-[#262626] rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#AAA] mb-1">Materials, Paints & Specs (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g., Ammonite, Oak Herringbone"
                      value={specsInput}
                      onChange={(e) => setSpecsInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-[#111] text-white placeholder-[#666] border border-[#262626] rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#AAA] mb-1">Cost (£ optional)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g., 240"
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-[#111] text-white placeholder-[#666] border border-[#262626] rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#AAA] mb-1">Done By (optional)</label>
                      <input
                        type="text"
                        placeholder="e.g., DIY, Electrician"
                        value={contractor}
                        onChange={(e) => setContractor(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-[#111] text-white placeholder-[#666] border border-[#262626] rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 rounded-xl bg-white hover:bg-[#E0E0E0] text-black text-xs font-semibold shadow-sm transition-colors"
        >
          {submitting ? 'Saving...' : postMode === 'story' ? '🚀 Publish 24h Story' : 'Save to House Passport'}
        </button>
      </form>

      {/* New Room Modal */}
      {showNewRoomModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#181818] border border-[#333] p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Add New Room or Space</h2>
              <button type="button" onClick={() => setShowNewRoomModal(false)} className="text-[#888] hover:text-white text-xl">×</button>
            </div>
            <form onSubmit={handleCreateNewRoom} className="space-y-3.5">
              <input
                type="text"
                required
                autoFocus
                placeholder="Room name (e.g., Master En-Suite)"
                value={newRoomNameInput}
                onChange={(e) => setNewRoomNameInput(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-[#111] text-white placeholder-[#666] border border-[#262626] rounded-xl"
              />
              <div className="flex items-center gap-2 pt-1">
                <button type="button" onClick={() => setShowNewRoomModal(false)} className="flex-1 py-2.5 bg-[#222] hover:bg-[#2A2A2A] text-xs font-semibold rounded-xl text-[#CCC]">Cancel</button>
                <button type="submit" disabled={creatingRoom} className="flex-1 py-2.5 bg-white hover:bg-[#E0E0E0] text-black text-xs font-bold rounded-xl shadow-sm">{creatingRoom ? 'Adding...' : 'Add Room'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}