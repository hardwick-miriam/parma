'use client'

import { useState } from 'react'
import type { ParsedLog } from '@/lib/ai/types'

interface ConfirmationDrawerProps {
  rawText: string
  parsed: ParsedLog
  onConfirm: (edited: ParsedLog) => Promise<void>
  onDiscard: () => void
}

type Field = { key: keyof ParsedLog; label: string; type: 'number' | 'text' }

const FIELDS: Field[] = [
  { key: 'calories', label: 'Calories (kcal)', type: 'number' },
  { key: 'protein_g', label: 'Protein (g)', type: 'number' },
  { key: 'steps', label: 'Steps', type: 'number' },
  { key: 'water_ml', label: 'Water (ml)', type: 'number' },
  { key: 'sleep_hours', label: 'Sleep (hours)', type: 'number' },
  { key: 'mood', label: 'Mood', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'text' },
]

export function ConfirmationDrawer({
  rawText,
  parsed,
  onConfirm,
  onDiscard,
}: ConfirmationDrawerProps) {
  const [edited, setEdited] = useState<ParsedLog>({ ...parsed })
  const [saving, setSaving] = useState(false)

  function setValue(key: keyof ParsedLog, value: string) {
    setEdited((prev) => ({
      ...prev,
      [key]: value === '' ? undefined : isNaN(Number(value)) ? value : Number(value),
    }))
  }

  async function handleConfirm() {
    setSaving(true)
    await onConfirm(edited)
    setSaving(false)
  }

  const presentFields = FIELDS.filter(
    (f) => edited[f.key] !== undefined && edited[f.key] !== null
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-surface rounded-t-2xl sm:rounded-2xl p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div>
          <h2 className="text-base font-semibold text-text">Review your log</h2>
          <p className="text-xs text-text-muted mt-1 line-clamp-2">{rawText}</p>
        </div>

        {presentFields.length === 0 && (
          <p className="text-text-subtle text-sm">
            Nothing was detected. Try being more specific.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          {presentFields.map(({ key, label, type }) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-xs text-text-muted">{label}</span>
              <input
                type={type === 'number' ? 'number' : 'text'}
                value={String(edited[key] ?? '')}
                onChange={(e) => setValue(key, e.target.value)}
                className="rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-border-strong"
              />
            </label>
          ))}
        </div>

        {parsed.workouts?.length ? (
          <div>
            <p className="text-xs text-text-muted mb-2">Workouts detected</p>
            <ul className="flex flex-col gap-1">
              {parsed.workouts.map((w, i) => (
                <li key={i} className="text-sm text-text bg-surface-elevated rounded-lg px-3 py-2">
                  {w.description}
                  {w.duration_minutes ? ` · ${w.duration_minutes}min` : ''}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex gap-3 pt-2">
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
            disabled={saving || presentFields.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-accent text-bg text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
