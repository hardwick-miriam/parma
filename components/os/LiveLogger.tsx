'use client'

import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { firePR } from '@/lib/confetti'
import type { WorkoutSet } from '@/lib/gymTypes'
import { recommendNextSet } from '@/lib/gymRecommendation'

const REP_CHOICES = Array.from({ length: 12 }, (_, i) => i + 1)

interface ExerciseDetail {
  lastTime: WorkoutSet | null
  stats: { estimated1RM: number | null; bestSet: { weight: number; reps: number } | null; sessionCount: number }
  trend: { date: string; topWeight: number; estimated1RM: number }[]
  history: { sessionId: string; date: string; sets: { weight: number; reps: number; isWarmup: boolean }[] }[]
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function LiveLogger() {
  const queryClient = useQueryClient()
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState<number | null>(null)
  const [customReps, setCustomReps] = useState('')
  const [isWarmup, setIsWarmup] = useState(false)

  const sessionQuery = useQuery({
    queryKey: ['gym-session'],
    queryFn: async () => {
      const res = await fetch('/api/gym/session', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to start session')
      return res.json() as Promise<{ sessionId: string; sets: WorkoutSet[] }>
    },
    staleTime: Infinity,
  })

  const searchQuery = useQuery({
    queryKey: ['gym-exercises', search],
    queryFn: async () => {
      const res = await fetch(`/api/gym/exercises?q=${encodeURIComponent(search)}`)
      return (await res.json()) as { names: string[] }
    },
    enabled: showSearch,
    placeholderData: keepPreviousData,
  })

  const detailQuery = useQuery({
    queryKey: ['gym-exercise-detail', selectedExercise, sessionQuery.data?.sessionId],
    queryFn: async () => {
      const params = sessionQuery.data?.sessionId ? `?excludeSessionId=${sessionQuery.data.sessionId}` : ''
      const res = await fetch(`/api/gym/exercise/${encodeURIComponent(selectedExercise!)}${params}`)
      return (await res.json()) as ExerciseDetail
    },
    enabled: !!selectedExercise,
  })
  const detailReady = !detailQuery.isLoading

  type GymSession = { sessionId: string; sets: WorkoutSet[] }

  const logSetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/gym/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionQuery.data!.sessionId,
          exerciseName: selectedExercise,
          weight: Number(weight),
          reps: reps ?? Number(customReps),
          isWarmup,
        }),
      })
      if (!res.ok) throw new Error('Failed to log set')
      return res.json() as Promise<{ set: WorkoutSet; isNewPR: boolean; prValue: number | null }>
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['gym-session'] })
      const previous = queryClient.getQueryData<GymSession>(['gym-session'])
      const optimisticSet: WorkoutSet = {
        id: `optimistic-${Date.now()}`,
        user_id: '',
        workout_session_id: previous?.sessionId ?? '',
        exercise_name: selectedExercise!,
        weight: Number(weight),
        reps: reps ?? Number(customReps),
        is_warmup: isWarmup,
        logged_at: new Date().toISOString(),
      }
      queryClient.setQueryData<GymSession>(['gym-session'], (old) => old ? { ...old, sets: [...old.sets, optimisticSet] } : old)
      return { previous }
    },
    onSuccess: (data) => {
      if (data.isNewPR) {
        firePR()
        toast.success(`New PR! ${data.prValue}kg on ${selectedExercise}`)
      } else {
        toast.success('Set logged')
      }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['gym-session'], context.previous)
      toast.error('Failed to log set')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['gym-session'] })
      queryClient.invalidateQueries({ queryKey: ['gym-exercise-detail'] })
    },
  })

  const deleteSetMutation = useMutation({
    mutationFn: async (setId: string) => {
      const res = await fetch(`/api/gym/sets/${setId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete set')
    },
    onMutate: async (setId) => {
      await queryClient.cancelQueries({ queryKey: ['gym-session'] })
      const previous = queryClient.getQueryData<GymSession>(['gym-session'])
      queryClient.setQueryData<GymSession>(['gym-session'], (old) => old ? { ...old, sets: old.sets.filter((s) => s.id !== setId) } : old)
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['gym-session'], context.previous)
      toast.error('Failed to delete set')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['gym-session'] })
      queryClient.invalidateQueries({ queryKey: ['gym-exercise-detail'] })
    },
  })

  const editSetMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { weight?: number; reps?: number } }) => {
      const res = await fetch(`/api/gym/sets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update set')
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['gym-session'] })
      const previous = queryClient.getQueryData<GymSession>(['gym-session'])
      queryClient.setQueryData<GymSession>(['gym-session'], (old) =>
        old ? { ...old, sets: old.sets.map((s) => (s.id === id ? { ...s, ...updates } : s)) } : old
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['gym-session'], context.previous)
      toast.error('Failed to update set')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['gym-session'] })
      queryClient.invalidateQueries({ queryKey: ['gym-exercise-detail'] })
    },
  })

  const sessionSetsForExercise = useMemo(
    () => (sessionQuery.data?.sets ?? []).filter((s) => s.exercise_name === selectedExercise),
    [sessionQuery.data, selectedExercise]
  )

  const recommendation = useMemo(() => {
    if (!detailQuery.data?.lastTime) return null
    return recommendNextSet({ weight: detailQuery.data.lastTime.weight, reps: detailQuery.data.lastTime.reps })
  }, [detailQuery.data])

  function pickExercise(name: string) {
    setSelectedExercise(name)
    setShowSearch(false)
    setSearch('')
    setWeight('')
    setReps(null)
    setCustomReps('')
  }

  function applyRecommendation() {
    if (!recommendation) return
    setWeight(String(recommendation.weight))
    setReps(recommendation.reps <= 12 ? recommendation.reps : null)
    if (recommendation.reps > 12) setCustomReps(String(recommendation.reps))
  }

  const canLog = !!selectedExercise && !!weight && Number(weight) > 0 && (reps != null || Number(customReps) > 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Exercise picker */}
      <div className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-2">
        <button
          onClick={() => setShowSearch((v) => !v)}
          className="flex items-center justify-between gap-2 text-left"
        >
          <span className="text-sm font-medium text-text">
            {selectedExercise ?? 'Pick an exercise'}
          </span>
          <span className="text-xs text-accent">{selectedExercise ? 'Change' : 'Search →'}</span>
        </button>

        {showSearch && (
          <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercises… (blank = recent)"
              className="w-full rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent"
            />
            <div className="flex flex-col max-h-56 overflow-y-auto divide-y divide-border">
              {searchQuery.isLoading ? (
                <p className="text-xs text-text-subtle py-2">Searching…</p>
              ) : (
                <>
                  {(searchQuery.data?.names ?? []).map((name) => (
                    <button
                      key={name}
                      onClick={() => pickExercise(name)}
                      className="text-left py-2 text-sm text-text-muted hover:text-text capitalize"
                    >
                      {name}
                    </button>
                  ))}
                  {searchQuery.data?.names?.length === 0 && (
                    <p className="text-xs text-text-subtle py-2">No matches</p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedExercise && (
        <>
          {/* Last time + recommendation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl bg-surface border border-border p-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-1">Last time</p>
              {!detailReady ? (
                <div className="h-6 w-24 rounded bg-surface-elevated animate-pulse" />
              ) : detailQuery.data?.lastTime ? (
                <p className="text-lg font-bold text-text">
                  {detailQuery.data.lastTime.weight}kg × {detailQuery.data.lastTime.reps}
                </p>
              ) : (
                <p className="text-sm text-text-subtle">No previous sets logged</p>
              )}
            </div>

            <div className="rounded-2xl border p-4" style={{ background: 'var(--accent-dim)', borderColor: 'var(--accent)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--accent)' }}>Next-set suggestion</p>
              {!detailReady ? (
                <div className="h-6 w-28 rounded bg-black/10 animate-pulse" />
              ) : recommendation ? (
                <>
                  <p className="text-lg font-bold text-text">{recommendation.weight}kg × {recommendation.reps}</p>
                  <p className="text-xs text-text-muted mt-0.5">{recommendation.reason}</p>
                  <button onClick={applyRecommendation} className="text-xs font-medium mt-2" style={{ color: 'var(--accent)' }}>
                    Use this →
                  </button>
                </>
              ) : (
                <p className="text-sm text-text-subtle">Log a set to get a suggestion next time</p>
              )}
            </div>
          </div>

          {/* Weight + reps + log */}
          <div className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Weight (kg)
              <input
                type="number" step="0.5" min="0" value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full rounded-lg bg-surface-elevated border border-border text-text text-lg font-semibold px-3 py-2 focus:outline-none focus:border-accent"
              />
            </label>

            <div className="flex flex-col gap-1">
              <p className="text-xs text-text-muted">Reps</p>
              <div className="flex flex-wrap gap-1.5">
                {REP_CHOICES.map((r) => (
                  <button
                    key={r}
                    onClick={() => { setReps(r); setCustomReps('') }}
                    className="w-9 h-9 rounded-lg text-sm font-semibold transition-colors"
                    style={{
                      background: reps === r ? 'var(--accent)' : 'var(--surface-elevated)',
                      color: reps === r ? '#fff' : 'var(--text-muted)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {r}
                  </button>
                ))}
                <input
                  type="number" min="13" placeholder="12+"
                  value={customReps}
                  onChange={(e) => { setCustomReps(e.target.value); setReps(null) }}
                  className="w-14 h-9 rounded-lg bg-surface-elevated border border-border text-text text-sm text-center focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-text-muted">
              <input type="checkbox" checked={isWarmup} onChange={(e) => setIsWarmup(e.target.checked)} />
              Warm-up set (doesn&apos;t count for PRs/stats)
            </label>

            <button
              onClick={() => logSetMutation.mutate()}
              disabled={!canLog || logSetMutation.isPending}
              className="rounded-xl py-3 text-base font-bold text-white disabled:opacity-40 hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              {logSetMutation.isPending ? 'Logging…' : 'Log set'}
            </button>
          </div>

          {/* This session's sets for this exercise */}
          {sessionSetsForExercise.length > 0 && (
            <div className="rounded-2xl bg-surface border border-border p-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">This session</p>
              <div className="flex flex-col divide-y divide-border">
                {sessionSetsForExercise.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-2 gap-3">
                    <span className="text-sm text-text">
                      {s.weight}kg × {s.reps} {s.is_warmup && <span className="text-text-faint">(warm-up)</span>}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const w = prompt('Weight (kg)', String(s.weight))
                          if (w) editSetMutation.mutate({ id: s.id, updates: { weight: Number(w) } })
                        }}
                        className="text-xs text-text-subtle hover:text-text-muted"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteSetMutation.mutate(s.id)}
                        className="text-xs text-negative hover:text-negative"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-surface border border-border p-3 text-center">
              <p className="text-lg font-bold text-text tabular-nums">
                {!detailReady ? <span className="inline-block h-5 w-8 rounded bg-surface-elevated animate-pulse align-middle" /> : (detailQuery.data?.stats.estimated1RM ?? '—')}
              </p>
              <p className="text-[10px] text-text-subtle uppercase tracking-widest">Est. 1RM (kg)</p>
            </div>
            <div className="rounded-xl bg-surface border border-border p-3 text-center">
              <p className="text-lg font-bold text-text tabular-nums">
                {!detailReady ? <span className="inline-block h-5 w-8 rounded bg-surface-elevated animate-pulse align-middle" /> : (detailQuery.data?.stats.bestSet ? `${detailQuery.data.stats.bestSet.weight}×${detailQuery.data.stats.bestSet.reps}` : '—')}
              </p>
              <p className="text-[10px] text-text-subtle uppercase tracking-widest">Best set</p>
            </div>
            <div className="rounded-xl bg-surface border border-border p-3 text-center">
              <p className="text-lg font-bold text-text tabular-nums">
                {!detailReady ? <span className="inline-block h-5 w-8 rounded bg-surface-elevated animate-pulse align-middle" /> : (detailQuery.data?.stats.sessionCount ?? 0)}
              </p>
              <p className="text-[10px] text-text-subtle uppercase tracking-widest">Sessions</p>
            </div>
          </div>

          {/* Trend graph */}
          {detailQuery.data && detailQuery.data.trend.length > 1 && (
            <div className="rounded-2xl bg-surface border border-border p-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">Trend (est. 1RM)</p>
              <div style={{ width: '100%', height: 160 }}>
                <ResponsiveContainer>
                  <LineChart data={detailQuery.data.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-faint)' }} width={36} />
                    <Tooltip
                      labelFormatter={(label) => fmtDate(String(label))}
                      contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Line type="monotone" dataKey="estimated1RM" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* History */}
          {detailQuery.data && detailQuery.data.history.length > 0 && (
            <div className="rounded-2xl bg-surface border border-border p-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">History</p>
              <div className="flex flex-col divide-y divide-border">
                {detailQuery.data.history.map((h) => (
                  <div key={h.sessionId} className="py-2">
                    <p className="text-xs text-text-subtle mb-1">{fmtDate(h.date)}</p>
                    <p className="text-sm text-text">
                      {h.sets.map((s, i) => (
                        <span key={i} className={s.isWarmup ? 'text-text-faint' : ''}>
                          {i > 0 && ', '}{s.weight}×{s.reps}
                        </span>
                      ))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
