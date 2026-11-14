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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#161A16]/90 backdrop-blur-md border-t border-[#2A332A] px-6 py-3 flex justify-around items-center text-xs text-[#9C9A92]">
      <Link href="/" className={`hover:text-[#8FA680] ${pathname === '/' ? 'text-[#8FA680] font-semibold' : ''}`}>
        House
      </Link>
      <Link href="/floorplan" className={`hover:text-[#8FA680] ${pathname === '/floorplan' ? 'text-[#8FA680] font-semibold' : ''}`}>
        Floor Plan
      </Link>
      <Link href="/upload" className={`hover:text-[#8FA680] ${pathname === '/upload' ? 'text-[#8FA680] font-semibold' : ''}`}>
        + Update
      </Link>
      <Link href="/settings" className={`hover:text-[#8FA680] ${pathname === '/settings' ? 'text-[#8FA680] font-semibold' : ''}`}>
        Settings
      </Link>
    </div>
  )
}