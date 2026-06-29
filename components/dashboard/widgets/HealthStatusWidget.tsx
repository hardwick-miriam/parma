'use client'

import type { HealthStatus } from '@/lib/db/queries'

function daysRemaining(since: string | null, estimatedDays: number | null): number | null {
  if (!since || !estimatedDays) return null
  const start = new Date(since)
  const recovery = new Date(start)
  recovery.setDate(recovery.getDate() + estimatedDays)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((recovery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function HealthStatusWidget({ status }: { status: HealthStatus | null }) {
  if (!status?.sick) return null

  const sickDaysLeft = daysRemaining(status.sick_since, status.sick_estimated_days)

  return (
    <div className="rounded-2xl bg-surface border border-red-500/20 p-6 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-red-400 uppercase tracking-widest">Health Status</h2>
      <div className="flex items-start gap-3">
        <span className="text-xl">🤒</span>
        <div>
          <p className="text-sm font-medium text-text">Sick</p>
          {sickDaysLeft != null && sickDaysLeft > 0 && (
            <p className="text-xs text-text-muted">~{sickDaysLeft} day{sickDaysLeft !== 1 ? 's' : ''} to recovery</p>
          )}
          {sickDaysLeft != null && sickDaysLeft <= 0 && (
            <p className="text-xs text-accent">Should be recovered — log an update</p>
          )}
          {status.sick_since && (
            <p className="text-xs text-text-subtle">
              Since {new Date(status.sick_since).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
