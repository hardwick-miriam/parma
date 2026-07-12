'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { AddItemFlow } from './AddItemFlow'
import { currentSeason, type Season, type WardrobeItemWithStats, type WardrobeType } from '@/lib/wardrobeTypes'

type SortKey = 'newest' | 'most-worn' | 'least-worn' | 'cost-per-wear'

const TYPES: WardrobeType[] = ['top', 'bottom', 'dress', 'outerwear', 'footwear', 'accessory', 'underwear', 'activewear', 'other']
const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

async function fetchItems(params: URLSearchParams): Promise<WardrobeItemWithStats[]> {
  const res = await fetch(`/api/wardrobe?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to load wardrobe')
  const { items } = await res.json()
  return items
}

function ItemCard({ item }: { item: WardrobeItemWithStats }) {
  return (
    <Link
      href={`/wardrobe/${item.id}`}
      className="group flex flex-col rounded-2xl overflow-hidden border border-border bg-surface hover:border-border-strong transition-colors"
    >
      <div className="aspect-square bg-surface-elevated relative overflow-hidden">
        {item.photo_url ? (
          <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">👕</div>
        )}
        {item.wear_count === 0 && (
          <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white">
            never worn
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col gap-0.5">
        <p className="text-sm font-medium text-text truncate">{item.name}</p>
        <p className="text-xs text-text-subtle truncate">
          {item.brand || item.type} · {item.wear_count} wear{item.wear_count === 1 ? '' : 's'}
        </p>
        {item.cost_per_wear != null && (
          <p className="text-xs text-accent">£{item.cost_per_wear.toFixed(2)}/wear</p>
        )}
      </div>
    </Link>
  )
}

export function WardrobeClient() {
  const [season, setSeason] = useState<Season | 'all'>(currentSeason())
  const [type, setType] = useState<string>('')
  const [colour, setColour] = useState<string>('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('newest')
  const [neverWorn, setNeverWorn] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [wearText, setWearText] = useState('')
  const [wearResult, setWearResult] = useState<string | null>(null)
  const [gridRef] = useAutoAnimate<HTMLDivElement>()
  const queryClient = useQueryClient()

  const params = useMemo(() => {
    const p = new URLSearchParams()
    if (season !== 'all') p.set('season', season)
    if (type) p.set('type', type)
    if (colour) p.set('colour', colour)
    if (search) p.set('search', search)
    p.set('sort', sort)
    if (neverWorn) p.set('neverWorn', '1')
    return p
  }, [season, type, colour, search, sort, neverWorn])

  const { data: items, isLoading, isError } = useQuery({
    queryKey: ['wardrobe', params.toString()],
    queryFn: () => fetchItems(params),
    placeholderData: keepPreviousData,
  })

  async function submitWear(e: React.FormEvent) {
    e.preventDefault()
    if (!wearText.trim()) return
    setWearResult(null)
    try {
      const res = await fetch('/api/wardrobe/log-wear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: wearText }),
      })
      if (res.ok) {
        const { date, matches } = await res.json()
        const matched = matches.filter((m: { item: unknown }) => m.item)
        const unmatched = matches.filter((m: { item: unknown }) => !m.item)
        setWearResult(
          matched.length
            ? `Logged ${matched.map((m: { item: { name: string } }) => m.item.name).join(', ')} for ${date}` +
              (unmatched.length ? ` — couldn't match "${unmatched.map((m: { fragment: string }) => m.fragment).join('", "')}"` : '')
            : `Couldn't match any items in "${wearText}"`
        )
        setWearText('')
        queryClient.invalidateQueries({ queryKey: ['wardrobe'] })
      } else {
        setWearResult('Failed to log wear')
      }
    } catch {
      setWearResult('Failed to log wear — check your connection')
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-24">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text">Wardrobe</h1>
        <button
          onClick={() => setAddOpen(true)}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90"
          style={{ background: 'var(--accent)' }}
        >
          + Add item
        </button>
      </div>

      <form onSubmit={submitWear} className="flex flex-col gap-2">
        <input
          value={wearText}
          onChange={(e) => setWearText(e.target.value)}
          placeholder='"wore the grey hoodie and black cargos yesterday"'
          className="w-full rounded-xl bg-surface-elevated border border-border text-text text-sm px-4 py-3 focus:outline-none focus:border-accent"
        />
        {wearResult && <p className="text-xs text-text-muted">{wearResult}</p>}
      </form>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSeason('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            season === 'all' ? 'bg-accent/15 border-accent text-accent' : 'border-border text-text-subtle hover:bg-surface-hover'
          }`}
        >
          All seasons
        </button>
        {SEASONS.map((s) => (
          <button
            key={s}
            onClick={() => setSeason(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition-colors ${
              season === s ? 'bg-accent/15 border-accent text-accent' : 'border-border text-text-subtle hover:bg-surface-hover'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg bg-surface-elevated border border-border text-text text-xs px-2.5 py-1.5 focus:outline-none focus:border-accent"
        >
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          value={colour}
          onChange={(e) => setColour(e.target.value)}
          placeholder="Colour"
          className="w-24 rounded-lg bg-surface-elevated border border-border text-text text-xs px-2.5 py-1.5 focus:outline-none focus:border-accent"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="flex-1 min-w-[100px] rounded-lg bg-surface-elevated border border-border text-text text-xs px-2.5 py-1.5 focus:outline-none focus:border-accent"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg bg-surface-elevated border border-border text-text text-xs px-2.5 py-1.5 focus:outline-none focus:border-accent"
        >
          <option value="newest">Newest</option>
          <option value="most-worn">Most worn</option>
          <option value="least-worn">Least worn</option>
          <option value="cost-per-wear">Cost per wear</option>
        </select>
        <button
          onClick={() => setNeverWorn((v) => !v)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            neverWorn ? 'bg-accent/15 border-accent text-accent' : 'border-border text-text-subtle hover:bg-surface-hover'
          }`}
        >
          Never worn (60d+)
        </button>
      </div>

      {isLoading && <p className="text-sm text-text-subtle">Loading…</p>}
      {isError && <p className="text-sm text-negative">Failed to load wardrobe.</p>}
      {!isLoading && items?.length === 0 && (
        <p className="text-sm text-text-subtle py-10 text-center">No items match these filters yet.</p>
      )}

      <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items?.map((item) => <ItemCard key={item.id} item={item} />)}
      </div>

      <AddItemFlow
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['wardrobe'] })}
      />
    </div>
  )
}
