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
        router.push('/feed')
        router.refresh()
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col justify-center px-6 py-12 max-w-md mx-auto text-white font-sans">
      <div className="rounded-3xl bg-[#181818] border border-[#262626] p-6 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">HomeWallr</h1>
          <p className="text-xs text-[#888]">Your private House Passport & renovation logbook</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-medium text-[#AAA] mb-1">Email</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#111] text-white placeholder-[#666] border border-[#262626] rounded-xl focus:outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#AAA] mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#111] text-white placeholder-[#666] border border-[#262626] rounded-xl focus:outline-none focus:border-white"
            />
          </div>

          {message && (
            <p className="text-xs text-amber-400 bg-amber-950/30 border border-amber-900/50 rounded-xl px-3 py-2">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-white hover:bg-[#E0E0E0] text-black text-xs font-semibold transition-colors"
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
            className="text-xs text-[#888] hover:text-white underline"
          >
            {isSignUp ? 'Already have an account? Sign in' : 'New homeowner? Create a free account'}
          </button>
        </div>
      </div>
    </div>
  )
}