'use client'

import { useState, useEffect, useCallback } from 'react'
import type { RoutineSession, RoutineExercise } from '@/lib/routineParser'

interface Routine {
  id: string
  name: string
  is_active: boolean
  sessions: RoutineSession[]
  created_at: string
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ExerciseRow({ ex }: { ex: RoutineExercise }) {
  const detail = [ex.sets && `${ex.sets}×`, ex.reps && `${ex.reps} reps`, ex.notes].filter(Boolean).join(' ')
  return (
    <div className="flex items-start gap-2 py-1">
      <span className="text-[11px] text-text-subtle leading-relaxed capitalize flex-1">{ex.name}</span>
      {detail && <span className="text-[10px] text-text-subtle/60 shrink-0">{detail}</span>}
    </div>
  )
}

function SessionCard({ session }: { session: RoutineSession }) {
  return (
    <div className="rounded-xl border border-border p-3 flex flex-col gap-1" style={{ background: 'var(--surface-elevated)' }}>
      <p className="text-xs font-semibold text-text">
        {session.day}{session.label ? ` — ${session.label}` : ''}
      </p>
      {session.exercises.map((ex, i) => <ExerciseRow key={i} ex={ex} />)}
    </div>
  )
}

function RoutineCard({
  routine,
  onActivate,
  onDelete,
}: {
  routine: Routine
  onActivate: (id: string, active: boolean) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-xl border p-4 flex flex-col gap-3"
      style={{
        borderColor: routine.is_active ? 'var(--accent)' : 'var(--border)',
        background: routine.is_active ? 'var(--accent-dim)' : 'var(--surface-elevated)',
      }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text truncate">{routine.name}</p>
          <p className="text-xs text-text-subtle">{routine.sessions.length} session{routine.sessions.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-[10px] text-text-subtle hover:text-text transition-colors px-2 py-1 rounded-md border border-border"
          >
            {expanded ? 'Hide' : 'View'}
          </button>
          <button
            onClick={() => onActivate(routine.id, !routine.is_active)}
            className="text-[10px] font-semibold px-2.5 py-1 rounded-md transition-colors"
            style={{
              background: routine.is_active ? 'var(--accent)' : 'var(--surface)',
              color: routine.is_active ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${routine.is_active ? 'var(--accent)' : 'var(--border)'}`,
            }}
          >
            {routine.is_active ? 'Active' : 'Activate'}
          </button>
          <button
            onClick={() => onDelete(routine.id)}
            className="text-[10px] text-text-subtle hover:text-red-400 transition-colors"
            aria-label="Delete routine"
          >
            ×
          </button>
        </div>
      </div>
      {expanded && (
        <div className="flex flex-col gap-2">
          {routine.sessions.map((s, i) => <SessionCard key={i} session={s} />)}
        </div>
      )}
    </div>
  )
}

// ─── Upload form ──────────────────────────────────────────────────────────────

function UploadForm({ onCreated }: { onCreated: (r: Routine) => void }) {
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'parsing' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!text.trim()) return
    setStatus('parsing')
    setError(null)
    try {
      const res = await fetch('/api/routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, name: name.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error ?? `HTTP ${res.status}`)
        setStatus('error')
        return
      }
      setText('')
      setName('')
      setStatus('idle')
      onCreated(json.routine as Routine)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
      setStatus('error')
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Read PDF as text via FileReader (text extraction only; works for text-based PDFs)
    if (file.type === 'application/pdf') {
      // Use the file name as a hint for the name
      if (!name) setName(file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '))
      const reader = new FileReader()
      reader.onload = () => {
        // PDF binary — extract visible text using a simple regex strip
        const raw = reader.result as string
        const stripped = raw.replace(/[\x00-\x08\x0e-\x1f\x7f-\x9f]/g, ' ')
          .replace(/\s+/g, ' ').trim().substring(0, 8000)
        setText(stripped || raw.substring(0, 8000))
      }
      reader.readAsBinaryString(file)
    } else {
      const content = await file.text()
      if (!name) setName(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))
      setText(content.substring(0, 8000))
    }
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Routine name (optional — AI will suggest one)"
          className="flex-1 rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-1.5 focus:outline-none focus:border-accent"
        />
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={`Paste your routine here, e.g.\n\nMonday: bench press 4x8, incline DB press 3x10, skullcrushers 3x12\nWednesday: squats 4x8, leg press 3x12\nFriday: deadlift 3x5, rows 4x8`}
        rows={6}
        className="w-full rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent resize-none font-mono"
      />

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-text-subtle cursor-pointer hover:text-text transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Upload file (PDF or text)
          <input type="file" accept=".txt,.pdf,.md" onChange={handleFile} className="hidden" />
        </label>

        <div className="flex-1" />

        <button
          onClick={handleSubmit}
          disabled={!text.trim() || status === 'parsing'}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {status === 'parsing' ? 'Parsing…' : 'Parse & save'}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
      )}
    </div>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────

export function RoutineSection() {
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/routine')
      if (!res.ok) return
      const json = await res.json()
      setRoutines(json.routines ?? [])
    } catch { /* non-fatal */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleActivate(id: string, active: boolean) {
    const res = await fetch(`/api/routine?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: active }),
    })
    if (!res.ok) return
    setRoutines(prev => prev.map(r => ({ ...r, is_active: active ? r.id === id : r.is_active && r.id !== id })))
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/routine?id=${id}`, { method: 'DELETE' })
    if (!res.ok) return
    setRoutines(prev => prev.filter(r => r.id !== id))
  }

  function handleCreated(r: Routine) {
    setRoutines(prev => [r, ...prev])
    setShowForm(false)
  }

  return (
    <div className="flex flex-col gap-4">
      {loading ? (
        <p className="text-xs text-text-subtle">Loading…</p>
      ) : (
        <>
          {routines.length === 0 && !showForm && (
            <p className="text-xs text-text-subtle">No routines saved yet. Add one below to get smart muscle-load predictions and WHOOP workout matching.</p>
          )}
          {routines.map(r => (
            <RoutineCard key={r.id} routine={r} onActivate={handleActivate} onDelete={handleDelete} />
          ))}
        </>
      )}

      {showForm ? (
        <div className="flex flex-col gap-2">
          <UploadForm onCreated={handleCreated} />
          <button onClick={() => setShowForm(false)} className="text-xs text-text-subtle hover:text-text self-start">Cancel</button>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="self-start text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors"
          style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
        >
          + Add routine
        </button>
      )}
    </div>
  )
}
