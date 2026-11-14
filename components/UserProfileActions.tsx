'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface UserProfileActionsProps {
  targetUserId: string
  targetUserHandle: string
}

export default function UserProfileActions({ targetUserId, targetUserHandle }: UserProfileActionsProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [blocked, setBlocked] = useState(false)

  const handleBlockUser = async () => {
    if (!confirm(`Are you sure you want to block @${targetUserHandle}? They will no longer be able to see your house passport or interact with your posts.`)) {
      return
    }

    setBlocking(true)
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return

    // Insert into a 'blocked_users' table in Supabase
    const { error } = await supabase.from('blocked_users').insert([
      { blocker_id: auth.user.id, blocked_id: targetUserId }
    ])

    setBlocking(false)
    if (error) {
      alert('Error blocking user: ' + error.message)
    } else {
      setBlocked(true)
      setShowMenu(false)
    }
  }

  if (blocked) {
    return (
      <span className="text-xs text-red-400 font-medium px-3 py-1.5 rounded-full bg-red-950/30 border border-red-900/50">
        Blocked
      </span>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 rounded-full bg-[#1C1C1C] hover:bg-[#262626] border border-[#2A2A2A] text-white text-xs"
        title="More options"
      >
        •••
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#181818] border border-[#262626] shadow-xl py-1 z-50">
          <button
            type="button"
            onClick={handleBlockUser}
            disabled={blocking}
            className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-[#222] font-semibold flex items-center gap-2"
          >
            <span>🚫</span> {blocking ? 'Blocking...' : `Block @${targetUserHandle}`}
          </button>
        </div>
      )}
    </div>
  )
}