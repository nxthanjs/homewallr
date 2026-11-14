'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()

  if (pathname === '/login') return null

  const isActive = (href: string) => pathname === href

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#181C18]/95 backdrop-blur-md border-t border-[#2A302A] px-3 py-2 flex justify-around items-center text-[10px] font-medium text-[#9C9A92] z-40">
      {/* House Dashboard */}
      <Link
        href="/"
        className={`flex flex-col items-center gap-1 min-w-[52px] transition-colors ${
          isActive('/') ? 'text-[#8FA680] font-semibold' : 'hover:text-[#F2EFE9]'
        }`}
      >
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill={isActive('/') ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path d="M12 3L3 10.5V20a1 1 0 001 1h5v-6h6v6h5a1 1 0 001-1v-9.5L12 3z" />
        </svg>
        <span>House</span>
      </Link>

      {/* Chronological Logbook */}
      <Link
        href="/timeline"
        className={`flex flex-col items-center gap-1 min-w-[52px] transition-colors ${
          isActive('/timeline') ? 'text-[#8FA680] font-semibold' : 'hover:text-[#F2EFE9]'
        }`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
        <span>Logbook</span>
      </Link>

      {/* Center + Action Button */}
      <Link
        href="/upload"
        className="w-11 h-11 rounded-full bg-[#8FA680] hover:bg-[#9FB690] text-[#121612] flex items-center justify-center shadow-md shadow-black/40 transition-transform active:scale-95"
        title="Log Milestone"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        </svg>
      </Link>

      {/* House Specs & Materials */}
      <Link
        href="/shop"
        className={`flex flex-col items-center gap-1 min-w-[52px] transition-colors ${
          isActive('/shop') ? 'text-[#8FA680] font-semibold' : 'hover:text-[#F2EFE9]'
        }`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 7h.01M3 3h8l10 10a2.83 2.83 0 010 4l-4 4a2.83 2.83 0 01-4 0L3 11V3z"
          />
        </svg>
        <span>Specs</span>
      </Link>

      {/* Profile / Passport */}
      <Link
        href="/profile"
        className={`flex flex-col items-center gap-1 min-w-[52px] transition-colors ${
          isActive('/profile') ? 'text-[#8FA680] font-semibold' : 'hover:text-[#F2EFE9]'
        }`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <circle cx="12" cy="8" r="3.5" />
          <path strokeLinecap="round" d="M5 19.5a7 7 0 0114 0" />
        </svg>
        <span>Profile</span>
      </Link>
    </nav>
  )
}