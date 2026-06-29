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
import { deleteInjuryCheckin, markInjuryHealed } from '@/app/actions'
import type { InjuryWithCheckins, InjuryCheckin } from '@/lib/db/queries'

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function TrashIcon() {
  return (
    <svg
      className="w-3 h-3"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
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
      <p style={{ color: 'var(--accent)', fontWeight: 600 }}>{feeling}%</p>
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

function RecoveryChart({ checkins }: { checkins: InjuryCheckin[] }) {
  if (checkins.length < 2) return null

  const chartData = checkins.map((c) => ({
    date: formatDate(c.logged_at),
    feeling: c.feeling_pct,
    activity: c.activity?.trim() || 'Rest',
  }))

  return (
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
          stroke="var(--accent)"
          strokeWidth={2}
          dot={{ fill: 'var(--accent)', r: 3, strokeWidth: 0 }}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function InjuryCard({ injury }: { injury: InjuryWithCheckins }) {
  const [confirmCheckinId, setConfirmCheckinId] = useState<string | null>(null)
  const [confirmHeal, setConfirmHeal] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDeleteCheckin(id: string) {
    startTransition(async () => {
      await deleteInjuryCheckin(id)
      setConfirmCheckinId(null)
    })
  }

  function handleMarkHealed() {
    startTransition(async () => {
      await markInjuryHealed(injury.id)
      setConfirmHeal(false)
    })
  }

  const latest = injury.checkins[injury.checkins.length - 1]
  const daysIn = Math.max(
    1,
    Math.ceil((Date.now() - new Date(injury.started_on).getTime()) / (1000 * 60 * 60 * 24))
  )
  const checkinsSorted = [...injury.checkins].reverse()

  return (
    <div className="rounded-2xl bg-surface border border-orange-500/20 p-6 flex flex-col gap-4" style={{ boxShadow: 'var(--shadow-md)' }}>
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

      <RecoveryChart checkins={injury.checkins} />

      {checkinsSorted.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-text-subtle uppercase tracking-widest mb-1">Check-ins</p>
          <ol className="flex flex-col divide-y divide-border">
            {checkinsSorted.map((c) => (
              <li
                key={c.id}
                className="group flex items-center gap-2 py-2 first:pt-0 last:pb-0"
              >
                <span className="text-xs text-text-subtle tabular-nums w-20 shrink-0">
                  {formatTime(c.logged_at)}
                </span>
                <span className="text-xs text-text-muted flex-1 truncate">
                  {c.activity || 'Rest'}
                </span>
                <span className="text-xs font-semibold text-accent tabular-nums w-8 text-right">
                  {c.feeling_pct}%
                </span>
                {confirmCheckinId === c.id ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleDeleteCheckin(c.id)}
                      disabled={isPending}
                      className="text-xs text-red-400 font-medium hover:text-red-300 disabled:opacity-50"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmCheckinId(null)}
                      className="text-xs text-text-subtle hover:text-text-muted"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmCheckinId(c.id)}
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

      {injury.checkins.length >= 2 && (
        <ActivityCorrelation checkins={injury.checkins} />
      )}

      <div className="pt-1 border-t border-border">
        {confirmHeal ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted flex-1">Mark this injury as fully healed?</span>
            <button
              onClick={handleMarkHealed}
              disabled={isPending}
              className="text-xs text-accent font-semibold hover:opacity-80 disabled:opacity-50"
            >
              Yes, healed
            </button>
            <button
              onClick={() => setConfirmHeal(false)}
              className="text-xs text-text-subtle hover:text-text-muted"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmHeal(true)}
            className="text-xs text-text-subtle hover:text-accent transition-colors"
          >
            Mark as healed →
          </button>
        )}
      </div>
    </div>
  )
}

function PastInjuryCard({ injury }: { injury: InjuryWithCheckins }) {
  const [open, setOpen] = useState(false)

  const daysToRecover =
    injury.resolved_on
      ? Math.ceil(
          (new Date(injury.resolved_on).getTime() - new Date(injury.started_on).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null

  return (
    <div className="rounded-xl bg-surface-elevated border border-border p-4 flex flex-col gap-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left"
      >
        <div>
          <p className="text-sm font-medium text-text">{injury.description}</p>
          <p className="text-xs text-text-subtle mt-0.5">
            {daysToRecover != null ? `Recovered in ${daysToRecover} day${daysToRecover !== 1 ? 's' : ''}` : 'Resolved'}
            {injury.resolved_on &&
              ` · ${new Date(injury.resolved_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-accent font-medium">
            {injury.checkins.length} check-in{injury.checkins.length !== 1 ? 's' : ''}
          </span>
          <span className="text-text-subtle">
            <ChevronIcon open={open} />
          </span>
        </div>
      </button>

      {open && (
        <div className="flex flex-col gap-4 pt-2 border-t border-border">
          <RecoveryChart checkins={injury.checkins} />
          {injury.checkins.length > 0 && (
            <ol className="flex flex-col divide-y divide-border">
              {[...injury.checkins].reverse().map((c) => (
                <li key={c.id} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
                  <span className="text-xs text-text-subtle tabular-nums w-20 shrink-0">
                    {formatTime(c.logged_at)}
                  </span>
                  <span className="text-xs text-text-muted flex-1 truncate">
                    {c.activity || 'Rest'}
                  </span>
                  <span className="text-xs font-semibold text-accent tabular-nums w-8 text-right">
                    {c.feeling_pct}%
                  </span>
                </li>
              ))}
            </ol>
          )}
          {injury.checkins.length >= 2 && <ActivityCorrelation checkins={injury.checkins} />}
        </div>
      )}
    </div>
  )
}

function PastInjuriesSection({ injuries }: { injuries: InjuryWithCheckins[] }) {
  const [open, setOpen] = useState(false)

  if (injuries.length === 0) return null

  return (
    <div className="rounded-2xl bg-surface border border-border p-6 flex flex-col gap-4" style={{ boxShadow: 'var(--shadow-md)' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left"
      >
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">
          Past Injuries
        </h2>
        <div className="flex items-center gap-2 text-text-subtle">
          <span className="text-xs">{injuries.length} healed</span>
          <ChevronIcon open={open} />
        </div>
      </button>

      {open && (
        <div className="flex flex-col gap-3">
          {injuries.map((injury) => (
            <PastInjuryCard key={injury.id} injury={injury} />
          ))}
        </div>
      )}
    </div>
  )
}

export function InjuryWidget({
  injuries,
  pastInjuries,
}: {
  injuries: InjuryWithCheckins[]
  pastInjuries: InjuryWithCheckins[]
}) {
  const showPast = pastInjuries.length > 0

  if (injuries.length === 0 && !showPast) return null

  return (
    <>
      {injuries.map((injury) => (
        <InjuryCard key={injury.id} injury={injury} />
      ))}
      {showPast && <PastInjuriesSection injuries={pastInjuries} />}
    </>
  )
}
