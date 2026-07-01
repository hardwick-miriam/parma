'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { MediaEntry, MediaCategory, MediaCounts } from '@/lib/db/media'

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

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function CatalogueModal({
  entries,
  onClose,
  onDelete,
}: {
  entries: MediaEntry[]
  onClose: () => void
  onDelete: (id: string) => void
}) {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<MediaCategory | 'all'>('all')
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  const categories: (MediaCategory | 'all')[] = ['all', 'book', 'film', 'show', 'song']
  const filtered = activeTab === 'all' ? entries : entries.filter((e) => e.category === activeTab)

  const grouped = filtered.reduce<Record<string, MediaEntry[]>>((acc, e) => {
    ;(acc[e.added_date] ??= []).push(e)
    return acc
  }, {})

  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return createPortal(
    <div
      className="fixed inset-0 flex flex-col"
      style={{ zIndex: 9999, background: 'var(--bg)' }}
    >
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

      {/* Tabs */}
      <div className="flex gap-1 px-5 py-3 border-b border-border shrink-0 overflow-x-auto">
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
              {count > 0 && (
                <span className="ml-1.5 text-[10px] opacity-60">{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Entry list */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {filtered.length === 0 ? (
          <p className="text-sm text-text-subtle text-center py-12">
            Nothing logged yet. Try: "watched Oppenheimer last night, 9/10"
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {dates.map((date) => (
              <div key={date}>
                <p className="text-[10px] text-text-subtle uppercase tracking-widest mb-2">{fmtDate(date)}</p>
                <ul className="flex flex-col divide-y divide-border">
                  {grouped[date].map((entry) => (
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

export function MediaWidget({ initialEntries, initialCounts }: MediaWidgetProps) {
  const [entries, setEntries] = useState<MediaEntry[]>(initialEntries ?? [])
  const [counts, setCounts] = useState<MediaCounts>(
    initialCounts ?? { book: 0, film: 0, show: 0, song: 0 }
  )
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(!initialEntries)

  useEffect(() => {
    if (initialEntries) return
    fetch('/api/media')
      .then((r) => r.json())
      .then((d) => {
        const e: MediaEntry[] = d.entries ?? []
        setEntries(e)
        setCounts({
          book: e.filter((x) => x.category === 'book').length,
          film: e.filter((x) => x.category === 'film').length,
          show: e.filter((x) => x.category === 'show').length,
          song: e.filter((x) => x.category === 'song').length,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [initialEntries])

  function handleDelete(id: string) {
    fetch(`/api/media?id=${id}`, { method: 'DELETE' }).catch(() => {})
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id)
      const deleted = prev.find((e) => e.id === id)
      if (deleted) {
        setCounts((c) => ({ ...c, [deleted.category]: Math.max(0, c[deleted.category] - 1) }))
      }
      return next
    })
  }

  const mostRecent = entries[0]
  const total = counts.book + counts.film + counts.show + counts.song

  return (
    <>
      <div
        className="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-4 h-full cursor-pointer hover:scale-[1.015] active:scale-[0.985] transition-transform duration-150"
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
            {mostRecent && (
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
