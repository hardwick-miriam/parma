'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getLocalDate } from '@/lib/date'
import type { WardrobeCondition, WardrobeItemWithStats, WardrobeType, Season } from '@/lib/wardrobeTypes'

const TYPES: WardrobeType[] = ['top', 'bottom', 'dress', 'outerwear', 'footwear', 'accessory', 'underwear', 'activewear', 'other']
const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']
const CONDITIONS: WardrobeCondition[] = ['new', 'excellent', 'good', 'fair', 'worn']

type ItemDetail = WardrobeItemWithStats & { wear_dates: string[] }

async function fetchItem(id: string): Promise<ItemDetail> {
  const res = await fetch(`/api/wardrobe/${id}`)
  if (!res.ok) throw new Error('Not found')
  return (await res.json()).item
}

function WearCalendar({ wearDates }: { wearDates: string[] }) {
  const wornSet = new Set(wearDates)
  const today = new Date()
  const days: { date: string; worn: boolean }[] = []
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    days.push({ date: iso, worn: wornSet.has(iso) })
  }
  const weeks: typeof days[] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))

  return (
    <div className="flex gap-1 overflow-x-auto py-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((d) => (
            <div
              key={d.date}
              title={d.date}
              className="w-3 h-3 rounded-sm"
              style={{ background: d.worn ? 'var(--accent)' : 'var(--surface-elevated)' }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function ItemDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: item, isLoading } = useQuery({ queryKey: ['wardrobe-item', id], queryFn: () => fetchItem(id) })
  const [draft, setDraft] = useState<Partial<ItemDetail> | null>(null)

  const saveMutation = useMutation({
    mutationFn: async (updates: Partial<ItemDetail>) => {
      const res = await fetch(`/api/wardrobe/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Save failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wardrobe-item', id] })
      queryClient.invalidateQueries({ queryKey: ['wardrobe'] })
      setEditing(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/wardrobe/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wardrobe'] })
      router.push('/wardrobe')
    },
  })

  const wearMutation = useMutation({
    mutationFn: async (worn_on: string) => {
      const res = await fetch(`/api/wardrobe/${id}/wear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worn_on }),
      })
      if (!res.ok) throw new Error('Wear log failed')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wardrobe-item', id] })
      queryClient.invalidateQueries({ queryKey: ['wardrobe'] })
    },
  })

  if (isLoading || !item) return <p className="text-sm text-text-subtle p-6">Loading…</p>

  const d = draft ?? item

  function startEdit() {
    setDraft({ ...item })
    setEditing(true)
  }

  function save() {
    if (!draft) return
    saveMutation.mutate({
      name: draft.name,
      type: draft.type,
      colours: draft.colours,
      brand: draft.brand,
      size: draft.size,
      seasons: draft.seasons,
      tags: draft.tags,
      condition: draft.condition,
      price_paid: draft.price_paid,
      acquired_on: draft.acquired_on,
      notes: draft.notes,
    })
  }

  return (
    <div className="flex flex-col gap-5 pb-24">
      <button onClick={() => router.push('/wardrobe')} className="text-xs text-text-subtle hover:text-text-muted self-start">
        ← Back to wardrobe
      </button>

      <div className="rounded-2xl overflow-hidden border border-border bg-surface-elevated aspect-square max-w-md">
        {item.photo_url ? (
          <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">👕</div>
        )}
      </div>

      {!editing ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-text">{item.name}</h1>
              <p className="text-sm text-text-subtle capitalize">{item.brand ? `${item.brand} · ` : ''}{item.type}</p>
            </div>
            <button onClick={startEdit} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-surface-hover">
              Edit
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-surface border border-border p-3">
              <p className="text-[10px] uppercase tracking-widest text-text-faint">Wears</p>
              <p className="text-lg font-bold text-text">{item.wear_count}</p>
            </div>
            <div className="rounded-xl bg-surface border border-border p-3">
              <p className="text-[10px] uppercase tracking-widest text-text-faint">Last worn</p>
              <p className="text-lg font-bold text-text">{item.last_worn ?? '—'}</p>
            </div>
            <div className="rounded-xl bg-surface border border-border p-3">
              <p className="text-[10px] uppercase tracking-widest text-text-faint">Cost/wear</p>
              <p className="text-lg font-bold text-text">{item.cost_per_wear != null ? `£${item.cost_per_wear.toFixed(2)}` : '—'}</p>
            </div>
          </div>

          <button
            onClick={() => wearMutation.mutate(getLocalDate())}
            disabled={wearMutation.isPending}
            className="rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90"
            style={{ background: 'var(--accent)' }}
          >
            {wearMutation.isPending ? 'Logging…' : 'Wore this today'}
          </button>

          <div>
            <p className="text-xs text-text-muted mb-2">Wear history (last 12 weeks)</p>
            <WearCalendar wearDates={item.wear_dates} />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {item.colours.map((c) => (
              <span key={c} className="px-2 py-1 rounded-full text-xs bg-surface-elevated border border-border text-text-muted">{c}</span>
            ))}
            {item.seasons.map((s) => (
              <span key={s} className="px-2 py-1 rounded-full text-xs bg-accent/10 border border-accent/30 text-accent">{s}</span>
            ))}
            {item.tags.map((t) => (
              <span key={t} className="px-2 py-1 rounded-full text-xs bg-surface-elevated border border-border text-text-subtle">#{t}</span>
            ))}
          </div>

          <div className="text-sm text-text-muted flex flex-col gap-1">
            {item.size && <p>Size: {item.size}</p>}
            {item.condition && <p className="capitalize">Condition: {item.condition}</p>}
            {item.price_paid != null && <p>Paid: £{item.price_paid.toFixed(2)}</p>}
            {item.acquired_on && <p>Acquired: {item.acquired_on}</p>}
            {item.notes && <p className="italic">{item.notes}</p>}
          </div>

          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="text-xs text-negative hover:text-negative self-start mt-2">
              Delete item
            </button>
          ) : (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-text-muted">Delete this item permanently?</span>
              <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} className="text-xs text-negative font-medium hover:text-negative">
                Yes, delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-text-subtle hover:text-text-muted">Cancel</button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Name
            <input value={d.name ?? ''} onChange={(e) => setDraft({ ...d, name: e.target.value })}
              className="w-full rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Type
            <select value={d.type} onChange={(e) => setDraft({ ...d, type: e.target.value as WardrobeType })}
              className="w-full rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent">
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Colours (comma-separated)
            <input value={(d.colours ?? []).join(', ')} onChange={(e) => setDraft({ ...d, colours: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })}
              className="w-full rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Brand
            <input value={d.brand ?? ''} onChange={(e) => setDraft({ ...d, brand: e.target.value })}
              className="w-full rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Size
            <input value={d.size ?? ''} onChange={(e) => setDraft({ ...d, size: e.target.value })}
              className="w-full rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Condition
            <select value={d.condition ?? ''} onChange={(e) => setDraft({ ...d, condition: e.target.value as WardrobeCondition })}
              className="w-full rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent">
              <option value="">—</option>
              {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            {SEASONS.map((s) => (
              <button key={s} type="button"
                onClick={() => setDraft({ ...d, seasons: (d.seasons ?? []).includes(s) ? (d.seasons ?? []).filter((x) => x !== s) : [...(d.seasons ?? []), s] })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  (d.seasons ?? []).includes(s) ? 'bg-accent/15 border-accent text-accent' : 'border-border text-text-subtle hover:bg-surface-hover'
                }`}>
                {s}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Tags (comma-separated)
            <input value={(d.tags ?? []).join(', ')} onChange={(e) => setDraft({ ...d, tags: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })}
              className="w-full rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Price paid (£)
            <input type="number" step="0.01" value={d.price_paid ?? ''} onChange={(e) => setDraft({ ...d, price_paid: e.target.value ? Number(e.target.value) : null })}
              className="w-full rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Notes
            <textarea value={d.notes ?? ''} onChange={(e) => setDraft({ ...d, notes: e.target.value })} rows={2}
              className="w-full rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent resize-none" />
          </label>
          <div className="flex gap-2">
            <button onClick={save} disabled={saveMutation.isPending} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90" style={{ background: 'var(--accent)' }}>
              {saveMutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
            <button onClick={() => setEditing(false)} className="px-4 rounded-xl py-2.5 text-sm font-medium border border-border hover:bg-surface-hover">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
