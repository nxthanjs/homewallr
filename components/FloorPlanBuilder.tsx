'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export type WallSide = 'top' | 'bottom' | 'left' | 'right'
export type FeatureType = 'door' | 'window' | 'chimney' | 'stairs'

export interface RoomFeature {
  id: string
  type: FeatureType
  wall: WallSide
  offset: number // percentage along wall (10 to 90)
  size_m?: number // width in meters (e.g. 0.85m door, 1.4m window)
}

export interface PlannerRoom {
  id: string
  name: string
  status: string
  progress: number
  floor_level: string | null
  width_m: number | null
  length_m: number | null
  plan_x: number | null
  plan_y: number | null
  features?: RoomFeature[] | null
}

interface Props {
  rooms: PlannerRoom[]
  onRoomsChange: (rooms: PlannerRoom[]) => void
}

const SCALE = 28 // 28px = 1m
const SNAP = 7   // 7px = 0.25m

const DEFAULT_SIZES: Record<FeatureType, number> = {
  door: 0.85,
  window: 1.2,
  chimney: 1.1,
  stairs: 0.9,
}

export default function FloorPlanBuilder({ rooms, onRoomsChange }: Props) {
  const router = useRouter()
  const canvasRef = useRef<HTMLDivElement>(null)

  const [floor, setFloor] = useState<'Ground Floor' | 'First Floor'>('Ground Floor')
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d')
  const [editMode, setEditMode] = useState(false)
  const [zoom, setZoom] = useState(1)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null)
  const [activeWall, setActiveWall] = useState<WallSide>('top')

  const [interaction, setInteraction] = useState<{
    type: 'move' | 'resize-right' | 'resize-bottom' | 'resize-left' | 'resize-top'
    roomId: string
    startX: number
    startY: number
    origX: number
    origY: number
    origW: number
    origL: number
  } | null>(null)

  const floorRooms = rooms.filter((r) => (r.floor_level || 'Ground Floor') === floor)
  const selectedRoom = rooms.find((r) => r.id === selectedId) || null
  const selectedFeature = selectedRoom?.features?.find((f) => f.id === selectedFeatureId) || null
  const totalArea = floorRooms.reduce((s, r) => s + (Number(r.width_m) || 3.5) * (Number(r.length_m) || 3), 0)

  const startInteraction = (
    e: React.PointerEvent,
    room: PlannerRoom,
    type: 'move' | 'resize-right' | 'resize-bottom' | 'resize-left' | 'resize-top'
  ) => {
    e.stopPropagation()
    if (selectedId !== room.id) setSelectedFeatureId(null)
    setSelectedId(room.id)
    if (!editMode || viewMode === '3d') return

    setInteraction({
      type,
      roomId: room.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: Number(room.plan_x) || 20,
      origY: Number(room.plan_y) || 20,
      origW: Number(room.width_m) || 3.5,
      origL: Number(room.length_m) || 3.0,
    })
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!interaction) return
    const dx = Math.round((e.clientX - interaction.startX) / zoom / SNAP) * SNAP
    const dy = Math.round((e.clientY - interaction.startY) / zoom / SNAP) * SNAP
    const dMetersX = dx / SCALE
    const dMetersY = dy / SCALE

    onRoomsChange(
      rooms.map((r) => {
        if (r.id !== interaction.roomId) return r
        if (interaction.type === 'move') {
          return { ...r, plan_x: Math.max(0, interaction.origX + dx), plan_y: Math.max(0, interaction.origY + dy) }
        }
        if (interaction.type === 'resize-right') {
          return { ...r, width_m: Math.max(1.25, Number((interaction.origW + dMetersX).toFixed(2))) }
        }
        if (interaction.type === 'resize-bottom') {
          return { ...r, length_m: Math.max(1.25, Number((interaction.origL + dMetersY).toFixed(2))) }
        }
        if (interaction.type === 'resize-left') {
          const newW = Math.max(1.25, Number((interaction.origW - dMetersX).toFixed(2)))
          const actualDx = (interaction.origW - newW) * SCALE
          return { ...r, width_m: newW, plan_x: Math.max(0, interaction.origX + actualDx) }
        }
        if (interaction.type === 'resize-top') {
          const newL = Math.max(1.25, Number((interaction.origL - dMetersY).toFixed(2)))
          const actualDy = (interaction.origL - newL) * SCALE
          return { ...r, length_m: newL, plan_y: Math.max(0, interaction.origY + actualDy) }
        }
        return r
      })
    )
  }

  const handlePointerUp = async () => {
    if (!interaction) return
    const updated = rooms.find((r) => r.id === interaction.roomId)
    setInteraction(null)
    if (updated) {
      await supabase
        .from('rooms')
        .update({
          plan_x: updated.plan_x,
          plan_y: updated.plan_y,
          width_m: updated.width_m,
          length_m: updated.length_m,
        })
        .eq('id', updated.id)
    }
  }

  const addFeature = async (type: FeatureType) => {
    if (!selectedRoom) return
    const current = selectedRoom.features || []
    const newId = `${Date.now()}`
    const nextFeatures: RoomFeature[] = [
      ...current,
      { id: newId, type, wall: activeWall, offset: 50, size_m: DEFAULT_SIZES[type] },
    ]

    setSelectedFeatureId(newId)
    onRoomsChange(rooms.map((r) => (r.id === selectedRoom.id ? { ...r, features: nextFeatures } : r)))
    await supabase.from('rooms').update({ features: nextFeatures }).eq('id', selectedRoom.id)
  }

  const updateSelectedFeature = async (patch: Partial<RoomFeature>) => {
    if (!selectedRoom || !selectedFeatureId) return
    const nextFeatures = (selectedRoom.features || []).map((f) =>
      f.id === selectedFeatureId ? { ...f, ...patch } : f
    )
    onRoomsChange(rooms.map((r) => (r.id === selectedRoom.id ? { ...r, features: nextFeatures } : r)))
    await supabase.from('rooms').update({ features: nextFeatures }).eq('id', selectedRoom.id)
  }

  const deleteSelectedFeature = async () => {
    if (!selectedRoom || !selectedFeatureId) return
    const nextFeatures = (selectedRoom.features || []).filter((f) => f.id !== selectedFeatureId)
    setSelectedFeatureId(null)
    onRoomsChange(rooms.map((r) => (r.id === selectedRoom.id ? { ...r, features: nextFeatures } : r)))
    await supabase.from('rooms').update({ features: nextFeatures }).eq('id', selectedRoom.id)
  }

  return (
    <div className="space-y-3">
      {/* Header & View/Edit Controls */}
      <div className="flex justify-between items-center gap-2">
        <div>
          <h2 className="text-xs tracking-wider uppercase font-semibold text-stone-700">Architectural Plan</h2>
          <p className="text-[11px] text-stone-500">{floor} · {totalArea.toFixed(1)} m²</p>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Zoom Controls */}
          <div className="flex items-center bg-white border border-[#DCD6CA] rounded-full px-1.5 py-0.5 text-xs">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
              className="px-1.5 font-bold text-stone-700 hover:text-stone-950"
              title="Zoom Out"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="px-1 text-[10px] font-medium text-stone-500"
              title="Reset Zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.15).toFixed(2))))}
              className="px-1.5 font-bold text-stone-700 hover:text-stone-950"
              title="Zoom In"
            >
              +
            </button>
          </div>

          <button
            onClick={() => {
              setViewMode(viewMode === '2d' ? '3d' : '2d')
              setEditMode(false)
              setSelectedFeatureId(null)
            }}
            className={`text-xs font-medium px-2.5 py-1.5 rounded-full border transition-colors ${
              viewMode === '3d'
                ? 'bg-[#7A8F6D] text-white border-[#687C5C]'
                : 'bg-white text-stone-800 border-[#DCD6CA]'
            }`}
          >
            {viewMode === '3d' ? '2D' : '3D'}
          </button>

          {viewMode === '2d' && (
            <button
              onClick={() => {
                setEditMode(!editMode)
                setSelectedFeatureId(null)
                if (!editMode && floorRooms[0]) setSelectedId(floorRooms[0].id)
              }}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                editMode ? 'bg-[#3A3D38] text-white' : 'bg-[#EAE6DF] text-stone-800'
              }`}
            >
              {editMode ? 'Done' : 'Edit'}
            </button>
          )}
        </div>
      </div>

      {/* Floor Switcher */}
      <div className="flex gap-1.5 bg-[#EAE6DF] p-1 rounded-xl border border-[#DCD6CA]">
        {(['Ground Floor', 'First Floor'] as const).map((lvl) => (
          <button
            key={lvl}
            onClick={() => {
              setFloor(lvl)
              setSelectedFeatureId(null)
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              floor === lvl ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
            }`}
          >
            {lvl}
          </button>
        ))}
      </div>

      {/* Edit Mode Toolbar: Add Fixtures OR Adjust Selected Door/Window */}
      {editMode && selectedRoom && viewMode === '2d' && (
        <div className="p-3.5 rounded-2xl bg-[#DCE6D5]/80 border border-[#B9C9AE] space-y-2.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-[#2E3B27]">
              {selectedRoom.name} ({selectedRoom.width_m}m × {selectedRoom.length_m}m)
            </span>
            <span className="text-[10px] text-[#3B4D32]">Tap a door/window to resize</span>
          </div>

          {/* Selected Fixture Inspector */}
          {selectedFeature ? (
            <div className="p-2.5 rounded-xl bg-white border border-[#B9C9AE] space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold capitalize text-stone-900">
                  Editing {selectedFeature.type} ({selectedFeature.size_m || DEFAULT_SIZES[selectedFeature.type]}m)
                </span>
                <div className="flex gap-2.5">
                  <button onClick={deleteSelectedFeature} className="text-[11px] text-red-700 font-medium">
                    Remove
                  </button>
                  <button onClick={() => setSelectedFeatureId(null)} className="text-[11px] text-stone-500 underline">
                    Done
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <div className="flex justify-between text-[10px] text-stone-600">
                    <span>Position</span>
                    <span>{selectedFeature.offset}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    step={2}
                    value={selectedFeature.offset}
                    onChange={(e) => updateSelectedFeature({ offset: Number(e.target.value) })}
                    className="w-full accent-[#7A8F6D]"
                  />
                </label>

                <label className="space-y-1">
                  <div className="flex justify-between text-[10px] text-stone-600">
                    <span>Width</span>
                    <span>{selectedFeature.size_m || DEFAULT_SIZES[selectedFeature.type]}m</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={3.5}
                    step={0.1}
                    value={selectedFeature.size_m || DEFAULT_SIZES[selectedFeature.type]}
                    onChange={(e) => updateSelectedFeature({ size_m: Number(e.target.value) })}
                    className="w-full accent-[#7A8F6D]"
                  />
                </label>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-stone-700">Wall:</span>
                {(['top', 'right', 'bottom', 'left'] as WallSide[]).map((w) => (
                  <button
                    key={w}
                    onClick={() => setActiveWall(w)}
                    className={`px-2 py-0.5 rounded capitalize text-[11px] font-medium ${
                      activeWall === w ? 'bg-[#3A3D38] text-white' : 'bg-white text-stone-700'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                <button onClick={() => addFeature('door')} className="py-1.5 bg-white rounded-lg border border-[#B9C9AE] font-medium hover:bg-stone-50">
                  + Door
                </button>
                <button onClick={() => addFeature('window')} className="py-1.5 bg-white rounded-lg border border-[#B9C9AE] font-medium hover:bg-stone-50">
                  + Window
                </button>
                <button onClick={() => addFeature('chimney')} className="py-1.5 bg-white rounded-lg border border-[#B9C9AE] font-medium hover:bg-stone-50">
                  + Chimney
                </button>
                <button onClick={() => addFeature('stairs')} className="py-1.5 bg-white rounded-lg border border-[#B9C9AE] font-medium hover:bg-stone-50">
                  + Stairs
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Main Architectural Viewport */}
      <div
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            setZoom((z) => Math.min(1.8, Math.max(0.6, Number((z - e.deltaY * 0.002).toFixed(2)))))
          }
        }}
        style={
          viewMode === '2d'
            ? {
                backgroundImage:
                  'linear-gradient(to right, #DCD6CA 1px, transparent 1px), linear-gradient(to bottom, #DCD6CA 1px, transparent 1px)',
                backgroundSize: `${SCALE * zoom}px ${SCALE * zoom}px`,
              }
            : undefined
        }
        className="relative w-full h-88 rounded-2xl bg-[#EAE6DF] border-2 border-[#C7C0B2] overflow-auto touch-none select-none flex items-center justify-center"
      >
        <div
          style={
            viewMode === '3d'
              ? {
                  transform: `perspective(900px) rotateX(52deg) rotateZ(-38deg) scale(${0.82 * zoom})`,
                  transformStyle: 'preserve-3d',
                  width: '100%',
                  height: '100%',
                }
              : {
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  width: '100%',
                  height: '100%',
                }
          }
          className="relative transition-transform duration-200 ease-out"
        >
          {floorRooms.map((room) => {
            const w = (Number(room.width_m) || 3.5) * SCALE
            const h = (Number(room.length_m) || 3.0) * SCALE
            const x = Number(room.plan_x) ?? 20
            const y = Number(room.plan_y) ?? 20
            const isSelected = editMode && selectedId === room.id && viewMode === '2d'
            const features = room.features || []

            return (
              <div
                key={room.id}
                onPointerDown={(e) => startInteraction(e, room, 'move')}
                onClick={() => {
                  if (!editMode) router.push(`/rooms/${room.id}`)
                }}
                style={{
                  width: `${w}px`,
                  height: `${h}px`,
                  left: `${x}px`,
                  top: `${y}px`,
                  transformStyle: 'preserve-3d',
                }}
                className={`absolute border-2 flex flex-col items-center justify-center text-center transition-colors ${
                  editMode && viewMode === '2d' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                } ${isSelected ? 'border-[#3A3D38] ring-2 ring-[#7A8F6D] z-20' : 'border-[#4A4E47] z-10'} ${
                  room.progress === 100
                    ? 'bg-[#DCE6D5]'
                    : room.progress > 0
                    ? 'bg-[#F4EFE4]'
                    : 'bg-[#F8F6F1]'
                }`}
              >
                {viewMode === '3d' && (
                  <>
                    <div
                      style={{ height: '26px', transform: 'rotateX(-90deg)', transformOrigin: 'top' }}
                      className="absolute top-0 left-0 w-full bg-[#D5CFC2] border border-[#4A4E47]/50 pointer-events-none"
                    />
                    <div
                      style={{ width: '26px', transform: 'rotateY(90deg)', transformOrigin: 'right' }}
                      className="absolute top-0 right-0 h-full bg-[#C8C1B2] border border-[#4A4E47]/50 pointer-events-none"
                    />
                  </>
                )}

                {isSelected && (
                  <>
                    <div
                      onPointerDown={(e) => startInteraction(e, room, 'resize-right')}
                      className="absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-6 bg-[#7A8F6D] border border-white rounded-full cursor-ew-resize z-30 shadow"
                    />
                    <div
                      onPointerDown={(e) => startInteraction(e, room, 'resize-left')}
                      className="absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-6 bg-[#7A8F6D] border border-white rounded-full cursor-ew-resize z-30 shadow"
                    />
                    <div
                      onPointerDown={(e) => startInteraction(e, room, 'resize-bottom')}
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-3.5 bg-[#7A8F6D] border border-white rounded-full cursor-ns-resize z-30 shadow"
                    />
                    <div
                      onPointerDown={(e) => startInteraction(e, room, 'resize-top')}
                      className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-3.5 bg-[#7A8F6D] border border-white rounded-full cursor-ns-resize z-30 shadow"
                    />
                  </>
                )}

                {/* Proportional Architectural Fixtures */}
                {features.map((f) => {
                  const pxSize = (f.size_m || DEFAULT_SIZES[f.type]) * SCALE
                  const isVerticalWall = f.wall === 'left' || f.wall === 'right'
                  const isFeatSelected = editMode && selectedFeatureId === f.id

                  const posStyle: React.CSSProperties =
                    f.wall === 'top'
                      ? { top: '-3px', left: `${f.offset}%`, transform: 'translateX(-50%)' }
                      : f.wall === 'bottom'
                      ? { bottom: '-3px', left: `${f.offset}%`, transform: 'translateX(-50%)' }
                      : f.wall === 'left'
                      ? { left: '-3px', top: `${f.offset}%`, transform: 'translateY(-50%)' }
                      : { right: '-3px', top: `${f.offset}%`, transform: 'translateY(-50%)' }

                  const handleSelectFeature = (e: React.PointerEvent | React.MouseEvent) => {
                    if (!editMode) return
                    e.stopPropagation()
                    setSelectedId(room.id)
                    setSelectedFeatureId(f.id)
                  }

                  const ringClass = isFeatSelected ? 'ring-2 ring-[#7A8F6D] ring-offset-1' : ''

                  if (f.type === 'window') {
                    return (
                      <div
                        key={f.id}
                        onPointerDown={handleSelectFeature}
                        style={{
                          ...posStyle,
                          width: isVerticalWall ? '6px' : `${pxSize}px`,
                          height: isVerticalWall ? `${pxSize}px` : '6px',
                        }}
                        className={`absolute bg-sky-100 border border-stone-700 z-20 cursor-pointer ${ringClass}`}
                      />
                    )
                  }
                  if (f.type === 'door') {
                    return (
                      <div
                        key={f.id}
                        onPointerDown={handleSelectFeature}
                        style={{
                          ...posStyle,
                          width: `${pxSize}px`,
                          height: `${pxSize}px`,
                        }}
                        className={`absolute bg-[#EAE6DF]/90 border-b-2 border-r-2 border-dashed border-stone-700 rounded-br-full z-20 cursor-pointer ${ringClass}`}
                      />
                    )
                  }
                  if (f.type === 'chimney') {
                    return (
                      <div
                        key={f.id}
                        onPointerDown={handleSelectFeature}
                        style={{
                          ...posStyle,
                          width: isVerticalWall ? '11px' : `${pxSize}px`,
                          height: isVerticalWall ? `${pxSize}px` : '11px',
                        }}
                        className={`absolute bg-[#4A4E47] z-20 cursor-pointer ${ringClass}`}
                      />
                    )
                  }
                  return (
                    <div
                      key={f.id}
                      onPointerDown={handleSelectFeature}
                      style={{
                        ...posStyle,
                        width: isVerticalWall ? '18px' : `${pxSize}px`,
                        height: isVerticalWall ? `${pxSize}px` : '18px',
                      }}
                      className={`absolute bg-stone-300 border border-stone-700 flex items-center justify-center text-[8px] font-bold text-stone-800 z-20 cursor-pointer ${ringClass}`}
                    >
                      ≡
                    </div>
                  )
                })}

                <span className="text-[10px] font-semibold text-stone-900 leading-tight px-1 line-clamp-1">
                  {room.name}
                </span>
                <span className="text-[8px] text-stone-600">
                  {room.width_m || 3.5}m × {room.length_m || 3.0}m
                </span>
              </div>
            )
          })}
        </div>

        <div className="absolute bottom-2 right-2.5 bg-[#F4F2ED]/90 px-2 py-0.5 rounded text-[10px] text-stone-600 border border-[#DCD6CA]">
          {viewMode === '3d' ? '3D Isometric View' : '1 sq = 1m × 1m'}
        </div>
      </div>
    </div>
  )
}
// END OF FILE