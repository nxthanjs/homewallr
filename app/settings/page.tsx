'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface BlockedRecord {
  id: string
  blocked_id: string
  unblocked_at?: string | null
}

export default function SettingsHubPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Privacy & Settings State
  const [isPrivate, setIsPrivate] = useState(false)
  const [savingPrivacy, setSavingPrivacy] = useState(false)
  const [privacyMsg, setPrivacyMsg] = useState<string | null>(null)

  // Handle State
  const [handle, setHandle] = useState('')
  const [savingHandle, setSavingHandle] = useState(false)
  const [handleMsg, setHandleMsg] = useState<{ text: string; isError: boolean } | null>(null)

  // Blocked Accounts State
  const [blockedList, setBlockedList] = useState<BlockedRecord[]>([])
  const [blockError, setBlockError] = useState<string | null>(null)

  // Password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPass, setUpdatingPass] = useState(false)
  const [passMsg, setPassMsg] = useState<{ text: string; isError: boolean } | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return router.push('/login')
      setUser(auth.user)

      // Fetch House Privacy & Handle
      const { data: house } = await supabase
        .from('houses')
        .select('is_private, handle')
        .eq('user_id', auth.user.id)
        .maybeSingle()

      if (house) {
        if (typeof house.is_private === 'boolean') {
          setIsPrivate(house.is_private)
        }
        if (house.handle) {
          setHandle(house.handle)
        }
      }

      // Fetch Blocked Accounts
      const { data: blocks } = await supabase
        .from('blocked_users')
        .select('*')
        .eq('blocker_id', auth.user.id)

      if (blocks) setBlockedList(blocks)

      setLoading(false)
    }
    init()
  }, [router])

  const handleTogglePrivacy = async (val: boolean) => {
    if (!user) return
    setIsPrivate(val)
    setSavingPrivacy(true)
    setPrivacyMsg(null)

    const { error } = await supabase
      .from('houses')
      .upsert({ user_id: user.id, is_private: val }, { onConflict: 'user_id' })

    setSavingPrivacy(false)
    if (error) {
      setPrivacyMsg('Failed to update privacy settings.')
    } else {
      setPrivacyMsg('Privacy settings updated successfully.')
      setTimeout(() => setPrivacyMsg(null), 3000)
    }
  }

  const handleUpdateHandle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSavingHandle(true)
    setHandleMsg(null)

    const cleanHandle = handle.trim().replace(/^@/, '')

    const { error } = await supabase
      .from('houses')
      .upsert({ user_id: user.id, handle: cleanHandle }, { onConflict: 'user_id' })

    setSavingHandle(false)
    if (error) {
      setHandleMsg({ text: 'Failed to update handle: ' + error.message, isError: true })
    } else {
      setHandle(cleanHandle)
      setHandleMsg({ text: 'Handle updated successfully.', isError: false })
      setTimeout(() => setHandleMsg(null), 3000)
    }
  }

  // Unblock Account
  const handleUnblock = async (recordId: string) => {
    const unblockTime = new Date().toISOString()
    const { error } = await supabase
      .from('blocked_users')
      .update({ unblocked_at: unblockTime })
      .eq('id', recordId)

    if (!error) {
      setBlockedList((prev) =>
        prev.map((b) => (b.id === recordId ? { ...b, unblocked_at: unblockTime } : b))
      )
    }
  }

  // Re-block Account with 24h Cooldown Safety Check
  const handleReblock = async (recordId: string, unblockedAt?: string | null) => {
    setBlockError(null)
    if (unblockedAt) {
      const hoursSinceUnblock = (Date.now() - new Date(unblockedAt).getTime()) / (1000 * 60 * 60)
      const COOLDOWN_HOURS = 24
      if (hoursSinceUnblock < COOLDOWN_HOURS) {
        const hoursLeft = Math.ceil(COOLDOWN_HOURS - hoursSinceUnblock)
        setBlockError(`For safety, you must wait ${hoursLeft}h before re-blocking this account.`)
        return
      }
    }

    const { error } = await supabase
      .from('blocked_users')
      .update({ unblocked_at: null })
      .eq('id', recordId)

    if (!error) {
      setBlockedList((prev) =>
        prev.map((b) => (b.id === recordId ? { ...b, unblocked_at: null } : b))
      )
    }
  }

  // Strong Password Validation (Min 10 chars, uppercase, lowercase, number, symbol)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPassMsg(null)

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{10,}$/

    if (!strongPasswordRegex.test(newPassword)) {
      setPassMsg({
        text: 'Password must be at least 10 characters and include an uppercase letter, lowercase letter, number, and symbol.',
        isError: true,
      })
      return
    }

    if (newPassword !== confirmPassword) {
      setPassMsg({ text: 'New passwords do not match.', isError: true })
      return
    }

    setUpdatingPass(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setUpdatingPass(false)

    if (error) {
      setPassMsg({ text: error.message, isError: true })
    } else {
      setPassMsg({ text: 'Password updated successfully with strong authentication.', isError: false })
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) return <div className="p-6 text-xs text-[#888]">Loading settings...</div>

  return (
    <div className="px-5 pt-6 pb-20 space-y-6 bg-[#111111] min-h-screen max-w-xl mx-auto text-white font-sans">
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#888]">
          Preferences & Account
        </p>
        <h1 className="text-xl font-bold text-white">Settings</h1>
      </div>

      <div className="space-y-5">
        {/* 1. House & Content Shortcuts */}
        <div className="rounded-2xl bg-[#181818] border border-[#262626] overflow-hidden shadow-sm divide-y divide-[#222]">
          <div className="px-4 py-3 bg-[#1C1C1C]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#888]">House & Logbook</h2>
          </div>

          <Link href="/timeline" className="flex items-center justify-between px-4 py-3.5 hover:bg-[#1C1C1C] transition-colors">
            <div>
              <p className="text-xs font-bold text-white">View Build Logbook</p>
              <p className="text-[11px] text-[#888]">Review timeline entries, stage progress, and spend</p>
            </div>
            <span className="text-[#888]">→</span>
          </Link>

          <Link href="/shop" className="flex items-center justify-between px-4 py-3.5 hover:bg-[#1C1C1C] transition-colors">
            <div>
              <p className="text-xs font-bold text-white">Edit House Specs & Paints</p>
              <p className="text-[11px] text-[#888]">Manage saved paint codes, tiles, and supplier links</p>
            </div>
            <span className="text-[#888]">→</span>
          </Link>

          <Link href="/floorplan" className="flex items-center justify-between px-4 py-3.5 hover:bg-[#1C1C1C] transition-colors">
            <div>
              <p className="text-xs font-bold text-white">Architectural Floor Plan</p>
              <p className="text-[11px] text-[#888]">View blueprints and room dimensions</p>
            </div>
            <span className="text-[#888]">→</span>
          </Link>
        </div>

        {/* 2. Your Handle Settings */}
        <div className="rounded-2xl bg-[#181818] border border-[#262626] p-4 space-y-3.5 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#888]">Your Handle</h2>
          <form onSubmit={handleUpdateHandle} className="space-y-3">
            <div className="flex items-center gap-2 bg-[#111] border border-[#262626] rounded-xl px-3 py-2">
              <span className="text-xs text-[#888]">@</span>
              <input
                type="text"
                required
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="username"
                className="w-full bg-transparent text-xs text-white focus:outline-none"
              />
            </div>
            {handleMsg && (
              <p className={`text-[11px] font-medium ${handleMsg.isError ? 'text-red-400' : 'text-cyan-400'}`}>
                {handleMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={savingHandle}
              className="px-4 py-2 bg-white hover:bg-[#E0E0E0] text-black text-xs font-semibold rounded-xl transition-colors"
            >
              {savingHandle ? 'Saving...' : 'Update Handle'}
            </button>
          </form>
        </div>

        {/* 3. Privacy & Social Settings */}
        <div className="rounded-2xl bg-[#181818] border border-[#262626] p-4 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#222] pb-2.5">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#888]">Privacy & Safety</h2>
              <p className="text-xs font-medium text-white pt-0.5">Private House Profile</p>
            </div>
            <button
              type="button"
              onClick={() => handleTogglePrivacy(!isPrivate)}
              disabled={savingPrivacy}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                isPrivate ? 'bg-cyan-500 justify-end' : 'bg-[#333] justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>
          <p className="text-[11px] text-[#888] leading-relaxed">
            When your house profile is private, new visitors must send a follow request to view your room breakdown, photos, and pinned ideas.
          </p>
          {privacyMsg && (
            <p className={`text-[11px] font-medium ${privacyMsg.includes('Failed') ? 'text-red-400' : 'text-cyan-400'}`}>
              {privacyMsg}
            </p>
          )}
        </div>

        {/* 4. Blocked Accounts Manager with 24h Cooldown */}
        <div className="rounded-2xl bg-[#181818] border border-[#262626] p-4 space-y-3 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#888]">Blocked Accounts</h2>
          <p className="text-[11px] text-[#888] leading-relaxed">
            Manage restricted accounts. To prevent harassment loops, unblocked accounts carry a 24-hour cooldown before they can be re-blocked.
          </p>

          {blockError && <p className="text-[11px] text-red-400 font-medium">{blockError}</p>}

          {blockedList.length === 0 ? (
            <p className="text-xs text-[#666] italic pt-1">No blocked accounts.</p>
          ) : (
            <div className="space-y-2 pt-1">
              {blockedList.map((item) => {
                const isUnblocked = item.unblocked_at !== null
                return (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-[#111] border border-[#262626]">
                    <div>
                      <p className="text-xs font-bold text-white">User ID: {item.blocked_id.slice(0, 8)}...</p>
                      <p className="text-[10px] text-[#777]">
                        {isUnblocked ? 'Unblocked (cooldown active)' : 'Blocked'}
                      </p>
                    </div>

                    {isUnblocked ? (
                      <button
                        type="button"
                        onClick={() => handleReblock(item.id, item.unblocked_at)}
                        className="px-3.5 py-1.5 rounded-lg bg-[#222] hover:bg-[#2A2A2A] text-xs font-semibold text-[#CCC] border border-[#333]"
                      >
                        Re-block
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUnblock(item.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white"
                      >
                        Unblock
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 5. Account Security (Strong Password) */}
        <div className="rounded-2xl bg-[#181818] border border-[#262626] p-4 space-y-3.5 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#888]">Account Security</h2>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-[#AAA] mb-1">New Password</label>
              <input
                type="password"
                required
                placeholder="Min 10 chars, uppercase, lowercase, number & symbol"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-[#111] text-white placeholder-[#666] border border-[#262626] rounded-xl focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#AAA] mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-[#111] text-white placeholder-[#666] border border-[#262626] rounded-xl focus:outline-none focus:border-white"
              />
            </div>

            {passMsg && (
              <p className={`text-[11px] font-medium ${passMsg.isError ? 'text-red-400' : 'text-cyan-400'}`}>
                {passMsg.text}
              </p>
            )}

            <button
              type="submit"
              disabled={updatingPass}
              className="px-4 py-2 bg-white hover:bg-[#E0E0E0] text-black text-xs font-semibold rounded-xl transition-colors"
            >
              {updatingPass ? 'Updating...' : 'Update Password Securely'}
            </button>
          </form>
        </div>

        {/* 6. Sign Out */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full py-3 rounded-xl bg-[#222] hover:bg-red-950/40 text-red-400 text-xs font-semibold border border-[#333] transition-colors"
          >
            Sign Out of HomeWallr
          </button>
        </div>
      </div>
    </div>
  )
}