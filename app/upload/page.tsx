'use client'

import { useState, useEffect } from 'react'
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

  const [postMode, setPostMode] = useState<'grid' | 'story'>('grid')
  const [roomId, setRoomId] = useState('')
  const [stage, setStage] = useState('Painting & Decorating')
  const [caption, setCaption] = useState('')
  
  // Collapsible optional details toggle
  const [showExtra, setShowExtra] = useState(false)
  const [specsInput, setSpecsInput] = useState('')
  const [cost, setCost] = useState('')
  const [contractor, setContractor] = useState('')

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

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
    } else {
      setPreviewUrl(null)
    }
  }

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

    const parsedSpecs = specsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const isStory = postMode === 'story'
    const expiresAt = isStory ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null

    const { error } = await supabase.from('posts').insert([
      {
        user_id: user.id,
        room_id: roomId || null,
        stage,
        caption: caption.trim() || null,
        image_url: uploadedUrl,
        media_type: mediaType,
        is_story: isStory,
        expires_at: expiresAt,
        specs: parsedSpecs,
        cost: cost ? Number(cost) : null,
        contractor: contractor.trim() || null,
      },
    ])

    setSubmitting(false)
    if (error) {
      alert('Could not save entry: ' + error.message)
      return
    }

    router.push(isStory ? '/profile' : '/')
  }

  if (loading) return <div className="p-6 text-xs text-[#9C9A92]">Loading...</div>

  return (
    <div className="px-5 pt-4 pb-12 space-y-4 bg-[#151815] min-h-screen">
      <div>
        <p className="text-[10px] uppercase tracking-widest font-semibold text-[#C6A467]">
          Document Progress
        </p>
        <h1 className="text-lg font-semibold text-[#F2EFE9]">Log Renovation Milestone</h1>
      </div>

      {/* Mode Switcher */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#1E221E] border border-[#2E332E]">
        <button
          type="button"
          onClick={() => setPostMode('grid')}
          className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
            postMode === 'grid'
              ? 'bg-[#8FA680] text-[#121612]'
              : 'text-[#9C9A92] hover:text-[#F2EFE9]'
          }`}
        >
          Logbook & Grid Post
        </button>
        <button
          type="button"
          onClick={() => setPostMode('story')}
          className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
            postMode === 'story'
              ? 'bg-[#C6A467] text-[#121612]'
              : 'text-[#9C9A92] hover:text-[#F2EFE9]'
          }`}
        >
          24h Quick Story
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Photo / Video Upload Box */}
        <label className="block cursor-pointer rounded-2xl bg-[#1E221E] border border-dashed border-[#495B42] hover:border-[#8FA680] p-4 text-center space-y-2 transition-colors">
          {previewUrl ? (
            file?.type.startsWith('video/') ? (
              <video src={previewUrl} controls className="w-full max-h-64 rounded-xl mx-auto" />
            ) : (
              <img src={previewUrl} alt="Preview" className="w-full max-h-64 object-cover rounded-xl mx-auto" />
            )
          ) : (
            <div className="py-6 space-y-1">
              <p className="text-xs font-semibold text-[#8FA680]">+ Tap to Add Photo or Video</p>
              <p className="text-[11px] text-[#9C9A92]">
                Before & after shots, plastering progress, paint swatches, or receipts
              </p>
            </div>
          )}
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {/* Room & Stage */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-medium text-[#C5C2B8] mb-1">Room / Space</label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-3 py-2.5 text-xs bg-[#1E221E] text-[#F2EFE9] border border-[#2E332E] rounded-xl focus:outline-none focus:border-[#8FA680]"
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
            <label className="block text-[11px] font-medium text-[#C5C2B8] mb-1">Renovation Stage</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full px-3 py-2.5 text-xs bg-[#1E221E] text-[#F2EFE9] border border-[#2E332E] rounded-xl focus:outline-none focus:border-[#8FA680]"
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

        {/* Caption */}
        <div>
          <label className="block text-[11px] font-medium text-[#C5C2B8] mb-1">Notes / Caption</label>
          <textarea
            rows={3}
            placeholder="What was completed today? Any lessons learned or supplier notes..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs bg-[#1E221E] text-[#F2EFE9] placeholder-[#6B6962] border border-[#2E332E] rounded-xl resize-none focus:outline-none focus:border-[#8FA680]"
          />
        </div>

        {/* Collapsible Optional Details Toggle */}
        {postMode === 'grid' && (
          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={() => setShowExtra(!showExtra)}
              className="text-xs font-semibold text-[#8FA680] hover:underline flex items-center gap-1.5"
            >
              <span>{showExtra ? '▾ Hide Additional Specs, Cost & Contractor' : '▸ Add Materials, Cost & Contractor (Optional)'}</span>
            </button>

            {showExtra && (
              <div className="space-y-3 p-3.5 rounded-2xl bg-[#1E221E] border border-[#2E332E]">
                <div>
                  <label className="block text-[11px] font-medium text-[#C5C2B8] mb-1">
                    Materials, Paints & Specs (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Farrow & Ball Ammonite, Oak Herringbone"
                    value={specsInput}
                    onChange={(e) => setSpecsInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-[#141714] text-[#F2EFE9] placeholder-[#6B6962] border border-[#323832] rounded-xl focus:outline-none focus:border-[#8FA680]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-[#C5C2B8] mb-1">
                      Cost (£ optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g., 240"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-[#141714] text-[#F2EFE9] placeholder-[#6B6962] border border-[#323832] rounded-xl focus:outline-none focus:border-[#8FA680]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#C5C2B8] mb-1">
                      Done By (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., DIY, Electrician"
                      value={contractor}
                      onChange={(e) => setContractor(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-[#141714] text-[#F2EFE9] placeholder-[#6B6962] border border-[#323832] rounded-xl focus:outline-none focus:border-[#8FA680]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-[#8FA680] hover:bg-[#9FB690] text-[#121612] text-xs font-semibold shadow-sm transition-colors"
        >
          {submitting
            ? 'Saving...'
            : postMode === 'story'
            ? 'Post 24h Story'
            : 'Save to House Passport'}
        </button>
      </form>
    </div>
  )
}