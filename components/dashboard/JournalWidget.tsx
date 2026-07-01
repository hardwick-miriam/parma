'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
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
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saving' | 'saved' | null>>({})
  const [open, setOpen] = useState(false)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    fetch('/api/journal')
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, string> = {}
        for (const n of d.notes ?? []) map[n.note_date] = n.note
        setNotes(map)
      })
      .catch(() => {})
  }, [])

  const handleNoteChange = useCallback((date: string, val: string) => {
    setNotes((prev) => ({ ...prev, [date]: val }))

    clearTimeout(timers.current[date])
    timers.current[date] = setTimeout(async () => {
      setSaveStatus((prev) => ({ ...prev, [date]: 'saving' }))
      try {
        await fetch('/api/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, note: val }),
        })
        setSaveStatus((prev) => ({ ...prev, [date]: 'saved' }))
        setTimeout(() => setSaveStatus((prev) => ({ ...prev, [date]: null })), 2000)
      } catch {
        setSaveStatus((prev) => ({ ...prev, [date]: null }))
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
        className="rounded-2xl flex flex-col gap-4 p-5"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Journal</h2>
          <div className="flex items-center gap-3">
            {todayStatus === 'saving' && (
              <span className="text-xs text-text-subtle">Saving…</span>
            )}
            {todayStatus === 'saved' && (
              <span className="text-xs text-positive">Saved</span>
            )}
            <button
              onClick={() => setOpen(true)}
              className="text-xs text-text-subtle hover:text-text transition-colors"
            >
              {noteCount > 0 ? `${noteCount} ${noteCount === 1 ? 'entry' : 'entries'}` : 'View all'} →
            </button>
          </div>
        </div>

        <SummaryChips chips={todayChips} />

        <NoteArea
          date={todayISO}
          value={todayNote}
          onChange={handleNoteChange}
          placeholder="How was your day?"
        />
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
