'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useGridItemSize } from '@/components/dashboard/GridItemSizeContext'
import { currentSeason, type WardrobeItemWithStats } from '@/lib/wardrobeTypes'

export function WardrobeWidget() {
  const { w, h } = useGridItemSize()
  const micro = w <= 2 && h <= 3
  const compact = w <= 2 || h <= 4

  const [items, setItems] = useState<WardrobeItemWithStats[] | null>(null)

  useEffect(() => {
    fetch('/api/wardrobe')
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]))
  }, [])

  const season = currentSeason()
  const total = items?.length ?? 0
  const seasonCount = items?.filter((i) => i.seasons.includes(season)).length ?? 0
  const latest = items?.[0]

  if (micro) {
    return (
      <Link
        href="/wardrobe"
        className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-1 h-full overflow-hidden justify-center"
        style={{ boxShadow: 'var(--shadow-md)' }}
      >
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest">Wardrobe</h2>
        <p className="text-2xl font-bold text-text tabular-nums">{total}</p>
      </Link>
    )
  }

  if (compact) {
    return (
      <Link
        href="/wardrobe"
        className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-2 h-full overflow-hidden"
        style={{ boxShadow: 'var(--shadow-md)' }}
      >
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest">Wardrobe</h2>
        <div className="flex-1 flex flex-col justify-center gap-0.5">
          <p className="text-2xl font-bold text-text tabular-nums">{total}</p>
          <p className="text-xs text-text-subtle capitalize">{seasonCount} for {season}</p>
        </div>
      </Link>
    )
  }

  return (
    <Link
      href="/wardrobe"
      className="rounded-2xl bg-surface border border-border p-6 flex flex-col gap-4 h-full overflow-hidden"
      style={{ boxShadow: 'var(--shadow-md)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Wardrobe</h2>
      </div>
      <div className="flex items-center gap-4 flex-1">
        <div className="w-16 h-16 rounded-xl bg-surface-elevated border border-border overflow-hidden shrink-0 flex items-center justify-center text-2xl">
          {latest?.photo_url ? <img src={latest.photo_url} alt="" className="w-full h-full object-cover" /> : '👕'}
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-2xl font-bold text-text tabular-nums">{total} items</p>
          <p className="text-xs text-text-subtle capitalize">{seasonCount} for {season}</p>
          {latest && <p className="text-xs text-text-faint truncate max-w-[10rem]">Latest: {latest.name}</p>}
        </div>
      </div>
    </Link>
  )
}
