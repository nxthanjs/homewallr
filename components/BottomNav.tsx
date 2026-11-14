'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function BottomNav() {
  const [pathname, setPathname] = useState('')

  useEffect(() => {
    setPathname(window.location.pathname)
  }, [])

  if (pathname === '/login') return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#161A16]/95 backdrop-blur-md border-t border-[#2A332A] px-4 py-2 flex justify-around items-center text-[10px] text-[#9C9A92]">
      {/* Home */}
      <Link
        href="/"
        className={`flex flex-col items-center gap-1 transition-colors ${
          pathname === '/' ? 'text-[#8FA680] font-semibold' : 'hover:text-[#F2EFE9]'
        }`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span>Home</span>
      </Link>

      {/* Search / Specs Directory */}
      <Link
        href="/shop"
        className={`flex flex-col items-center gap-1 transition-colors ${
          pathname === '/shop' ? 'text-[#8FA680] font-semibold' : 'hover:text-[#F2EFE9]'
        }`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
        </svg>
        <span>Search</span>
      </Link>

      {/* Central + Action Button */}
      <Link
        href="/upload"
        className="flex flex-col items-center justify-center -mt-3 text-[#121612]"
      >
        <div className="w-10 h-10 rounded-full bg-[#8FA680] hover:bg-[#9FB690] flex items-center justify-center shadow-lg transition-transform active:scale-95 text-white font-bold text-xl">
          +
        </div>
      </Link>

      {/* Shop / Catalog */}
      <Link
        href="/shop"
        className={`flex flex-col items-center gap-1 transition-colors ${
          pathname === '/shop' ? 'text-[#8FA680] font-semibold' : 'hover:text-[#F2EFE9]'
        }`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        <span>Shop</span>
      </Link>

      {/* Profile */}
      <Link
        href="/profile"
        className={`flex flex-col items-center gap-1 transition-colors ${
          pathname === '/profile' ? 'text-[#8FA680] font-semibold' : 'hover:text-[#F2EFE9]'
        }`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <circle cx="12" cy="7" r="4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 21v-2a4 4 0 014-4h5a4 4 0 014 4v2" />
        </svg>
        <span>Profile</span>
      </Link>
    </div>
  )
}