'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { MEASUREMENT_SITES, type MeasurementSite } from '@/lib/bodyMeasurementTypes'

const SITE_LABELS: Record<MeasurementSite, string> = {
  chest: 'Chest', left_arm: 'Left arm', right_arm: 'Right arm', waist: 'Waist', hips: 'Hips',
  left_thigh: 'Left thigh', right_thigh: 'Right thigh', left_calf: 'Left calf', neck: 'Neck', shoulders: 'Shoulders',
}

interface SiteSummary {
  site: MeasurementSite
  latest: number | null
  latestDate: string | null
  change30d: number | null
  change90d: number | null
  trend: { date: string; value_cm: number }[]
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function ChangeBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-text-faint">—</span>
  if (value === 0) return <span className="text-text-subtle">no change</span>
  const growing = value > 0
  return (
    <span className={growing ? 'text-warning' : 'text-positive'}>
      {growing ? '+' : ''}{value}cm {growing && Math.abs(value) >= 1 ? '📈' : ''}
    </span>
  )
}

const tooltipStyle = { background: 'var(--surface-elevated)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12 }

export function BodyMeasurementsSection() {
  const queryClient = useQueryClient()
  const [site, setSite] = useState<MeasurementSite>('chest')
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState<'cm' | 'inch'>('cm')
  const [note, setNote] = useState('')

  const summary = useQuery({
    queryKey: ['body-measurements'],
    queryFn: async () => {
      const res = await fetch('/api/body-measurements')
      if (!res.ok) throw new Error('Failed to load measurements')
      return (await res.json()) as { sites: SiteSummary[] }
    },
  })

  const logMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/body-measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site, value: Number(value), unit, note: note || undefined }),
      })
      if (!res.ok) throw new Error('Failed to save measurement')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['body-measurements'] })
      setValue('')
      setNote('')
    },
    onError: () => toast.error('Failed to save measurement'),
  })

  const sites = summary.data?.sites ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Log a measurement</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select
            value={site}
            onChange={(e) => setSite(e.target.value as MeasurementSite)}
            className="col-span-2 sm:col-span-1 rounded-lg bg-surface-elevated border border-border text-text text-sm px-2 py-2 focus:outline-none focus:border-accent"
          >
            {MEASUREMENT_SITES.map((s) => <option key={s} value={s}>{SITE_LABELS[s]}</option>)}
          </select>
          <input
            type="number" step="0.1" min="0" placeholder="Value"
            value={value} onChange={(e) => setValue(e.target.value)}
            className="rounded-lg bg-surface-elevated border border-border text-text text-sm px-2 py-2 focus:outline-none focus:border-accent"
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as 'cm' | 'inch')}
            className="rounded-lg bg-surface-elevated border border-border text-text text-sm px-2 py-2 focus:outline-none focus:border-accent"
          >
            <option value="cm">cm</option>
            <option value="inch">inches</option>
          </select>
          <button
            onClick={() => logMutation.mutate()}
            disabled={!value || Number(value) <= 0 || logMutation.isPending}
            className="rounded-lg text-sm font-semibold text-white disabled:opacity-40 px-2 py-2"
            style={{ background: 'var(--accent)' }}
          >
            {logMutation.isPending ? 'Saving…' : 'Log'}
          </button>
        </div>
        <input
          value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)"
          className="w-full rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent"
        />
      </div>

      {!summary.isLoading && sites.length === 0 && (
        <p className="text-sm text-text-subtle py-6 text-center">No measurements logged yet.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {summary.isLoading && Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-2 animate-pulse">
            <div className="h-4 w-20 rounded bg-surface-elevated" />
            <div className="h-7 w-16 rounded bg-surface-elevated" />
            <div className="h-16 w-full rounded bg-surface-elevated" />
          </div>
        ))}
        {!summary.isLoading && sites.map((s) => (
          <div key={s.site} className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-text">{SITE_LABELS[s.site]}</p>
              <p className="text-xs text-text-subtle">{s.latestDate ? fmtDate(s.latestDate) : ''}</p>
            </div>
            <p className="text-2xl font-bold text-text tabular-nums">{s.latest}cm</p>
            <div className="flex gap-4 text-xs">
              <span className="text-text-faint">30d: <ChangeBadge value={s.change30d} /></span>
              <span className="text-text-faint">90d: <ChangeBadge value={s.change90d} /></span>
            </div>
            {s.trend.length > 1 && (
              <div style={{ width: '100%', height: 80 }}>
                <ResponsiveContainer>
                  <LineChart data={s.trend}>
                    <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 9, fill: 'var(--text-faint)' }} minTickGap={30} />
                    <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip labelFormatter={(l) => fmtDate(String(l))} contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="value_cm" stroke="var(--accent)" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
