import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

export const metadata: Metadata = {
  title: 'HomeWallr — Your House Passport & Renovation Journal',
  description: 'Track your home renovation, floor plans, and house specs.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="bg-[#111111]">
      <body className="bg-[#111111] text-[#EDEDED] antialiased min-h-screen flex flex-col selection:bg-white selection:text-black">
        
        {/* Sleek Dark Header with RGB Accent */}
        <header className="sticky top-0 z-50 bg-[#181818]/95 backdrop-blur-md text-white border-b border-[#262626] px-5 py-3.5 flex items-center justify-between shadow-xs relative overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 animate-rgb opacity-80" />

          <Link href="/profile" className="flex items-center gap-2.5 group">
            {/* Camera-House Logo Badge */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-purple-500 to-pink-500 p-0.5 shadow-md animate-rgb group-hover:scale-105 transition-transform flex items-center justify-center">
              <div className="w-full h-full bg-[#181818] rounded-[10px] flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 10L12 3l9 7v10a2 2 0 01-2 2H5a2 2 0 01-2-2V10z" />
                  <circle cx="12" cy="14" r="3" />
                </svg>
              </div>
            </div>
            <span className="text-base font-bold tracking-tight text-white font-sans">
              HomeWallr
            </span>
          </Link>

          {/* Clean Right Actions: Post Button & Settings Cog */}
          <div className="flex items-center gap-3">
            <Link
              href="/upload"
              className="px-3.5 py-1.5 rounded-full bg-white text-black font-semibold hover:bg-[#E0E0E0] transition-colors shadow-xs text-xs"
            >
              + Post
            </Link>
            <Link
              href="/settings"
              aria-label="Settings"
              className="p-2 text-[#A3A3A3] hover:text-white hover:bg-[#262626] rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          </div>
        </header>

        {/* Main Application Content */}
        <main className="flex-1 pb-24">
          {children}
        </main>

        {/* Fixed Bottom Navigation Bar with Multi-Colored Icons */}
        <BottomNav />
      </body>
    </html>
  )
}