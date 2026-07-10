'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { getLocalDate } from '@/lib/date'
import type { ParsedLog } from '@/lib/ai/types'

interface ConfirmationDrawerProps {
  rawText: string
  parsed: ParsedLog
  saveError?: string
  onConfirm: (edited: ParsedLog) => Promise<void>
  onDiscard: () => void
}

const NUMBER_FIELDS = [
  { key: 'calories' as const, label: 'Calories (kcal)' },
  { key: 'protein_g' as const, label: 'Protein (g)' },
  { key: 'steps' as const, label: 'Steps' },
  { key: 'water_ml' as const, label: 'Water (ml)' },
  { key: 'sleep_hours' as const, label: 'Sleep (hours)' },
  { key: 'weight_kg' as const, label: 'Weight (kg)' },
  { key: 'sick_estimated_days' as const, label: 'Sick est. days' },
  { key: 'injury_estimated_days' as const, label: 'Injury est. days' },
]

const TEXT_FIELDS = [
  { key: 'injury_description' as const, label: 'Injury description' },
  { key: 'notes' as const, label: 'Notes' },
]

const MOOD_OPTIONS = ['great', 'good', 'okay', 'low', 'bad'] as const

export function ConfirmationDrawer({ rawText, parsed, saveError, onConfirm, onDiscard }: ConfirmationDrawerProps) {
  const [edited, setEdited] = useState<ParsedLog>({ ...parsed })
  const [saving, setSaving] = useState(false)
  // Portal needs document — wait for client mount to avoid SSR mismatch
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  function setNum(key: keyof ParsedLog, val: string) {
    if (val === '') {
      setEdited((p) => ({ ...p, [key]: undefined }))
      return
    }
    const n = Number(val)
    // Ignore keystrokes that don't yet form a valid number (e.g. a bare "-"
    // or "." mid-edit) instead of writing NaN into state — NaN would sail
    // through as "present" and fail as an opaque DB error on save.
    if (!Number.isFinite(n)) return
    setEdited((p) => ({ ...p, [key]: n }))
  }

  function setStr(key: keyof ParsedLog, val: string) {
    setEdited((p) => ({ ...p, [key]: val === '' ? undefined : val }))
  }

  function setMood(val: string) {
    setEdited((p) => ({ ...p, mood: val === '' ? undefined : (val as ParsedLog['mood']) }))
  }

  function setLogDate(val: string) {
    setEdited((p) => ({ ...p, log_date: val || undefined }))
  }

  function setBool(key: 'sick' | 'injured', val: boolean) {
    setEdited((p) => ({ ...p, [key]: val }))
  }

  function setArray(key: 'supplements' | 'habits_done', val: string) {
    const arr = val.split(',').map((s) => s.trim()).filter(Boolean)
    setEdited((p) => ({ ...p, [key]: arr.length ? arr : undefined }))
  }

  const presentNumbers = NUMBER_FIELDS.filter(({ key }) => edited[key] != null)
  const presentText = TEXT_FIELDS.filter(({ key }) => edited[key] != null)
  const hasAnything = presentNumbers.length > 0 || presentText.length > 0 ||
    edited.mood != null ||
    edited.sick != null || edited.injured != null ||
    edited.supplements?.length || edited.habits_done?.length ||
    edited.workouts?.length ||
    edited.injury_checkin != null || edited.injury_resolved != null ||
    edited.media?.length || edited.countries_visited?.length ||
    edited.world_clock_cities?.length

  async function handleConfirm() {
    setSaving(true)
    await onConfirm(edited)
    setSaving(false)
  }

  if (!mounted) return null

  // Render via portal so the modal escapes the fixed bottom bar's
  // backdrop-filter containing block (which hijacks position:fixed).
  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center px-4"
      style={{ zIndex: 9999 }}
    >
      {/* Dimmed backdrop — clicking it discards */}
      <div
        className="absolute inset-0 bg-black/70"
        style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        onClick={onDiscard}
      />

      {/* Modal panel */}
      <div
        className="relative w-full max-w-lg bg-surface rounded-2xl flex flex-col"
        style={{
          maxHeight: '85dvh',
          boxShadow: 'var(--shadow-lg), 0 0 60px rgba(139,92,246,0.18)',
          border: '1px solid var(--border-strong)',
        }}
      >
        {/* Header — always visible */}
        <div className="px-6 pt-6 pb-4 shrink-0">
          <h2 className="text-base font-semibold text-text">Review your log</h2>
          <p className="text-xs text-text-muted mt-1 line-clamp-2">{rawText}</p>
        </div>

        {/* Scrollable fields */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-2 flex flex-col gap-5">
          {!hasAnything && (
            <p className="text-text-subtle text-sm">Nothing was detected. Try being more specific.</p>
          )}

          {/* F2: the AI's resolved date (including the post-midnight
              "yesterday's dinner" heuristic) is always reviewable and
              correctable here before saving — not just shown when the AI
              flagged the entry as backdated. */}
          {hasAnything && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-muted">Date this entry belongs to</span>
              <input
                type="date"
                value={edited.log_date ?? getLocalDate()}
                onChange={(e) => setLogDate(e.target.value)}
                max={getLocalDate()}
                className="rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-border-strong"
              />
            </label>
          )}

          {edited.mood != null && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-muted">Mood</span>
              <select
                value={edited.mood}
                onChange={(e) => setMood(e.target.value)}
                className="rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-border-strong capitalize"
              >
                {MOOD_OPTIONS.map((m) => (
                  <option key={m} value={m} className="capitalize">{m}</option>
                ))}
              </select>
            </label>
          )}

          {presentNumbers.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {presentNumbers.map(({ key, label }) => (
                <label key={key} className="flex flex-col gap-1">
                  <span className="text-xs text-text-muted">
                    {label}
                    {/* AI-inferred rather than stated by the user — the model already tells us
                        this via `estimates`, which nothing ever surfaced before. */}
                    {edited.estimates?.includes(key) && (
                      <span className="text-text-subtle" title="Estimated — not explicitly stated"> ~est.</span>
                    )}
                  </span>
                  <input
                    type="number"
                    value={edited[key] as number ?? ''}
                    onChange={(e) => setNum(key, e.target.value)}
                    className="rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-border-strong"
                  />
                </label>
              ))}
            </div>
          )}

          {presentText.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {presentText.map(({ key, label }) => (
                <label key={key} className="flex flex-col gap-1">
                  <span className="text-xs text-text-muted">{label}</span>
                  <input
                    type="text"
                    value={edited[key] as string ?? ''}
                    onChange={(e) => setStr(key, e.target.value)}
                    className="rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-border-strong"
                  />
                </label>
              ))}
            </div>
          )}

          {(edited.sick != null || edited.injured != null) && (
            <div className="flex gap-4">
              {edited.sick != null && (
                <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!edited.sick}
                    onChange={(e) => setBool('sick', e.target.checked)}
                    className="accent-accent"
                  />
                  Sick
                </label>
              )}
              {edited.injured != null && (
                <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!edited.injured}
                    onChange={(e) => setBool('injured', e.target.checked)}
                    className="accent-accent"
                  />
                  Injured
                </label>
              )}
            </div>
          )}

          {edited.supplements?.length ? (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-muted">Supplements (comma-separated)</span>
              <input
                type="text"
                value={edited.supplements.join(', ')}
                onChange={(e) => setArray('supplements', e.target.value)}
                className="rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-border-strong"
              />
            </label>
          ) : null}

          {edited.habits_done?.length ? (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-muted">Habits done (comma-separated)</span>
              <input
                type="text"
                value={edited.habits_done.join(', ')}
                onChange={(e) => setArray('habits_done', e.target.value)}
                className="rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-border-strong"
              />
            </label>
          ) : null}

          {edited.workouts?.length ? (
            <div>
              <p className="text-xs text-text-muted mb-2">Workouts detected</p>
              <ul className="flex flex-col gap-1">
                {edited.workouts.map((w, i) => (
                  <li key={i} className="text-sm text-text bg-surface-elevated rounded-lg px-3 py-2">
                    {w.description}{w.duration_minutes ? ` · ${w.duration_minutes}min` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {edited.injury_checkin != null ? (
            <div>
              <p className="text-xs text-text-muted mb-2">Injury check-in</p>
              <div className="bg-surface-elevated rounded-lg px-3 py-2 flex flex-col gap-0.5">
                {edited.injury_checkin.body_part && (
                  <p className="text-sm text-text">
                    <span className="text-text-muted">Body part: </span>{edited.injury_checkin.body_part}
                  </p>
                )}
                <p className="text-sm text-text">
                  <span className="text-text-muted">Feeling: </span>{edited.injury_checkin.feeling_pct}%
                </p>
                {edited.injury_checkin.activity && (
                  <p className="text-sm text-text">
                    <span className="text-text-muted">Activity: </span>{edited.injury_checkin.activity}
                  </p>
                )}
                {edited.injury_checkin.notes && (
                  <p className="text-sm text-text">
                    <span className="text-text-muted">Notes: </span>{edited.injury_checkin.notes}
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {edited.countries_visited?.length ? (
            <div>
              <p className="text-xs text-text-muted mb-2">Countries visited</p>
              <p className="text-sm text-text bg-surface-elevated rounded-lg px-3 py-2">
                {edited.countries_visited.join(', ')}
              </p>
            </div>
          ) : null}

          {edited.media?.length ? (
            <div>
              <p className="text-xs text-text-muted mb-2">Media logged</p>
              <ul className="flex flex-col gap-1">
                {edited.media.map((m, i) => (
                  <li key={i} className="text-sm text-text bg-surface-elevated rounded-lg px-3 py-2 flex items-baseline gap-2">
                    <span className="text-text-subtle text-xs capitalize shrink-0">{m.category}</span>
                    <span className="font-medium truncate">{m.title}</span>
                    {m.rating != null && <span className="text-accent text-xs shrink-0">{m.rating}/10</span>}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {edited.world_clock_cities?.length ? (
            <div>
              <p className="text-xs text-text-muted mb-2">World clocks to add</p>
              <p className="text-sm text-text bg-surface-elevated rounded-lg px-3 py-2">
                {edited.world_clock_cities.join(', ')}
              </p>
            </div>
          ) : null}

          {edited.injury_resolved != null ? (
            <div>
              <p className="text-xs text-text-muted mb-2">Injury resolved</p>
              <div className="bg-surface-elevated rounded-lg px-3 py-2">
                <p className="text-sm text-text">
                  {edited.injury_resolved.body_part
                    ? <>Marking <strong>{edited.injury_resolved.body_part}</strong> injury as healed</>
                    : 'Marking injury as healed'}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer — pinned, always visible */}
        <div className="px-6 py-4 shrink-0 border-t border-border flex flex-col gap-3">
          {saveError && (
            <p className="text-xs text-red-400 text-center">{saveError}</p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onDiscard}
              className="flex-1 py-2.5 rounded-xl border border-border text-text-muted text-sm hover:border-border-strong transition-colors"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving || !hasAnything}
              className="flex-1 py-2.5 rounded-xl bg-accent text-bg text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
