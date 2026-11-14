'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import AIFloorPlan from '@/components/AIFloorPlan'

interface Room {
  id: string
  name: string
  floor_level?: string | null
  width_m?: number | null
  length_m?: number | null
  status: string
  progress: number
}

export default function FloorPlanPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [plan2dUrl, setPlan2dUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchHouseAndRooms = async () => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      router.push('/login')
      return
    }
    setUser(auth.user)

    const { data: house } = await supabase
      .from('houses')
      .select('plan_2d_url')
      .eq('user_id', auth.user.id)
      .maybeSingle()

    if (house?.plan_2d_url) {
      setPlan2dUrl(house.plan_2d_url)
    }

    const { data: roomData } = await supabase
      .from('rooms')
      .select('id, name, floor_level, width_m, length_m, status, progress')
      .order('created_at', { ascending: true })

    if (roomData) {
      setRooms(roomData)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchHouseAndRooms()
  }, [router])

  if (loading) {
    return <div className="p-6 text-xs text-[#9C9A92]">Loading floor plan...</div>
  }

  return (
    <div className="px-5 pt-4 pb-16 space-y-4 bg-[#151815] min-h-screen">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-[#C6A467]">
            Architectural Blueprint
          </p>
          <h1 className="text-lg font-semibold text-[#F2EFE9]">House Floor Plan</h1>
        </div>
      </div>

      {user && (
        <AIFloorPlan
          userId={user.id}
          rooms={rooms}
      plan2dUrl={plan2dUrl}
          onRoomsUpdated={fetchHouseAndRooms}
        />
      )}
    </div>
  )
}
