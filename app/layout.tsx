import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import './globals.css'
import { FloorPlanProvider } from '@/components/FloorPlanContext'
import BottomNav from '@/components/BottomNav'

export const metadata: Metadata = {
  title: 'HomeWallr',
  description: 'Your personal House Passport & home renovation logbook.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'HomeWallr',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#151815',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0E100E] text-[#F2EFE9] antialiased">
        <FloorPlanProvider>
          <div className="w-full sm:max-w-md sm:mx-auto min-h-screen bg-[#151815] sm:border-x sm:border-[#262B26] shadow-2xl relative pb-24">
            {/* Top Dark Architectural Header */}
            <header className="sticky top-0 z-30 bg-[#181C18]/95 backdrop-blur-md border-b border-[#2A302A] px-5 py-3.5 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5 group">
                {/* Custom HomeWallr House-Bubble Mark */}
                <svg
                  className="w-7 h-7 text-[#8FA680] group-hover:text-[#C6A467] transition-colors shrink-0"
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
                <span className="text-xl font-serif font-bold tracking-tight text-[#F2EFE9]">
                  HomeWallr
                </span>
              </Link>

              <div className="flex items-center gap-3.5 text-[#9C9A92]">
                <Link
                  href="/profile"
                  className="hover:text-[#F2EFE9] transition-colors"
                  title="Profile"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <circle cx="12" cy="12" r="9.5" />
                    <circle cx="12" cy="9.5" r="3" />
                    <path strokeLinecap="round" d="M6.8 18.2a6 6 0 0110.4 0" />
                  </svg>
                </Link>

                <Link
                  href="/notifications"
                  className="hover:text-[#F2EFE9] transition-colors"
                  title="Activity"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </Link>

                <Link
                  href="/settings"
                  className="hover:text-[#F2EFE9] transition-colors"
                  title="Settings"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <circle cx="12" cy="12" r="3" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                    />
                  </svg>
                </Link>
              </div>
            </header>

            {/* Main Page Content */}
            <main>{children}</main>

            {/* Dark Bottom Navigation Bar */}
            <BottomNav />
          </div>
        </FloorPlanProvider>
      </body>
    </html>
  )
}