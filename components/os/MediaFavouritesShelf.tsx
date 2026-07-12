'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { computeFavourites, type FavouriteSlot } from '@/lib/mediaTaste'
import type { MediaEntry, MediaCategory } from '@/lib/db/media'

const CATEGORY_EMOJI: Record<MediaCategory, string> = { book: '📚', film: '🎬', show: '📺', song: '🎵' }
const CATEGORY_LABEL: Record<MediaCategory, string> = { book: 'Books', film: 'Films', show: 'Shows', song: 'Songs' }

function Shelf({ category, slots, allInCategory, onPin, onUnpin, pinning }: {
  category: MediaCategory
  slots: FavouriteSlot[]
  allInCategory: MediaEntry[]
  onPin: (id: string, slot: 1 | 2 | 3) => void
  onUnpin: (id: string) => void
  pinning: boolean
}) {
  const [pickerSlot, setPickerSlot] = useState<1 | 2 | 3 | null>(null)
  const hasAny = allInCategory.length > 0

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">
        {CATEGORY_EMOJI[category]} Top {CATEGORY_LABEL[category]}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {slots.map((s) => (
          <div key={s.slot} className="rounded-xl bg-surface border border-border p-3 flex flex-col gap-1 min-h-[92px] relative">
            <span className="absolute top-2 right-2 text-[10px] text-text-faint">#{s.slot}</span>
            {s.entry ? (
              <>
                <p className="text-xs font-medium text-text truncate pr-4">{s.entry.title}</p>
                {s.entry.rating != null && <p className="text-[11px] text-accent">{s.entry.rating}/10</p>}
                <div className="mt-auto flex items-center gap-2 pt-1">
                  {s.pinned ? (
                    <button onClick={() => onUnpin(s.entry!.id)} disabled={pinning} className="text-[10px] text-text-subtle hover:text-text-muted">Unpin</button>
                  ) : (
                    <button onClick={() => setPickerSlot(s.slot)} disabled={pinning || !hasAny} className="text-[10px] text-accent hover:opacity-80">Pin choice…</button>
                  )}
                </div>
              </>
            ) : hasAny ? (
              <button onClick={() => setPickerSlot(s.slot)} className="flex-1 flex items-center justify-center text-[11px] text-text-subtle hover:text-text-muted">
                + Choose
              </button>
            ) : (
              <p className="text-[11px] text-text-subtle flex-1 flex items-center">
                {category === 'book' ? 'Add books to Media to fill this in' : category === 'song' ? 'Connect music to fill this in' : 'Not enough rated items yet'}
              </p>
            )}

            {pickerSlot === s.slot && (
              <div className="absolute inset-0 z-10 bg-surface border border-accent rounded-xl p-2 flex flex-col gap-1 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-text-muted">Pick for #{s.slot}</span>
                  <button onClick={() => setPickerSlot(null)} className="text-[10px] text-text-subtle">✕</button>
                </div>
                {allInCategory.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => { onPin(e.id, s.slot); setPickerSlot(null) }}
                    className="text-left text-[11px] text-text hover:text-accent truncate"
                  >
                    {e.title}{e.rating != null ? ` (${e.rating}/10)` : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function MediaFavouritesShelf({ entries }: { entries: MediaEntry[] }) {
  const queryClient = useQueryClient()

  const pinMutation = useMutation({
    mutationFn: async ({ id, category, slot }: { id: string; category: MediaCategory; slot: 1 | 2 | 3 }) => {
      const res = await fetch('/api/media/pin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, category, slot }),
      })
      if (!res.ok) throw new Error('Failed to pin')
    },
    onMutate: async ({ id, category, slot }) => {
      await queryClient.cancelQueries({ queryKey: ['media'] })
      const previous = queryClient.getQueryData<{ entries: MediaEntry[] }>(['media'])
      queryClient.setQueryData<{ entries: MediaEntry[] }>(['media'], (old) => old ? {
        entries: old.entries.map((e) => {
          if (e.id === id) return { ...e, pinned_slot: slot }
          // Mirror the server's "one item per slot" rule so the shelf doesn't
          // briefly show two items claiming the same slot.
          if (e.category === category && e.pinned_slot === slot) return { ...e, pinned_slot: null }
          return e
        }),
      } : old)
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['media'], context.previous)
      toast.error('Failed to pin that item')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['media'] }),
  })

  const unpinMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/media/pin?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to unpin')
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['media'] })
      const previous = queryClient.getQueryData<{ entries: MediaEntry[] }>(['media'])
      queryClient.setQueryData<{ entries: MediaEntry[] }>(['media'], (old) => old ? {
        entries: old.entries.map((e) => (e.id === id ? { ...e, pinned_slot: null } : e)),
      } : old)
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['media'], context.previous)
      toast.error('Failed to unpin that item')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['media'] }),
  })

  const pinning = pinMutation.isPending || unpinMutation.isPending

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {(['film', 'show', 'book', 'song'] as MediaCategory[]).map((category) => (
        <Shelf
          key={category}
          category={category}
          slots={computeFavourites(entries, category)}
          allInCategory={entries.filter((e) => e.category === category)}
          onPin={(id, slot) => pinMutation.mutate({ id, category, slot })}
          onUnpin={(id) => unpinMutation.mutate(id)}
          pinning={pinning}
        />
      ))}
    </div>
  )
}
