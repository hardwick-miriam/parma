'use client'

import { useState, useTransition } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { deleteInjuryCheckin } from '@/app/actions'
import type { InjuryWithCheckins, InjuryCheckin } from '@/lib/db/queries'

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function TrashIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function InjuryTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ payload: { feeling: number; activity: string } }>
  label?: string
}) {
  if (!active || !payload?.[0]) return null
  const { feeling, activity } = payload[0].payload
  return (
    <div
      style={{
        background: '#1e1e21',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: 12,
      }}
    >
      <p style={{ color: 'rgba(240,240,242,0.45)', marginBottom: 2 }}>{label}</p>
      <p style={{ color: '#a3e635', fontWeight: 600 }}>{feeling}%</p>
      <p style={{ color: 'rgba(240,240,242,0.45)' }}>{activity}</p>
    </div>
  )
}

function ActivityCorrelation({ checkins }: { checkins: InjuryCheckin[] }) {
  const map = new Map<string, number[]>()
  for (const c of checkins) {
    const act = c.activity?.trim() || 'Rest'
    if (!map.has(act)) map.set(act, [])
    map.get(act)!.push(c.feeling_pct)
  }

  const sorted = [...map.entries()]
    .map(([act, vals]) => ({ act, avg: vals.reduce((a, b) => a + b, 0) / vals.length }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5)

  if (sorted.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-text-subtle uppercase tracking-widest">Activity correlation</p>
      <div className="flex flex-col gap-2">
        {sorted.map(({ act, avg }) => (
          <div key={act} className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
              <div className="h-full rounded-full bg-accent" style={{ width: `${avg}%` }} />
            </div>
            <span className="text-xs text-text-muted w-28 truncate">{act}</span>
            <span className="text-xs text-text-subtle tabular-nums w-8 text-right">
              {Math.round(avg)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function InjuryCard({ injury }: { injury: InjuryWithCheckins }) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteInjuryCheckin(id)
      setConfirmId(null)
    })
  }

  const chartData = injury.checkins.map((c) => ({
    date: formatDate(c.logged_at),
    feeling: c.feeling_pct,
    activity: c.activity?.trim() || 'Rest',
  }))

  const latest = injury.checkins[injury.checkins.length - 1]
  const daysIn = Math.max(
    1,
    Math.ceil((Date.now() - new Date(injury.started_on).getTime()) / (1000 * 60 * 60 * 24))
  )

  const checkinsSorted = [...injury.checkins].reverse()

  return (
    <div className="rounded-2xl bg-surface border border-orange-500/20 p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest mb-1">
            Injury Recovery
          </p>
          <p className="text-sm font-medium text-text">
            {injury.description}
            {injury.body_part &&
              injury.body_part.toLowerCase() !== injury.description.toLowerCase() && (
                <span className="text-text-muted"> ({injury.body_part})</span>
              )}
          </p>
          <p className="text-xs text-text-subtle mt-0.5">
            Day {daysIn}
            {injury.estimated_days ? ` of ~${injury.estimated_days}` : ''}
            {' · '}
            {new Date(injury.started_on).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
        {latest != null && (
          <div className="text-right shrink-0">
            <span className="text-2xl font-bold text-accent tabular-nums">
              {latest.feeling_pct}%
            </span>
            <p className="text-xs text-text-subtle">feeling</p>
          </div>
        )}
      </div>

      {chartData.length >= 2 && (
        <ResponsiveContainer width="100%" height={110}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: 'rgba(240,240,242,0.45)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: 'rgba(240,240,242,0.45)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<InjuryTooltip />} />
            <Line
              type="monotone"
              dataKey="feeling"
              stroke="#a3e635"
              strokeWidth={2}
              dot={{ fill: '#a3e635', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {checkinsSorted.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-text-subtle uppercase tracking-widest mb-1">Check-ins</p>
          <ol className="flex flex-col divide-y divide-border">
            {checkinsSorted.map((c) => (
              <li key={c.id} className="group flex items-center gap-2 py-2 first:pt-0 last:pb-0">
                <span className="text-xs text-text-subtle tabular-nums w-20 shrink-0">
                  {formatTime(c.logged_at)}
                </span>
                <span className="text-xs text-text-muted flex-1 truncate">
                  {c.activity || 'Rest'}
                </span>
                <span className="text-xs font-semibold text-accent tabular-nums w-8 text-right">
                  {c.feeling_pct}%
                </span>

                {confirmId === c.id ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={isPending}
                      className="text-xs text-red-400 font-medium hover:text-red-300 disabled:opacity-50"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="text-xs text-text-subtle hover:text-text-muted"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(c.id)}
                    className="opacity-0 group-hover:opacity-100 text-text-subtle hover:text-red-400 transition-opacity p-0.5 shrink-0"
                    title="Delete check-in"
                  >
                    <TrashIcon />
                  </button>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {checkinsSorted.length >= 2 && (
        <ActivityCorrelation checkins={injury.checkins} />
      )}
    </div>
  )
}

export function InjuryWidget({ injuries }: { injuries: InjuryWithCheckins[] }) {
  if (injuries.length === 0) return null

  return (
    <>
      {injuries.map((injury) => (
        <InjuryCard key={injury.id} injury={injury} />
      ))}
    </>
  )
}
