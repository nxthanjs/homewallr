'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#181818]/95 backdrop-blur-md border-t border-[#262626] py-3 shadow-lg">
      <div className="max-w-xs mx-auto flex items-center justify-center gap-5 w-full">
        
        {/* 1. Feed / Home */}
        <Link href="/feed" className="flex flex-col items-center gap-1 group px-1">
          <svg className={`w-6 h-6 transition-transform group-hover:scale-110 ${pathname === '/feed' ? 'text-cyan-400' : 'text-[#888]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs font-medium text-[#EDEDED]">Feed</span>
        </Link>

        {/* 2. Explore / Search */}
        <Link href="/explore" className="flex flex-col items-center gap-1 group px-1">
          <svg className={`w-6 h-6 transition-transform group-hover:scale-110 ${pathname === '/explore' ? 'text-purple-400' : 'text-[#888]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-xs font-medium text-[#EDEDED]">Explore</span>
        </Link>

        {/* 3. Center Action Post Button */}
        <Link href="/upload" className="w-11 h-11 rounded-full bg-gradient-to-tr from-cyan-500 via-purple-500 to-pink-500 text-white flex items-center justify-center text-2xl font-bold shadow-md hover:scale-105 transition-transform shrink-0 mx-1">
          +
        </Link>

        {/* 4. Notifications / Activity */}
        <Link href="/notifications" className="flex flex-col items-center gap-1 group px-1">
          <svg className={`w-6 h-6 transition-transform group-hover:scale-110 ${pathname === '/notifications' ? 'text-amber-400' : 'text-[#888]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="text-xs font-medium text-[#EDEDED]">Activity</span>
        </Link>

        {/* 5. Profile / House Passport */}
        <Link href="/profile" className="flex flex-col items-center gap-1 group px-1">
          <svg className={`w-6 h-6 transition-transform group-hover:scale-110 ${pathname === '/profile' ? 'text-pink-400' : 'text-[#888]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-xs font-medium text-[#EDEDED]">Profile</span>
        </Link>
      </div>
    </nav>
  )
}