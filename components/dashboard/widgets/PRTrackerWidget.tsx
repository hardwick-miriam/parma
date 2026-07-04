'use client'

import { useEffect, useState } from 'react'

interface PR {
  id: string
  exercise: string
  value: number
  unit: string
  reps?: number | null
  logged_at: string
  notes?: string | null
}

interface NewPR {
  exercise: string
  value: string
  unit: string
  reps: string
}

const UNITS = ['kg', 'lbs', 'reps', 'km', 'm', 'seconds']

export function PRTrackerWidget() {
  const [prs, setPrs] = useState<PR[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<NewPR>({ exercise: '', value: '', unit: 'kg', reps: '' })

  useEffect(() => {
    fetch('/api/personal-records')
      .then((r) => r.json())
      .then((d) => setPrs(d.records ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    if (!form.exercise.trim() || !form.value) return
    setSaving(true)
    try {
      const res = await fetch('/api/personal-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise: form.exercise.trim(),
          value: parseFloat(form.value),
          unit: form.unit,
          reps: form.reps ? parseInt(form.reps) : null,
        }),
      })
      const d = await res.json()
      if (res.ok && d.record) {
        setPrs((prev) => {
          const filtered = prev.filter((p) => !(p.exercise.toLowerCase() === d.record.exercise.toLowerCase() && p.unit === d.record.unit))
          return [d.record, ...filtered].sort((a, b) => a.exercise.localeCompare(b.exercise))
        })
        setAdding(false)
        setForm({ exercise: '', value: '', unit: 'kg', reps: '' })
      }
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  function formatPR(pr: PR): string {
    const val = Number.isInteger(pr.value) ? pr.value : pr.value.toFixed(1)
    const repsStr = pr.reps ? ` × ${pr.reps}` : ''
    return `${val} ${pr.unit}${repsStr}`
  }

  return (
    <div className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-3 h-full overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Personal Records</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-xs px-2 py-1 rounded-lg border border-border hover:border-accent transition-colors"
          style={{ color: 'var(--accent)' }}
        >
          {adding ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {adding && (
        <div className="flex flex-col gap-2 p-3 rounded-xl border border-border" style={{ background: 'var(--surface-elevated)' }}>
          <input
            className="text-sm bg-transparent border-b border-border pb-1 focus:outline-none text-text placeholder:text-text-subtle"
            placeholder="Exercise (e.g. Back squat)"
            value={form.exercise}
            onChange={(e) => setForm((f) => ({ ...f, exercise: e.target.value }))}
          />
          <div className="flex gap-2">
            <input
              type="number"
              className="w-20 text-sm bg-transparent border-b border-border pb-1 focus:outline-none text-text"
              placeholder="Value"
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            />
            <select
              className="text-sm bg-transparent border-b border-border pb-1 focus:outline-none text-text"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            >
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <input
              type="number"
              className="w-12 text-sm bg-transparent border-b border-border pb-1 focus:outline-none text-text"
              placeholder="Reps"
              value={form.reps}
              onChange={(e) => setForm((f) => ({ ...f, reps: e.target.value }))}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !form.exercise || !form.value}
            className="self-end text-xs px-3 py-1.5 rounded-lg bg-accent text-white disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save PR'}
          </button>
        </div>
      )}

      {loading && <p className="text-text-subtle text-xs text-center py-2">Loading…</p>}

      {!loading && prs.length === 0 && !adding && (
        <p className="text-text-subtle text-xs text-center py-2">No PRs yet — add your first!</p>
      )}

      <div className="flex flex-col gap-1 overflow-y-auto flex-1">
        {prs.map((pr) => (
          <div key={pr.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-surface-elevated transition-colors">
            <span className="text-sm text-text font-medium truncate flex-1">{pr.exercise}</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-mono font-semibold" style={{ color: 'var(--accent)' }}>{formatPR(pr)}</span>
              <span className="text-xs text-text-subtle">{new Date(pr.logged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
