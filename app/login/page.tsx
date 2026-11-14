'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [isSignUp, setIsSignUp] = useState(false)
  const [isResetMode, setIsResetMode] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    // Handle Password Reset Request
    if (isResetMode) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/settings`,
      })
      setLoading(false)
      if (error) {
        setMessage({ text: error.message, isError: true })
      } else {
        setMessage({ text: 'Password reset link sent to your email! Check your inbox.', isError: false })
      }
      return
    }

    // Enforce strong password requirements and confirmation matching on Sign Up
    if (isSignUp) {
      const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{10,}$/
      if (!strongPasswordRegex.test(password)) {
        setLoading(false)
        setMessage({
          text: 'Password must be at least 10 characters and include an uppercase letter, lowercase letter, number, and symbol.',
          isError: true,
        })
        return
      }

      if (password !== confirmPassword) {
        setLoading(false)
        setMessage({ text: 'Passwords do not match. Please re-enter.', isError: true })
        return
      }
    }

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (error) {
      setMessage({ text: error.message, isError: true })
    } else {
      if (isSignUp) {
        router.push('/onboarding')
      } else {
        router.push('/feed')
      }
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col justify-center px-6 py-12 max-w-md mx-auto text-white font-sans">
      <div className="rounded-3xl bg-[#181818] border border-[#262626] p-6 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">HomeWallr</h1>
          <p className="text-xs text-[#888]">
            {isResetMode
              ? 'Reset your account password'
              : 'Your private House Passport & renovation logbook'}
          </p>
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

          {!isResetMode && (
            <div>
              <label className="block text-[11px] font-medium text-[#AAA] mb-1">Password</label>
              <input
                type="password"
                required
                placeholder={isSignUp ? 'Min 10 chars, upper, lower, num & symbol' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-[#111] text-white placeholder-[#666] border border-[#262626] rounded-xl focus:outline-none focus:border-white"
              />
            </div>
          )}

          {isSignUp && (
            <div>
              <label className="block text-[11px] font-medium text-[#AAA] mb-1">Confirm Password</label>
              <input
                type="password"
                required
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-[#111] text-white placeholder-[#666] border border-[#262626] rounded-xl focus:outline-none focus:border-white"
              />
            </div>
          )}

          {message && (
            <p
              className={`text-xs px-3 py-2 rounded-xl border ${
                message.isError
                  ? 'text-red-400 bg-red-950/30 border-red-900/50'
                  : 'text-cyan-400 bg-cyan-950/30 border-cyan-900/50'
              }`}
            >
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-white hover:bg-[#E0E0E0] text-black text-xs font-semibold transition-colors"
          >
            {loading
              ? 'Please wait...'
              : isResetMode
              ? 'Send Reset Instructions'
              : isSignUp
              ? 'Create House Passport'
              : 'Sign In'}
          </button>
        </form>

        <div className="flex items-center justify-between text-xs text-[#888] pt-1">
          <button
            type="button"
            onClick={() => {
              setIsResetMode(!isResetMode)
              setMessage(null)
            }}
            className="hover:text-white underline"
          >
            {isResetMode ? 'Back to sign in' : 'Forgot password?'}
          </button>

          {!isResetMode && (
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setMessage(null)
              }}
              className="hover:text-white underline"
            >
              {isSignUp ? 'Have an account? Sign in' : 'Create an account'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}