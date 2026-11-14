'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { PinnedProduct } from '@/app/profile/page'

export default function SpecsDirectoryPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const [pinnedProducts, setPinnedProducts] = useState<PinnedProduct[]>([])
  const [postSpecs, setPostSpecs] = useState<{ spec: string; roomName: string }[]>([])
  const [search, setSearch] = useState('')

  // Add Spec Modal
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', brand: '', price: '', room: '', url: '' })

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return router.push('/login')
      setUser(auth.user)

      const { data: house } = await supabase
        .from('houses')
        .select('pinned_products')
        .eq('user_id', auth.user.id)
        .maybeSingle()

      if (house && Array.isArray(house.pinned_products)) {
        setPinnedProducts(house.pinned_products)
      }

      const { data: rooms } = await supabase.from('rooms').select('id, name')
      const { data: posts } = await supabase.from('posts').select('room_id, specs')

      if (posts) {
        const extracted: { spec: string; roomName: string }[] = []
        posts.forEach((p) => {
          if (Array.isArray(p.specs)) {
            const rName = rooms?.find((r) => r.id === p.room_id)?.name || 'Whole House'
            p.specs.forEach((s: string) => {
              if (!extracted.some((e) => e.spec.toLowerCase() === s.toLowerCase())) {
                extracted.push({ spec: s, roomName: rName })
              }
            })
          }
        })
        setPostSpecs(extracted)
      }

      setLoading(false)
    }
    load()
  }, [router])

  const handleAddSpec = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !form.name.trim()) return
    setSaving(true)

    const updated: PinnedProduct[] = [
      ...pinnedProducts,
      {
        id: `${Date.now()}`,
        name: form.name.trim(),
        brand: form.brand.trim() || 'House Spec',
        price: form.price.trim() || undefined,
        room: form.room.trim() || undefined,
        url: form.url.trim() || undefined,
      },
    ]

    const { error } = await supabase
      .from('houses')
      .upsert({ user_id: user.id, pinned_products: updated }, { onConflict: 'user_id' })

    setSaving(false)
    if (!error) {
      setPinnedProducts(updated)
      setForm({ name: '', brand: '', price: '', room: '', url: '' })
      setShowAdd(false)
    }
  }

  const handleRemove = async (id: string) => {
    if (!user) return
    const updated = pinnedProducts.filter((p) => p.id !== id)
    setPinnedProducts(updated)
    await supabase.from('houses').upsert({ user_id: user.id, pinned_products: updated }, { onConflict: 'user_id' })
  }

  if (loading) return <div className="p-6 text-xs text-[#9C9A92]">Loading house specs...</div>

  const q = search.toLowerCase().trim()
  const filteredPinned = pinnedProducts.filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      (p.room || '').toLowerCase().includes(q)
  )
  const filteredTagged = postSpecs.filter(
    (item) => !q || item.spec.toLowerCase().includes(q) || item.roomName.toLowerCase().includes(q)
  )

  return (
    <div className="px-5 pt-4 pb-12 space-y-5 bg-[#151815] min-h-screen">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-[#C6A467]">
            House Passport Directory
          </p>
          <h1 className="text-lg font-semibold text-[#F2EFE9]">Specs, Paints & Materials</h1>
          <p className="text-xs text-[#9C9A92]">Every paint shade, tile, and fixture in your home</p>
        </div>

        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="px-3.5 py-2 rounded-full bg-[#8FA680] hover:bg-[#9FB690] text-[#121612] text-xs font-semibold"
        >
          + Add Spec
        </button>
      </div>

      <input
        type="text"
        placeholder="Search paint shades, brands, rooms..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3.5 py-2.5 text-xs bg-[#1E221E] text-[#F2EFE9] placeholder-[#6B6962] border border-[#2E332E] rounded-xl focus:outline-none focus:border-[#8FA680]"
      />

      {/* Saved / Pinned Product Specs */}
      <div className="space-y-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9C9A92]">
          Saved House Specs ({filteredPinned.length})
        </h2>

        {filteredPinned.length === 0 ? (
          <div className="rounded-2xl bg-[#1E221E] border border-[#2E332E] p-6 text-center space-y-1.5">
            <p className="text-xs font-medium text-[#F2EFE9]">No saved specs yet</p>
            <p className="text-[11px] text-[#9C9A92]">
              Save paint colours, flooring finishes, and supplier links so you never forget a shade or code.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {filteredPinned.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-[#1E221E] border border-[#2E332E] p-3.5 space-y-1.5 relative flex flex-col justify-between"
              >
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="absolute top-2 right-2.5 text-sm text-[#7D7B73] hover:text-red-400"
                >
                  ×
                </button>
                <div className="space-y-1">
                  <span className="inline-block text-[9px] px-2 py-0.5 rounded bg-[#253025] text-[#8FA680] font-semibold">
                    {item.brand}
                  </span>
                  <h3 className="text-xs font-semibold text-[#F2EFE9] leading-snug">{item.name}</h3>
                  <p className="text-[10px] text-[#9C9A92]">
                    {item.room || 'Whole House'}
                    {item.price ? ` · ${item.price}` : ''}
                  </p>
                </div>

                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-[11px] font-medium text-[#C6A467] underline pt-1"
                  >
                    Product Link →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auto-Extracted Specs from Logbook Posts */}
      {filteredTagged.length > 0 && (
        <div className="space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9C9A92]">
            Tagged in Logbook Posts ({filteredTagged.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {filteredTagged.map((item, idx) => (
              <div
                key={idx}
                className="px-3 py-1.5 rounded-xl bg-[#1E221E] border border-[#2E332E] text-xs flex items-center gap-2"
              >
                <span className="text-[#F2EFE9] font-medium">{item.spec}</span>
                <span className="text-[10px] text-[#8FA680]">{item.roomName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Spec Modal */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#1E221E] border border-[#343B34] p-5 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#F2EFE9]">Add House Spec</h2>
              <button type="button" onClick={() => setShowAdd(false)} className="text-[#9C9A92] text-lg">
                ×
              </button>
            </div>

            <form onSubmit={handleAddSpec} className="space-y-2.5">
              <input
                type="text"
                required
                placeholder="Item / Paint Name (e.g., Charleston Gray No. 243)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#141714] text-[#F2EFE9] placeholder-[#6B6962] border border-[#323832] rounded-xl"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Brand (e.g., Farrow & Ball)"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className="px-3 py-2 text-xs bg-[#141714] text-[#F2EFE9] placeholder-[#6B6962] border border-[#323832] rounded-xl"
                />
                <input
                  type="text"
                  placeholder="Price (e.g., £59)"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="px-3 py-2 text-xs bg-[#141714] text-[#F2EFE9] placeholder-[#6B6962] border border-[#323832] rounded-xl"
                />
              </div>
              <input
                type="text"
                placeholder="Room (e.g., Hallway, Snug)"
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#141714] text-[#F2EFE9] placeholder-[#6B6962] border border-[#323832] rounded-xl"
              />
              <input
                type="url"
                placeholder="Supplier URL (optional https://...)"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#141714] text-[#F2EFE9] placeholder-[#6B6962] border border-[#323832] rounded-xl"
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-[#8FA680] text-[#121612] text-xs font-semibold rounded-xl"
              >
                {saving ? 'Saving...' : 'Save Spec'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}