'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LottieEmpty } from '@/components/ui/LottieEmpty'
import { useGridItemSize } from '@/components/dashboard/GridItemSizeContext'
import type { MediaEntry, MediaCategory, MediaCounts, MediaStatus } from '@/lib/db/media'

const CATEGORY_EMOJI: Record<MediaCategory, string> = {
  book: '📚',
  film: '🎬',
  show: '📺',
  song: '🎵',
}

const CATEGORY_LABEL: Record<MediaCategory, string> = {
  book: 'Books',
  film: 'Films',
  show: 'Shows',
  song: 'Songs',
}

const STATUS_LABEL: Record<MediaStatus, string> = {
  'want-to': 'Want to',
  'in-progress': 'In progress',
  'finished': 'Finished',
}

const STATUS_COLORS: Record<MediaStatus, string> = {
  'want-to': 'text-accent bg-accent/10',
  'in-progress': 'text-amber-400 bg-amber-400/10',
  'finished': 'text-emerald-400 bg-emerald-400/10',
}

const STATUS_CYCLE: Record<MediaStatus, MediaStatus> = {
  'want-to': 'in-progress',
  'in-progress': 'finished',
  'finished': 'want-to',
}

type SortMode = 'date' | 'rating' | 'title'

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function StatsStrip({ entries }: { entries: MediaEntry[] }) {
  const rated = entries.filter((e) => e.rating != null)
  const avg = rated.length ? (rated.reduce((s, e) => s + (e.rating ?? 0), 0) / rated.length).toFixed(1) : null
  const byStatus = {
    'want-to': entries.filter((e) => e.status === 'want-to').length,
    'in-progress': entries.filter((e) => e.status === 'in-progress').length,
    'finished': entries.filter((e) => e.status === 'finished').length,
  }

  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 px-5 py-3 border-b border-border text-xs text-text-subtle shrink-0">
      <span><span className="font-semibold text-text tabular-nums">{entries.length}</span> total</span>
      {avg && <span>avg <span className="font-semibold text-accent tabular-nums">{avg}</span>/10</span>}
      {byStatus['want-to'] > 0 && <span className="text-accent/70">{byStatus['want-to']} want-to</span>}
      {byStatus['in-progress'] > 0 && <span className="text-amber-400/70">{byStatus['in-progress']} in-progress</span>}
      {byStatus['finished'] > 0 && <span className="text-emerald-400/70">{byStatus['finished']} finished</span>}
    </div>
  )
}

function CatalogueModal({
  entries: initialEntries,
  onClose,
  onDelete,
}: {
  entries: MediaEntry[]
  onClose: () => void
  onDelete: (id: string) => void
}) {
  const [mounted, setMounted] = useState(false)
  const [entries, setEntries] = useState(initialEntries)
  const [activeTab, setActiveTab] = useState<MediaCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<MediaStatus | 'all'>('all')
  const [sortMode, setSortMode] = useState<SortMode>('date')
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])
  // Keep in sync when parent updates (new entries logged while modal is open)
  useEffect(() => { setEntries(initialEntries) }, [initialEntries])
  if (!mounted) return null

  const categories: (MediaCategory | 'all')[] = ['all', 'book', 'film', 'show', 'song']
  const statusOptions: (MediaStatus | 'all')[] = ['all', 'want-to', 'in-progress', 'finished']

  const base = activeTab === 'all' ? entries : entries.filter((e) => e.category === activeTab)
  const afterStatus = statusFilter === 'all' ? base : base.filter((e) => e.status === statusFilter)

  const sorted = [...afterStatus].sort((a, b) => {
    if (sortMode === 'rating') {
      const ra = a.rating ?? -1, rb = b.rating ?? -1
      return rb - ra || b.added_date.localeCompare(a.added_date)
    }
    if (sortMode === 'title') return a.title.localeCompare(b.title)
    return b.added_date.localeCompare(a.added_date) || b.created_at.localeCompare(a.created_at)
  })

  const grouped = sorted.reduce<Record<string, MediaEntry[]>>((acc, e) => {
    const key = sortMode === 'date' ? e.added_date : sortMode === 'title' ? e.title[0]?.toUpperCase() ?? '#' : `${e.rating ?? 'No'} rating`
    ;(acc[key] ??= []).push(e)
    return acc
  }, {})

  const groupKeys = Object.keys(grouped).sort((a, b) => {
    if (sortMode === 'date') return b.localeCompare(a)
    if (sortMode === 'title') return a.localeCompare(b)
    const na = parseFloat(a), nb = parseFloat(b)
    return isNaN(nb) ? -1 : isNaN(na) ? 1 : nb - na
  })

  function handleStatusCycle(entry: MediaEntry) {
    const next = STATUS_CYCLE[entry.status]
    setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, status: next } : e))
    fetch('/api/media', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entry.id, status: next }),
    }).catch(() => {
      // Revert on failure
      setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, status: entry.status } : e))
    })
  }

  return createPortal(
    <div className="fixed inset-0 flex flex-col" style={{ zIndex: 9999, background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-border shrink-0">
        <h2 className="text-lg font-bold text-text">Media Catalogue</h2>
        <button
          onClick={onClose}
          className="text-text-subtle hover:text-text transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center"
        >
          ×
        </button>
      </div>

      {/* Stats strip */}
      <StatsStrip entries={entries} />

      {/* Category tabs */}
      <div className="flex gap-1 px-5 py-2.5 border-b border-border shrink-0 overflow-x-auto">
        {categories.map((cat) => {
          const count = cat === 'all' ? entries.length : entries.filter((e) => e.category === cat).length
          return (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                activeTab === cat
                  ? 'bg-accent/20 text-accent'
                  : 'text-text-subtle hover:text-text-muted hover:bg-surface-hover'
              }`}
            >
              {cat === 'all' ? 'All' : `${CATEGORY_EMOJI[cat]} ${CATEGORY_LABEL[cat]}`}
              {count > 0 && <span className="ml-1.5 text-[10px] opacity-60">{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Status + sort row */}
      <div className="flex items-center justify-between gap-2 px-5 py-2 border-b border-border shrink-0">
        <div className="flex gap-1 overflow-x-auto">
          {statusOptions.map((s) => {
            const count = s === 'all' ? base.length : base.filter((e) => e.status === s).length
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
                  statusFilter === s
                    ? s === 'all' ? 'bg-surface-elevated text-text'
                      : s === 'want-to' ? 'bg-accent/20 text-accent'
                      : s === 'in-progress' ? 'bg-amber-400/15 text-amber-400'
                      : 'bg-emerald-400/15 text-emerald-400'
                    : 'text-text-subtle hover:text-text-muted hover:bg-surface-hover'
                }`}
              >
                {s === 'all' ? 'All' : STATUS_LABEL[s]}
                {count > 0 && <span className="ml-1 opacity-60">{count}</span>}
              </button>
            )
          })}
        </div>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="shrink-0 text-[11px] text-text-muted bg-transparent border border-border rounded-md px-2 py-1 cursor-pointer focus:outline-none focus:border-accent"
        >
          <option value="date">Date</option>
          <option value="rating">Rating ↓</option>
          <option value="title">Title A-Z</option>
        </select>
      </div>

      {/* Entry list */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {sorted.length === 0 ? (
          <LottieEmpty
            title="No media tracked"
            subtitle={'Try: "want to watch Dune" or "reading Atomic Habits"'}
            size={72}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {groupKeys.map((key) => (
              <div key={key}>
                <p className="text-[10px] text-text-subtle uppercase tracking-widest mb-2">
                  {sortMode === 'date' ? fmtDate(key) : key}
                </p>
                <ul className="flex flex-col divide-y divide-border">
                  {grouped[key].map((entry) => (
                    <li key={entry.id} className="group flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <span className="text-xl leading-none mt-0.5 shrink-0">
                        {CATEGORY_EMOJI[entry.category]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm font-medium text-text">{entry.title}</span>
                          {entry.rating != null && (
                            <span className="text-xs font-semibold text-accent">{entry.rating}/10</span>
                          )}
                        </div>
                        {entry.note && (
                          <p className="text-xs text-text-muted italic mt-0.5 truncate">"{entry.note}"</p>
                        )}
                        <button
                          onClick={() => handleStatusCycle(entry)}
                          title="Click to cycle status"
                          className={`mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${STATUS_COLORS[entry.status]} hover:opacity-80`}
                        >
                          {STATUS_LABEL[entry.status]}
                        </button>
                      </div>
                      {confirmId === entry.id ? (
                        <div className="flex items-center gap-2 shrink-0 pt-0.5">
                          <span className="text-xs text-text-muted">Delete?</span>
                          <button
                            onClick={() => { onDelete(entry.id); setConfirmId(null) }}
                            className="text-xs text-red-400 font-medium hover:text-red-300"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="text-xs text-text-subtle hover:text-text-muted"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(entry.id)}
                          className="shrink-0 p-1 text-text-subtle opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity mt-0.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

interface MediaWidgetProps {
  initialEntries?: MediaEntry[]
  initialCounts?: MediaCounts
}

function countByCategory(entries: MediaEntry[]): MediaCounts {
  return {
    book: entries.filter((x) => x.category === 'book').length,
    film: entries.filter((x) => x.category === 'film').length,
    show: entries.filter((x) => x.category === 'show').length,
    song: entries.filter((x) => x.category === 'song').length,
  }
}

export function MediaWidget({ initialEntries, initialCounts }: MediaWidgetProps) {
  const { w, h } = useGridItemSize()
  const compact = w <= 2 || h <= 4
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  // Was a plain useState/useEffect/fetch — not invalidatable by RealtimeSync,
  // so a media log from another tab/device never showed up here without a
  // full page reload. useQuery makes it a real cache entry: 'media' is
  // invalidated on any media_log change, refetching in the background with
  // the old entries still shown until the new list resolves.
  const mediaQuery = useQuery({
    queryKey: ['media'],
    queryFn: async () => {
      const res = await fetch('/api/media')
      if (!res.ok) throw new Error('Failed to load media')
      return (await res.json()) as { entries: MediaEntry[] }
    },
    initialData: initialEntries ? { entries: initialEntries } : undefined,
  })
  const entries = mediaQuery.data?.entries ?? []
  const counts = mediaQuery.data ? countByCategory(entries) : (initialCounts ?? { book: 0, film: 0, show: 0, song: 0 })
  const loading = mediaQuery.isLoading

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/media?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media'] }),
  })

  function handleDelete(id: string) {
    deleteMutation.mutate(id)
  }

  const mostRecent = entries[0]
  const total = counts.book + counts.film + counts.show + counts.song
  const wantTo = entries.filter((e) => e.status === 'want-to').length
  const inProgress = entries.filter((e) => e.status === 'in-progress').length

  return (
    <>
      <div
        className="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-4 h-full overflow-hidden cursor-pointer hover:scale-[1.015] active:scale-[0.985] transition-transform duration-150"
        style={{ boxShadow: 'var(--shadow-md)' }}
        onClick={() => !loading && setOpen(true)}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Media</h2>
          {total > 0 && (
            <span className="text-xs text-text-subtle">{total} logged</span>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            <div className="h-4 w-24 bg-surface-elevated rounded animate-pulse" />
            <div className="h-3 w-32 bg-surface-elevated rounded animate-pulse" />
          </div>
        ) : total === 0 ? (
          <p className="text-sm text-text-subtle">
            Log books, films, shows, songs by conversation.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {(['book', 'film', 'show', 'song'] as MediaCategory[]).map((cat) => (
                <div key={cat} className="flex items-center gap-1.5">
                  <span className="text-base">{CATEGORY_EMOJI[cat]}</span>
                  <span className="text-sm font-semibold text-text tabular-nums">{counts[cat]}</span>
                  <span className="text-xs text-text-subtle">{CATEGORY_LABEL[cat].toLowerCase()}</span>
                </div>
              ))}
            </div>

            {/* Secondary detail — cut at small sizes rather than cramming
                badges and the last-logged block into a narrow card. */}
            {!compact && (wantTo > 0 || inProgress > 0) && (
              <div className="flex gap-2 flex-wrap">
                {wantTo > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent/10 text-accent/80">
                    {wantTo} want-to
                  </span>
                )}
                {inProgress > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400/80">
                    {inProgress} in progress
                  </span>
                )}
              </div>
            )}

            {!compact && mostRecent && (
              <div className="pt-1 border-t border-border">
                <p className="text-[10px] text-text-subtle uppercase tracking-widest mb-1">Last logged</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm text-text font-medium truncate">{mostRecent.title}</span>
                  {mostRecent.rating != null && (
                    <span className="text-xs text-accent shrink-0">{mostRecent.rating}/10</span>
                  )}
                </div>
                <p className="text-xs text-text-subtle capitalize">{mostRecent.category} · {fmtDate(mostRecent.added_date)}</p>
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="media-catalogue"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
          >
            <CatalogueModal
              entries={entries}
              onClose={() => setOpen(false)}
              onDelete={handleDelete}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
