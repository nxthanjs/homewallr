'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '@/lib/supabase'

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

export function useFloorPlanJob() {
  const [jobStatus, setJobStatus] = useState<string | null>(null)
  const [jobResult, setJobResult] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [stepText, setStepText] = useState('')
  const [latestPlanUrl, setLatestPlanUrl] = useState<string | null>(null)

  // Animated progress step text & timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isGenerating) {
      setElapsedSeconds(0)
      setStepText('Analyzing architectural layout & walls...')
      interval = setInterval(() => {
        setElapsedSeconds((s) => {
          const next = s + 1
          if (next === 5) setStepText('Tracing exterior boundary & wall centerlines...')
          if (next === 15) setStepText('Detecting doors, windows, stairs & chimney breasts...')
          if (next === 25) setStepText('Extracting room dimensions & generating vector blueprint...')
          if (next === 35) setStepText('Finalizing architectural SVG & saving to House Passport...')
          return next
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isGenerating])

  // Fully operational AI floor plan generation workflow
  const startGeneration = async (file: File, userId: string, existingNames: string[] = []) => {
    setIsGenerating(true)
    setJobStatus('running')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/parse-floorplan', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Floor plan parsing failed')
      }

      const { image2D, rooms } = data

      // 1. Save generated 2D plan to houses table
      await supabase
        .from('houses')
        .upsert({ user_id: userId, plan_2d_url: image2D }, { onConflict: 'user_id' })

      // 2. Insert newly detected rooms if they don't already exist
      if (Array.isArray(rooms) && rooms.length > 0) {
        const lowerExisting = new Set(existingNames.map((n) => n.toLowerCase()))
        const newRoomsToInsert = rooms
          .filter((r) => !lowerExisting.has(r.name.toLowerCase()))
          .map((r) => ({
            user_id: userId,
            name: r.name,
            floor_level: 'Ground Floor',
            status: 'Planning',
            progress: 0,
            width_m: r.width_m || null,
            length_m: r.length_m || null,
          }))

        if (newRoomsToInsert.length > 0) {
          await supabase.from('rooms').insert(newRoomsToInsert)
        }
      }

      setLatestPlanUrl(image2D)
      setJobStatus('success')
    } catch (err: any) {
      console.error(err)
      alert('Floor plan generation error: ' + err.message)
      setJobStatus('error')
    } finally {
      setIsGenerating(false)
    }
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