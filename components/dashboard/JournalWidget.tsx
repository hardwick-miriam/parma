'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { DailyStats, WorkoutSession } from '@/lib/db/queries'

// Local-timezone YYYY-MM-DD
function localDate(d?: Date): string {
  return (d ?? new Date()).toLocaleDateString('en-CA')
}

function formatDateDisplay(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function moodEmoji(mood: string): string {
  return { great: '😄', good: '😊', okay: '😐', low: '😔', bad: '😞' }[mood] ?? '😐'
}

interface Chip { emoji: string; text: string }

function buildSummary(stats: DailyStats | null, workouts?: WorkoutSession[]): Chip[] {
  const chips: Chip[] = []

  if (stats?.steps) chips.push({ emoji: '🚶', text: stats.steps.toLocaleString() + ' steps' })
  if (stats?.calories) {
    chips.push({
      emoji: '🍽️',
      text: stats.protein_g
        ? `${stats.calories} kcal · ${stats.protein_g}g protein`
        : `${stats.calories} kcal`,
    })
  }
  if (stats?.water_ml) {
    const l = stats.water_ml / 1000
    chips.push({ emoji: '💧', text: `${l % 1 === 0 ? l : l.toFixed(1)}L water` })
  }
  if (workouts?.length) {
    chips.push({ emoji: '💪', text: workouts.map((w) => w.description).join(' · ') })
  }
  if (stats?.sleep_hours) chips.push({ emoji: '😴', text: `${stats.sleep_hours}h sleep` })
  if (stats?.mood) chips.push({ emoji: moodEmoji(stats.mood), text: `${stats.mood} mood` })
  if (stats?.weight_kg) chips.push({ emoji: '⚖️', text: `${stats.weight_kg}kg` })
  if (stats?.habits_done?.length) {
    chips.push({ emoji: '✅', text: stats.habits_done.slice(0, 3).join(', ') })
  }

  return chips.length ? chips : []
}

function SummaryChips({ chips }: { chips: Chip[] }) {
  if (!chips.length) return <p className="text-xs text-text-subtle">Nothing logged yet today.</p>
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c, i) => (
        <span
          key={i}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-text-muted"
          style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
        >
          <span>{c.emoji}</span>
          <span>{c.text}</span>
        </span>
      ))}
    </div>
  )
}

function NoteArea({
  date,
  value,
  onChange,
  placeholder = 'Add a note…',
  rows = 3,
}: {
  date: string
  value: string
  onChange: (date: string, val: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(date, e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl text-sm text-text placeholder:text-text-subtle px-3 py-2 resize-none focus:outline-none focus:border-border-strong transition-colors"
      style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
    />
  )
}

function FullJournal({
  todayISO,
  stats,
  workouts,
  history,
  notes,
  saveStatus,
  onNoteChange,
  onClose,
}: {
  todayISO: string
  stats: DailyStats | null
  workouts: WorkoutSession[]
  history: DailyStats[]
  notes: Record<string, string>
  saveStatus: Record<string, 'saving' | 'saved' | null>
  onNoteChange: (date: string, val: string) => void
  onClose: () => void
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  // Build day list: today first, then history sorted newest-first
  const historyMap: Record<string, DailyStats> = {}
  for (const d of history) historyMap[d.date] = d

  const allDates = new Set([todayISO, ...history.map((d) => d.date)])
  const sortedDates = [...allDates].sort((a, b) => b.localeCompare(a)).slice(0, 90)

  return createPortal(
    <div
      className="fixed inset-0 flex flex-col"
      style={{ zIndex: 9999, background: 'var(--bg)' }}
    >
      <div className="flex items-center justify-between px-5 pt-6 pb-3 border-b border-border shrink-0">
        <h2 className="text-lg font-bold text-text">Journal</h2>
        <button
          onClick={onClose}
          className="text-text-subtle hover:text-text transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-5 py-6 flex flex-col gap-8">
          {sortedDates.map((date) => {
            const dayStats = date === todayISO ? stats : (historyMap[date] ?? null)
            const dayWorkouts = date === todayISO ? workouts : undefined
            const chips = buildSummary(dayStats, dayWorkouts)
            const note = notes[date] ?? ''
            const status = saveStatus[date]
            const isToday = date === todayISO

            return (
              <div key={date} className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold text-text">
                    {isToday ? 'Today' : formatDateDisplay(date)}
                  </h3>
                  {status === 'saving' && (
                    <span className="text-xs text-text-subtle">Saving…</span>
                  )}
                  {status === 'saved' && (
                    <span className="text-xs text-positive">Saved</span>
                  )}
                </div>

                {chips.length > 0 && <SummaryChips chips={chips} />}

                {!chips.length && !note && (
                  <p className="text-xs text-text-subtle">No data logged.</p>
                )}

                <NoteArea
                  date={date}
                  value={note}
                  onChange={onNoteChange}
                  placeholder={isToday ? 'How was your day?' : 'Add a note…'}
                  rows={2}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}

interface JournalWidgetProps {
  stats: DailyStats | null
  workouts: WorkoutSession[]
  history: DailyStats[]
}

export function JournalWidget({ stats, workouts, history }: JournalWidgetProps) {
  const todayISO = localDate()
  const queryClient = useQueryClient()
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saving' | 'saved' | null>>({})
  const [open, setOpen] = useState(false)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // Was a plain useState/useEffect/fetch — not invalidatable by RealtimeSync,
  // so a note added from another device never appeared here without a full
  // reload. useQuery makes it a real cache entry: 'journal-notes' is
  // invalidated on any journal_notes change and refetches in the background.
  const notesQuery = useQuery({
    queryKey: ['journal-notes'],
    queryFn: async () => {
      const res = await fetch('/api/journal')
      if (!res.ok) throw new Error('Failed to load journal notes')
      const d = await res.json()
      const map: Record<string, string> = {}
      for (const n of d.notes ?? []) map[n.note_date] = n.note
      return map
    },
  })

  // Merge incoming data in, but never clobber a day with an in-flight local
  // edit (a debounced save timer still pending) — otherwise an unrelated
  // realtime invalidation could overwrite what the user is mid-typing.
  useEffect(() => {
    if (!notesQuery.data) return
    setNotes((prev) => {
      const merged = { ...notesQuery.data }
      for (const date of Object.keys(prev)) {
        if (timers.current[date]) merged[date] = prev[date]
      }
      return merged
    })
  }, [notesQuery.data])

  const handleNoteChange = useCallback((date: string, val: string) => {
    setNotes((prev) => ({ ...prev, [date]: val }))

    clearTimeout(timers.current[date])
    timers.current[date] = setTimeout(async () => {
      setSaveStatus((prev) => ({ ...prev, [date]: 'saving' }))
      try {
        const res = await fetch('/api/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, note: val }),
        })
        if (!res.ok) throw new Error('Failed to save note')
        setSaveStatus((prev) => ({ ...prev, [date]: 'saved' }))
        setTimeout(() => setSaveStatus((prev) => ({ ...prev, [date]: null })), 2000)
      } catch {
        setSaveStatus((prev) => ({ ...prev, [date]: null }))
        toast.error('Failed to save journal note')
      } finally {
        delete timers.current[date]
        queryClient.invalidateQueries({ queryKey: ['journal-notes'] })
      }
    }, 1200)
  }, [])

  const todayChips = buildSummary(stats, workouts)
  const todayNote = notes[todayISO] ?? ''
  const todayStatus = saveStatus[todayISO]

  const noteCount = Object.values(notes).filter((n) => n.trim()).length

  return (
    <>
      <div
        className="rounded-2xl flex flex-col h-[180px] overflow-hidden"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest">Journal</h2>
          <div className="flex items-center gap-2">
            {todayStatus === 'saving' && <span className="text-[10px] text-text-subtle">Saving…</span>}
            {todayStatus === 'saved' && <span className="text-[10px] text-positive">Saved</span>}
            <button onClick={() => setOpen(true)} className="text-[10px] text-text-subtle hover:text-text transition-colors">
              {noteCount > 0 ? `${noteCount} entries` : 'All'} →
            </button>
          </div>
        </div>

        {/* Today's highlights — single truncated line */}
        {todayChips.length > 0 && (
          <p className="px-4 text-[11px] text-text-subtle truncate shrink-0">
            {todayChips.slice(0, 3).map(c => `${c.emoji} ${c.text}`).join(' · ')}
          </p>
        )}

        {/* Note textarea — fills remaining space */}
        <div className="flex-1 px-4 pb-4 pt-2 min-h-0">
          <textarea
            rows={3}
            value={todayNote}
            onChange={(e) => handleNoteChange(todayISO, e.target.value)}
            placeholder="How was your day?"
            className="w-full h-full rounded-xl text-xs text-text placeholder:text-text-subtle px-3 py-2 resize-none focus:outline-none focus:border-border-strong transition-colors"
            style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
          />
        </div>
      </div>

      {open && (
        <FullJournal
          todayISO={todayISO}
          stats={stats}
          workouts={workouts}
          history={history}
          notes={notes}
          saveStatus={saveStatus}
          onNoteChange={handleNoteChange}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
