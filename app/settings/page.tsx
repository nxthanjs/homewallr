'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      setLoading(false)
      if (error) {
        setMessage(error.message)
      } else {
        setMessage('Account created! Check your email or sign in now.')
        setIsSignUp(false)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (error) {
        setMessage(error.message)
      } else {
        router.push('/')
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#151815] flex flex-col justify-center px-6 py-12">
      <div className="rounded-3xl bg-[#1E221E] border border-[#2E352E] p-6 space-y-6 shadow-2xl">
        {/* Custom HomeWallr Emblem & Wordmark */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#222B22] border border-[#344234] text-[#8FA680] mx-auto">
            <svg
              className="w-8 h-8"
              viewBox="0 0 36 36"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 16L18 6l13 10" />
              <path d="M24 10.5V7h3v5.8" />
              <path d="M8 14.5v13l4.5-3.2c1.7.7 3.6 1.1 5.5 1.1 6.1 0 11-4.1 11-9.2v-1.7" />
              <path d="M15.2 24.3v-6.5h5.6v6.5" />
            </svg>
          </div>

          <h1 className="text-2xl font-serif font-bold text-[#F2EFE9] tracking-tight">
            HomeWallr
          </h1>
          <p className="text-xs text-[#9C9A92]">
            Your private House Passport & renovation logbook
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-medium text-[#C5C2B8] mb-1">Email</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#141714] text-[#F2EFE9] placeholder-[#6B6962] border border-[#323832] rounded-xl focus:outline-none focus:border-[#8FA680]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#C5C2B8] mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#141714] text-[#F2EFE9] placeholder-[#6B6962] border border-[#323832] rounded-xl focus:outline-none focus:border-[#8FA680]"
            />
          </div>

          {message && (
            <p className="text-xs text-[#C6A467] bg-[#26231B] border border-[#473E29] rounded-xl px-3 py-2">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#8FA680] hover:bg-[#9FB690] text-[#121612] text-xs font-semibold transition-colors"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create House Passport' : 'Sign In'}
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setMessage(null)
            }}
            className="text-xs text-[#9C9A92] hover:text-[#F2EFE9]"
          >
            {isSignUp ? 'Already have an account? Sign in' : 'New homeowner? Create a free account'}
          </button>
        </div>
      </div>
    </div>
  )
}