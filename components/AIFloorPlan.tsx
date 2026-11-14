'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useFloorPlanJob } from '@/components/FloorPlanContext'

export interface FloorPlanRoom {
  id: string
  name: string
  floor_level?: string | null
  width_m?: number | null
  length_m?: number | null
  status: string
  progress: number
}

interface AIFloorPlanProps {
  userId: string
  rooms: FloorPlanRoom[]
  plan2dUrl?: string | null
  plan3dUrl?: string | null
  onRoomsUpdated: () => Promise<void>
  showUploadButton?: boolean
}

export default function AIFloorPlan({
  userId,
  rooms,
  plan2dUrl,
  onRoomsUpdated,
  showUploadButton = true,
}: AIFloorPlanProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const {
    isGenerating,
    elapsedSeconds,
    stepText,
    latestPlanUrl,
    startGeneration,
  } = useFloorPlanJob()

  const [img2D, setImg2D] = useState<string | null>(plan2dUrl || null)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)

  useEffect(() => {
    if (plan2dUrl && !img2D) {
      setImg2D(plan2dUrl)
    }
  }, [plan2dUrl, img2D])

  useEffect(() => {
    if (latestPlanUrl && latestPlanUrl !== img2D) {
      setImg2D(latestPlanUrl)
      onRoomsUpdated()
    }
  }, [latestPlanUrl, img2D, onRoomsUpdated])

  const handleUploadAndGenerate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const existingNames = rooms.map((r) => r.name)
    if (fileInputRef.current) fileInputRef.current.value = ''
    await startGeneration(file, userId, existingNames)
  }

  const progressPercent = Math.min(92, Math.round((elapsedSeconds / 40) * 92) + 8)

  return (
    <div className="rounded-2xl bg-[#181C18] border border-[#2D352D] p-4 space-y-3.5">
      {/* Top Header & Upload Trigger */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-[#C6A467]">
            House Floor Plan
          </p>
          <h3 className="text-sm font-semibold text-[#F2EFE9]">Architectural Blueprint</h3>
        </div>

        <div className="flex items-center gap-2">
          {img2D && !isGenerating && (
            <button
              type="button"
              onClick={() => setFullscreenOpen(true)}
              className="text-[11px] font-medium text-[#8FA680] hover:text-[#A8BF99] underline px-1"
            >
              Expand ⤢
            </button>
          )}

          {showUploadButton && (
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#8FA680] hover:bg-[#9FB690] text-[#121612] text-xs font-semibold transition-colors">
              <span>
                {isGenerating
                  ? `Drafting (${elapsedSeconds}s)...`
                  : img2D
                  ? '↻ Re-scan Plan'
                  : '✨ Generate Plan'}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                disabled={isGenerating}
                onChange={handleUploadAndGenerate}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* Main Generated Floor Plan Vector */}
      {isGenerating ? (
        <div className="rounded-xl border border-[#364436] bg-[#1F271F] py-10 px-5 text-center space-y-3">
          <p className="text-xs font-semibold text-[#F2EFE9]">{stepText}</p>

          <div className="w-full max-w-xs mx-auto h-2 bg-[#121512] rounded-full overflow-hidden border border-[#2F3A2F]">
            <div
              className="h-full bg-[#8FA680] rounded-full transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="text-[11px] text-[#9C9A92] leading-relaxed">
            Drafting in the background (~30–60s). You can browse other pages and we&apos;ll notify you as soon as it&apos;s ready.
          </p>
        </div>
      ) : img2D ? (
        <button
          type="button"
          onClick={() => setFullscreenOpen(true)}
          className="block w-full rounded-xl overflow-hidden border border-[#2F382F] bg-[#F5F3EE] p-1 focus:outline-none"
        >
          <img
            src={img2D}
            alt="Styled 2D Architectural Floor Plan"
            className="w-full max-h-80 object-contain mx-auto rounded-lg"
          />
        </button>
      ) : (
        <div className="rounded-xl border border-dashed border-[#495B42] bg-[#141714] p-6 text-center space-y-1.5">
          <p className="text-xs font-medium text-[#F2EFE9]">Upload an estate agent plan or sketch</p>
          <p className="text-[11px] text-[#9C9A92]">
            AI will redraw your exact stairs, chimney breasts, windows, and doors into a clean architectural blueprint (~30–60s).
          </p>
        </div>
      )}

      {/* Quick Room Navigation Pills */}
      {rooms.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {rooms.map((room) => (
            <Link
              key={room.id}
              href={`/rooms/${room.id}`}
              className="px-2.5 py-1 rounded-full bg-[#1E221E] border border-[#2E352E] hover:border-[#8FA680] text-[11px] text-[#F2EFE9] flex items-center gap-1.5 transition-colors"
            >
              <span>{room.name}</span>
              <span className="text-[10px] font-semibold text-[#8FA680]">{room.progress}%</span>
            </Link>
          ))}
        </div>
      )}

      {/* Full-Screen Modal for Inspecting Details */}
      {fullscreenOpen && img2D && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex flex-col justify-between p-4"
          onClick={() => setFullscreenOpen(false)}
        >
          <div className="flex items-center justify-between text-[#F2EFE9]">
            <span className="text-xs font-semibold">2D Architectural Blueprint</span>
            <button
              type="button"
              onClick={() => setFullscreenOpen(false)}
              className="px-3 py-1 rounded-full bg-white/15 text-xs"
            >
              Close ×
            </button>
          </div>

          <div className="my-auto flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={img2D}
              alt="Full screen floor plan"
              className="max-h-[82vh] max-w-full rounded-2xl object-contain bg-[#F5F3EE] p-1"
            />
          </div>
          <div />
        </div>
      )}
    </div>
  )
}