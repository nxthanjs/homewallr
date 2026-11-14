'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface FloorPlanJobState {
  isGenerating: boolean
  elapsedSeconds: number
  stepText: string
  latestPlanUrl: string | null
  completedNotification: boolean
  errorMessage: string | null
  startGeneration: (file: File, userId: string, existingRoomNames: string[]) => Promise<void>
  dismissNotification: () => void
  dismissError: () => void
}

const GENERATION_STEPS = [
  'Uploading & scanning room dimensions...',
  'Stripping estate agent watermarks & text overlays...',
  'Projecting clean 90° walls onto isometric grid...',
  'Drawing doorway swings, windows & upright room labels...',
  'Polishing architectural vector & saving to your house...',
]

const FloorPlanContext = createContext<FloorPlanJobState | undefined>(undefined)

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

export function FloorPlanProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const [latestPlanUrl, setLatestPlanUrl] = useState<string | null>(null)
  const [completedNotification, setCompletedNotification] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isGenerating) {
      setElapsedSeconds(0)
      setStepIndex(0)
      return
    }

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)

    const stepper = setInterval(() => {
      setStepIndex((prev) => (prev + 1 < GENERATION_STEPS.length ? prev + 1 : prev))
    }, 10000)

    return () => {
      clearInterval(timer)
      clearInterval(stepper)
    }
  }, [isGenerating])

  const startGeneration = useCallback(
    async (file: File, userId: string, existingRoomNames: string[]) => {
      if (isGenerating) return

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {})
      }

      setIsGenerating(true)
      setCompletedNotification(false)
      setErrorMessage(null)

      try {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/parse-floorplan', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()

        if (!res.ok) {
          setErrorMessage(data.error || 'Could not generate floor plan.')
          setIsGenerating(false)
          return
        }

        let saved2dUrl: string | null = data.image2D || null

        if (data.image2D) {
          const blob2d = await dataUrlToBlob(data.image2D)
          const path2d = `floorplans/${userId}-2d-${Date.now()}.svg`
          const { error: err2d } = await supabase.storage
            .from('post-images')
            .upload(path2d, blob2d, { contentType: 'image/svg+xml' })

          if (!err2d) {
            saved2dUrl = supabase.storage.from('post-images').getPublicUrl(path2d).data.publicUrl
          }
        }

        if (saved2dUrl) {
          await supabase.from('houses').upsert(
            {
              user_id: userId,
              plan_2d_url: saved2dUrl,
            },
            { onConflict: 'user_id' }
          )
          setLatestPlanUrl(saved2dUrl)
        }

        if (Array.isArray(data.rooms)) {
          const normalizedExisting = new Set(existingRoomNames.map((n) => n.trim().toLowerCase()))
          for (const r of data.rooms) {
            const cleanName = String(r.name || '').trim()
            if (cleanName && !normalizedExisting.has(cleanName.toLowerCase())) {
              await supabase.from('rooms').insert([
                {
                  user_id: userId,
                  name: cleanName,
                  floor_level: r.floor_level || 'Ground Floor',
                  width_m: Number(r.width_m) || 3.5,
                  length_m: Number(r.length_m) || 3.0,
                  status: 'Planned',
                  progress: 0,
                },
              ])
              normalizedExisting.add(cleanName.toLowerCase())
            }
          }
        }

        setCompletedNotification(true)

        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('HomeWallr · Floor Plan Ready', {
            body: 'Your architectural floor plan has finished generating and is saved to your profile.',
          })
        }
      } catch {
        setErrorMessage('Something went wrong while generating your floor plan.')
      } finally {
        setIsGenerating(false)
      }
    },
    [isGenerating]
  )

  const dismissNotification = () => setCompletedNotification(false)
  const dismissError = () => setErrorMessage(null)

  const formatElapsed = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return mins > 0 ? `${mins}m ${rem}s` : `${rem}s`
  }

  return (
    <FloorPlanContext.Provider
      value={{
        isGenerating,
        elapsedSeconds,
        stepText: GENERATION_STEPS[stepIndex],
        latestPlanUrl,
        completedNotification,
        errorMessage,
        startGeneration,
        dismissNotification,
        dismissError,
      }}
    >
      {children}

      {/* Global Floating Status Pill (Visible across all pages while generating) */}
      {isGenerating && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm rounded-2xl bg-[#263022] text-white px-4 py-3 shadow-xl border border-[#4D6144] flex items-center justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs font-semibold flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-[#A3C293] animate-pulse" />
              Drafting Floor Plan ({formatElapsed(elapsedSeconds)})
            </p>
            <p className="text-[10px] text-stone-300 truncate">
              Feel free to browse HomeWallr while we draft it
            </p>
          </div>
          <span className="shrink-0 text-[10px] font-medium px-2 py-1 rounded-full bg-white/10 text-[#CFE0C5]">
            Background
          </span>
        </div>
      )}

      {/* Global Completion Toast Notification */}
      {completedNotification && !isGenerating && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm rounded-2xl bg-[#7A8F6D] text-white px-4 py-3.5 shadow-2xl border border-[#A5B999] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold">✨ Architectural Floor Plan Ready!</p>
            <p className="text-[11px] text-white/90">Saved to your house profile & rooms synced.</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                dismissNotification()
                router.push('/profile')
              }}
              className="px-3 py-1.5 rounded-full bg-white text-[#263022] text-xs font-semibold shadow-2xs"
            >
              View →
            </button>
            <button
              type="button"
              onClick={dismissNotification}
              aria-label="Dismiss notification"
              className="w-6 h-6 rounded-full bg-black/15 text-white text-xs flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Global Error Toast */}
      {errorMessage && !isGenerating && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm rounded-2xl bg-red-900 text-white px-4 py-3 shadow-xl flex items-center justify-between gap-3">
          <p className="text-xs">{errorMessage}</p>
          <button
            type="button"
            onClick={dismissError}
            className="w-6 h-6 rounded-full bg-white/15 text-white text-xs flex items-center justify-center shrink-0"
          >
            ×
          </button>
        </div>
      )}
    </FloorPlanContext.Provider>
  )
}

export function useFloorPlanJob() {
  const ctx = useContext(FloorPlanContext)
  if (!ctx) {
    throw new Error('useFloorPlanJob must be used inside FloorPlanProvider')
  }
  return ctx
}
// END OF FILE