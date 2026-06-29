'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { InjuryWithCheckins, InjuryCheckin } from '@/lib/db/queries'

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${avg}%` }}
              />
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

export function InjuryWidget({ injuries }: { injuries: InjuryWithCheckins[] }) {
  if (injuries.length === 0) return null

  return (
    <div className="rounded-2xl bg-surface border border-orange-500/20 p-6 flex flex-col gap-6">
      <h2 className="text-sm font-semibold text-orange-400 uppercase tracking-widest">
        Injury Recovery
      </h2>
      {injuries.map((injury) => {
        const chartData = injury.checkins.map((c) => ({
          date: formatDate(c.logged_at),
          feeling: c.feeling_pct,
        }))

        const latest = injury.checkins[injury.checkins.length - 1]
        const daysIn = Math.max(
          1,
          Math.ceil((Date.now() - new Date(injury.started_on).getTime()) / (1000 * 60 * 60 * 24))
        )

        return (
          <div key={injury.id} className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
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
                  <Tooltip
                    contentStyle={{
                      background: '#1e1e21',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: 'rgba(240,240,242,0.45)' }}
                    itemStyle={{ color: '#a3e635' }}
                    formatter={(v) => [`${v}%`, 'Feeling']}
                  />
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

            {injury.checkins.length >= 2 && (
              <ActivityCorrelation checkins={injury.checkins} />
            )}
          </div>
        )
      })}
    </div>
  )
}
