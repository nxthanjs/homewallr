'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [handle, setHandle] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [houseName, setHouseName] = useState('')
  const [bio, setBio] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) router.push('/login')
    }
    checkAuth()
  }, [router])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (!cleanHandle || cleanHandle.length < 3) {
      setErrorMsg('Please choose a valid handle (at least 3 characters, letters/numbers/underscores only).')
      return
    }

    setLoading(true)
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    // Upsert the house passport profile details
    const { error } = await supabase.from('houses').upsert(
      {
        user_id: auth.user.id,
        handle: cleanHandle,
        display_name: displayName.trim() || null,
        house_name: houseName.trim() || 'My House',
        bio: bio.trim() || null,
      },
      { onConflict: 'user_id' }
    )

    setLoading(false)

    if (error) {
      if (error.code === '23505') {
        setErrorMsg('That @ handle is already taken by another homeowner. Please choose a different one.')
      } else {
        setErrorMsg(error.message)
      }
    } else {
      router.push('/feed')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col justify-center px-6 py-12 max-w-md mx-auto text-white font-sans">
      <div className="rounded-3xl bg-[#181818] border border-[#262626] p-6 space-y-6 shadow-2xl">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
            Welcome to HomeWallr
          </p>
          <h1 className="text-xl font-bold tracking-tight text-white">Set Up Your House Passport</h1>
          <p className="text-xs text-[#888]">Tell the community a bit about you and your property.</p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-[#AAA] mb-1">Account @ Handle *</label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-xs text-[#666]">@</span>
              <input
                type="text"
                required
                placeholder="natespurdle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2.5 text-xs bg-[#111] text-white placeholder-[#666] border border-[#262626] rounded-xl focus:outline-none focus:border-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#AAA] mb-1">Your Name / Names (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Nathan & Partner"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#111] text-white placeholder-[#666] border border-[#262626] rounded-xl focus:outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#AAA] mb-1">House / Property Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. 1930s Semi in Pandy"
              value={houseName}
              onChange={(e) => setHouseName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#111] text-white placeholder-[#666] border border-[#262626] rounded-xl focus:outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#AAA] mb-1">Short Bio (Optional)</label>
            <textarea
              rows={3}
              placeholder="Renovating room by room, plastering, herringbone floors..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#111] text-white placeholder-[#666] border border-[#262626] rounded-xl resize-none focus:outline-none focus:border-white"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded-xl px-3 py-2">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-white hover:bg-[#E0E0E0] text-black text-xs font-semibold transition-colors"
          >
            {loading ? 'Saving Profile...' : 'Complete Setup & Enter HomeWallr'}
          </button>
        </form>
      </div>
    </div>
  )
}