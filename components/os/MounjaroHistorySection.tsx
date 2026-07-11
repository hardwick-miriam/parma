'use client'

import { useQuery } from '@tanstack/react-query'
import { LottieEmpty } from '@/components/ui/LottieEmpty'
import type { MounjaroDose, MounjaroEffect } from '@/lib/db/mounjaro'

interface DueStatus {
  cadenceDays: number | null
  nextDate: string | null
  due: 'today' | 'tomorrow' | 'overdue' | null
}

interface MounjaroHistoryResponse {
  doses: MounjaroDose[]
  effects: MounjaroEffect[]
  status: DueStatus
}

function fmt(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}

function EffectBar({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-text-subtle w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
        <div className="h-full rounded-full bg-accent" style={{ width: `${(value / 10) * 100}%` }} />
      </div>
      <span className="text-[10px] text-text-subtle tabular-nums w-4 text-right">{value}</span>
    </div>
  )
}

function HistorySkeleton() {
  return (
    <div className="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-3 animate-pulse">
      <div className="h-3 w-24 rounded bg-surface-elevated" />
      <div className="h-6 w-32 rounded bg-surface-elevated" />
      <div className="h-2 w-full rounded bg-surface-elevated" />
      <div className="h-2 w-4/5 rounded bg-surface-elevated" />
    </div>
  )
}

export function MounjaroHistorySection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['mounjaro-history'],
    queryFn: async () => {
      const res = await fetch('/api/mounjaro/history')
      if (!res.ok) throw new Error('Failed to load Mounjaro history')
      return res.json() as Promise<MounjaroHistoryResponse>
    },
  })

  if (isLoading) return <HistorySkeleton />

  if (isError) {
    return (
      <div className="rounded-2xl bg-surface border border-border p-5">
        <p className="text-sm text-negative">Couldn't load Mounjaro history. Try refreshing.</p>
      </div>
    )
  }

  const doses = data?.doses ?? []
  const effects = data?.effects ?? []
  const status = data?.status

  const effectsByDate = new Map(effects.map((e) => [e.logged_date, e]))

  return (
    <div className="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-4" style={{ boxShadow: 'var(--shadow-md)' }}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Mounjaro</h2>
        {doses[0] && <span className="text-xs font-medium text-accent">{doses[0].dose_mg}mg</span>}
      </div>

      {status?.cadenceDays && (
        <p className="text-xs text-text-muted">
          Usual cadence: every {status.cadenceDays} days
          {status.nextDate && <> · next dose ~{fmt(status.nextDate)}</>}
          {status.due && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-accent/15 text-accent font-medium">
              {status.due === 'today' ? 'due today' : status.due === 'tomorrow' ? 'due tomorrow' : 'overdue'}
            </span>
          )}
        </p>
      )}

      {doses.length === 0 ? (
        <LottieEmpty
          title="No doses logged yet"
          subtitle='Log one naturally: "took my Mounjaro, 5mg"'
        />
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-text-subtle uppercase tracking-widest">Dose &amp; symptom history</p>
          <div className="flex flex-col divide-y divide-border max-h-96 overflow-y-auto">
            {doses.map((d) => {
              const effect = effectsByDate.get(d.taken_date)
              return (
                <div key={d.id} className="py-2.5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text">{fmt(d.taken_date)}</span>
                    <span className="text-xs font-semibold text-accent">{d.dose_mg}mg</span>
                  </div>
                  {d.feeling && <p className="text-[11px] text-text-muted italic">"{d.feeling}"</p>}
                  {effect && (effect.nausea !== null || effect.appetite !== null || effect.energy !== null) && (
                    <div className="flex flex-col gap-1 pl-1">
                      <EffectBar label="Nausea" value={effect.nausea} />
                      <EffectBar label="Appetite" value={effect.appetite} />
                      <EffectBar label="Energy" value={effect.energy} />
                    </div>
                  )}
                  {effect?.notes && <p className="text-[10px] text-text-subtle italic">{effect.notes}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
