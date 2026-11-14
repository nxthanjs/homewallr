'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

interface FloorPlanContextType {
  activeFloor: string
  setActiveFloor: (floor: string) => void
}

const FloorPlanContext = createContext<FloorPlanContextType>({
  activeFloor: 'Ground Floor',
  setActiveFloor: () => {},
})

export function FloorPlanProvider({ children }: { children: React.ReactNode }) {
  const [activeFloor, setActiveFloor] = useState('Ground Floor')
  return (
    <FloorPlanContext.Provider value={{ activeFloor, setActiveFloor }}>
      {children}
    </FloorPlanContext.Provider>
  )
}

export function useFloorPlan() {
  return useContext(FloorPlanContext)
}

// Fully typed implementation for AI floor plan job state
export function useFloorPlanJob() {
  const [jobStatus, setJobStatus] = useState<string | null>(null)
  const [jobResult, setJobResult] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [stepText, setStepText] = useState('')
  const [latestPlanUrl, setLatestPlanUrl] = useState<string | null>(null)

  const startGeneration = () => {
    setIsGenerating(true)
    setJobStatus('running')
  }

  return {
    jobStatus,
    setJobStatus,
    jobResult,
    setJobResult,
    isGenerating,
    setIsGenerating,
    elapsedSeconds,
    setElapsedSeconds,
    stepText,
    setStepText,
    latestPlanUrl,
    setLatestPlanUrl,
    startGeneration,
  }
}

export function BottomNav() {
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || pathname === '/login') return null

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