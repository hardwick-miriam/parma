'use client'

import { useState } from 'react'
import type { ParsedLog } from '@/lib/ai/types'

interface ConfirmationDrawerProps {
  rawText: string
  parsed: ParsedLog
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
  { key: 'mood' as const, label: 'Mood' },
  { key: 'injury_description' as const, label: 'Injury description' },
  { key: 'notes' as const, label: 'Notes' },
]

export function ConfirmationDrawer({ rawText, parsed, onConfirm, onDiscard }: ConfirmationDrawerProps) {
  const [edited, setEdited] = useState<ParsedLog>({ ...parsed })
  const [saving, setSaving] = useState(false)

  function setNum(key: keyof ParsedLog, val: string) {
    setEdited((p) => ({ ...p, [key]: val === '' ? undefined : Number(val) }))
  }

  function setStr(key: keyof ParsedLog, val: string) {
    setEdited((p) => ({ ...p, [key]: val === '' ? undefined : val }))
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
    edited.sick != null || edited.injured != null ||
    edited.supplements?.length || edited.habits_done?.length ||
    edited.workouts?.length

  async function handleConfirm() {
    setSaving(true)
    await onConfirm(edited)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* Panel: flex-col with header + scrollable body + sticky footer */}
      <div
        className="w-full max-w-lg bg-surface rounded-t-2xl sm:rounded-2xl flex flex-col"
        style={{ maxHeight: '90dvh' }}
      >
        {/* Header — always visible */}
        <div className="px-6 pt-6 pb-4 shrink-0">
          <h2 className="text-base font-semibold text-text">Review your log</h2>
          <p className="text-xs text-text-muted mt-1 line-clamp-2">{rawText}</p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-2 flex flex-col gap-5">
          {!hasAnything && (
            <p className="text-text-subtle text-sm">Nothing was detected. Try being more specific.</p>
          )}

          {/* Number fields */}
          {presentNumbers.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {presentNumbers.map(({ key, label }) => (
                <label key={key} className="flex flex-col gap-1">
                  <span className="text-xs text-text-muted">{label}</span>
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

          {/* Text fields */}
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

          {/* Boolean toggles */}
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

          {/* Supplements */}
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

          {/* Habits */}
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

          {/* Workouts */}
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
        </div>

        {/* Footer — always visible, Save never scrolls out of reach */}
        <div className="px-6 py-4 shrink-0 border-t border-border flex gap-3">
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
  )
}
