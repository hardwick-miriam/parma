'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { LEARNING_TYPES, LEARNING_STATUSES, type LearningType, type LearningStatus } from '@/lib/learningTypes'

interface LearningItem {
  id: string
  title: string
  type: LearningType
  status: LearningStatus
  progress_pct: number | null
  rating: number | null
  started_on: string | null
  finished_on: string | null
  notes: string | null
}

const TYPE_EMOJI: Record<LearningType, string> = { book: '📖', course: '🎓', audiobook: '🎧', paper: '📄' }
const STATUS_LABEL: Record<LearningStatus, string> = { want: 'Want to', 'in-progress': 'In progress', finished: 'Finished' }

function ItemRow({ item, onUpdate, onDelete }: {
  item: LearningItem
  onUpdate: (id: string, updates: Partial<LearningItem>) => void
  onDelete: (id: string) => void
}) {
  const [editingProgress, setEditingProgress] = useState(false)
  const [progressDraft, setProgressDraft] = useState(String(item.progress_pct ?? 0))

  return (
    <div className="rounded-xl bg-surface border border-border p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-text flex items-center gap-1.5">
          <span aria-hidden>{TYPE_EMOJI[item.type]}</span> {item.title}
        </span>
        <button onClick={() => onDelete(item.id)} className="text-xs text-red-400 hover:text-red-300 shrink-0">Delete</button>
      </div>

      {item.status === 'in-progress' && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${item.progress_pct ?? 0}%`, background: 'var(--accent)' }} />
          </div>
          {editingProgress ? (
            <input
              autoFocus type="number" min="0" max="100" value={progressDraft}
              onChange={(e) => setProgressDraft(e.target.value)}
              onBlur={() => { onUpdate(item.id, { progress_pct: Number(progressDraft) }); setEditingProgress(false) }}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
              className="w-12 text-xs text-center rounded bg-surface-elevated border border-border text-text px-1 py-0.5"
            />
          ) : (
            <button onClick={() => setEditingProgress(true)} className="text-xs text-text-subtle tabular-nums">{item.progress_pct ?? 0}%</button>
          )}
        </div>
      )}

      {item.status === 'finished' && item.rating != null && (
        <p className="text-xs text-accent">{'★'.repeat(Math.round(item.rating / 2))} {item.rating}/10</p>
      )}

      <div className="flex items-center gap-2">
        <select
          value={item.status}
          onChange={(e) => onUpdate(item.id, { status: e.target.value as LearningStatus })}
          className="text-xs rounded-lg bg-surface-elevated border border-border text-text-muted px-2 py-1"
        >
          {LEARNING_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        {item.status === 'finished' && (
          <input
            type="number" min="1" max="10" placeholder="Rate /10"
            defaultValue={item.rating ?? ''}
            onBlur={(e) => e.target.value && onUpdate(item.id, { rating: Number(e.target.value) })}
            className="w-20 text-xs rounded-lg bg-surface-elevated border border-border text-text px-2 py-1"
          />
        )}
      </div>
    </div>
  )
}

export function LearningTrackerSection() {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<LearningType>('book')

  const itemsQuery = useQuery({
    queryKey: ['learning-items'],
    queryFn: async () => {
      const res = await fetch('/api/learning-items')
      if (!res.ok) throw new Error('Failed to load')
      return (await res.json()) as { items: LearningItem[] }
    },
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/learning-items', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type, status: 'want' }),
      })
      if (!res.ok) throw new Error('Failed to add')
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['learning-items'] }); setTitle('') },
    onError: () => toast.error('Failed to add item'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LearningItem> }) => {
      const res = await fetch(`/api/learning-items/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['learning-items'] }),
    onError: () => toast.error('Failed to update item'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/learning-items/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['learning-items'] }),
    onError: () => toast.error('Failed to delete item'),
  })

  const items = itemsQuery.data?.items ?? []
  const want = items.filter((i) => i.status === 'want')
  const inProgress = items.filter((i) => i.status === 'in-progress')
  const finished = items.filter((i) => i.status === 'finished')
  const thisYear = new Date().getFullYear()
  const finishedThisYear = finished.filter((i) => i.finished_on?.startsWith(String(thisYear))).length

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Reading &amp; learning</p>
          <p className="text-xs text-text-subtle">{finishedThisYear} finished this year</p>
        </div>
        <div className="flex gap-2">
          <input
            value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title…"
            className="flex-1 rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent"
          />
          <select
            value={type} onChange={(e) => setType(e.target.value as LearningType)}
            className="rounded-lg bg-surface-elevated border border-border text-text text-sm px-2 py-2"
          >
            {LEARNING_TYPES.map((t) => <option key={t} value={t}>{TYPE_EMOJI[t]} {t}</option>)}
          </select>
          <button
            onClick={() => addMutation.mutate()}
            disabled={!title.trim() || addMutation.isPending}
            className="rounded-lg text-sm font-semibold text-white disabled:opacity-40 px-3 py-2"
            style={{ background: 'var(--accent)' }}
          >
            Add
          </button>
        </div>
      </div>

      {itemsQuery.isLoading && <p className="text-sm text-text-subtle">Loading…</p>}

      {inProgress.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">In progress</p>
          <div className="flex flex-col gap-2">
            {inProgress.map((i) => <ItemRow key={i.id} item={i} onUpdate={(id, u) => updateMutation.mutate({ id, updates: u })} onDelete={(id) => deleteMutation.mutate(id)} />)}
          </div>
        </div>
      )}

      {want.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Want to</p>
          <div className="flex flex-col gap-2">
            {want.map((i) => <ItemRow key={i.id} item={i} onUpdate={(id, u) => updateMutation.mutate({ id, updates: u })} onDelete={(id) => deleteMutation.mutate(id)} />)}
          </div>
        </div>
      )}

      {finished.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Finished</p>
          <div className="flex flex-col gap-2">
            {finished.map((i) => <ItemRow key={i.id} item={i} onUpdate={(id, u) => updateMutation.mutate({ id, updates: u })} onDelete={(id) => deleteMutation.mutate(id)} />)}
          </div>
        </div>
      )}

      {!itemsQuery.isLoading && items.length === 0 && (
        <p className="text-sm text-text-subtle py-6 text-center">Nothing tracked yet.</p>
      )}
    </div>
  )
}
