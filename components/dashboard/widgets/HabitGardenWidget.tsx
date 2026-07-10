'use client'

import { useMemo } from 'react'
import { getLocalDate } from '@/lib/date'
import type { DailyStats } from '@/lib/db/queries'

function toKey(d: Date) {
  return getLocalDate(undefined, d)
}

function getLast30Days(): string[] {
  const days: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(toKey(d))
  }
  return days
}

// SVG plant at different growth levels (0-4)
function PlantSVG({ level, accent }: { level: number; accent: string }) {
  const w = 120, h = 160
  const cx = w / 2
  const ground = h - 14

  // Stem heights by level
  const stemH = [18, 45, 70, 95, 115][level]
  const stemTop = ground - stemH

  // Leaves: array of [x-offset, y-from-top, rotate, scale]
  const leafSets: [number, number, number, number][][] = [
    [],
    [[-14, 12, -30, 0.6], [14, 12, 30, 0.6]],
    [[-18, 8, -35, 0.8], [18, 8, 35, 0.8], [-14, 26, -20, 0.6], [14, 26, 20, 0.6]],
    [[-20, 6, -40, 0.9], [20, 6, 40, 0.9], [-16, 22, -25, 0.8], [16, 22, 25, 0.8], [-12, 38, -15, 0.65], [12, 38, 15, 0.65]],
    [[-22, 4, -40, 1], [22, 4, 40, 1], [-18, 18, -28, 0.9], [18, 18, 28, 0.9], [-14, 32, -20, 0.75], [14, 32, 20, 0.75], [-10, 46, -12, 0.6], [10, 46, 12, 0.6]],
  ]

  const leaves = leafSets[level] ?? []

  // Flower visible at level 4
  const hasFlower = level >= 4
  // Buds at level 3+
  const hasBuds = level >= 3

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
      {/* Soil mound */}
      <ellipse cx={cx} cy={ground + 5} rx={32} ry={9} fill={accent} opacity={0.18} />
      <ellipse cx={cx} cy={ground + 4} rx={26} ry={7} fill={accent} opacity={0.12} />

      {/* Stem */}
      {level > 0 && (
        <line
          x1={cx} y1={ground}
          x2={cx} y2={stemTop}
          stroke="#86efac"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}

      {/* Seedling sprout */}
      {level === 0 && (
        <line x1={cx} y1={ground} x2={cx} y2={ground - 16} stroke="#86efac" strokeWidth="2" strokeLinecap="round" />
      )}

      {/* Leaves */}
      {leaves.map(([ox, oy, rot, scale], i) => {
        const lx = cx + ox
        const ly = stemTop + oy
        return (
          <g key={i} transform={`translate(${lx},${ly}) rotate(${rot}) scale(${scale})`}>
            <path
              d="M 0 0 C -8 -12 -14 -10 -10 0 C -6 8 0 6 0 0 Z"
              fill="#4ade80"
              opacity={0.85}
            />
          </g>
        )
      })}

      {/* Buds (level 3+) */}
      {hasBuds && !hasFlower && (
        <>
          <circle cx={cx} cy={stemTop} r={4} fill="#fde68a" opacity={0.9} />
          <circle cx={cx - 12} cy={stemTop + 6} r={3} fill="#fde68a" opacity={0.7} />
          <circle cx={cx + 12} cy={stemTop + 6} r={3} fill="#fde68a" opacity={0.7} />
        </>
      )}

      {/* Full flower (level 4) */}
      {hasFlower && (
        <g transform={`translate(${cx},${stemTop})`}>
          {[0, 60, 120, 180, 240, 300].map((angle, i) => {
            const rad = (angle * Math.PI) / 180
            const px = Math.cos(rad) * 8
            const py = Math.sin(rad) * 8
            return (
              <ellipse
                key={i}
                cx={px} cy={py}
                rx={4} ry={6}
                fill={accent}
                opacity={0.8}
                transform={`rotate(${angle},${px},${py})`}
              />
            )
          })}
          <circle cx={0} cy={0} r={5} fill="#fde68a" />
        </g>
      )}

      {/* Small dot seedling */}
      {level === 0 && (
        <circle cx={cx} cy={ground - 14} r={4} fill="#86efac" opacity={0.9} />
      )}
    </svg>
  )
}

interface HabitGardenWidgetProps {
  history: DailyStats[]
  todayHabits?: string[] | null
  streak?: number
}

export function HabitGardenWidget({ history, todayHabits, streak = 0 }: HabitGardenWidgetProps) {
  const days30 = getLast30Days()

  const { completionRate, activeDays, totalHabits } = useMemo(() => {
    const byDate = new Map(history.map((d) => [d.date, d]))
    let active = 0
    let total = 0
    for (const date of days30) {
      const row = byDate.get(date)
      const count = row?.habits_done?.length ?? 0
      if (count > 0) {
        active++
        total += count
      }
    }
    return { completionRate: active / 30, activeDays: active, totalHabits: total }
  }, [history, days30])

  const level = Math.min(4, Math.floor(completionRate * 5))
  const pct = Math.round(completionRate * 100)

  const todayCount = todayHabits?.length ?? 0

  return (
    <div
      className="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-3 h-full"
      style={{ boxShadow: 'var(--shadow-md)' }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Habit Garden</h2>
        {streak > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--accent)/15', color: 'var(--accent)' }}>
            🔥 {streak}d
          </span>
        )}
      </div>

      {/* Plant — height:'100%'/maxHeight (not a fixed height) so this
          shrinks to fit a short grid cell instead of forcing the card
          taller than its cell or overflowing past it (the outer card has
          no overflow-hidden to catch that). */}
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div style={{ width: '100%', maxWidth: 120, height: '100%', maxHeight: 140 }}>
          <PlantSVG level={level} accent="var(--accent)" />
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-col gap-1.5">
        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-surface-elevated overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: 'var(--accent)' }}
          />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-text-subtle">{activeDays}/30 active days</span>
          <span className="text-[11px] font-semibold tabular-nums" style={{ color: 'var(--accent)' }}>{pct}%</span>
        </div>
        <p className="text-xs text-text-muted">
          {todayCount > 0
            ? `${todayCount} habit${todayCount !== 1 ? 's' : ''} done today`
            : activeDays > 0
              ? `${totalHabits} total this month`
              : 'Log habits to grow your plant'}
        </p>
      </div>
    </div>
  )
}
