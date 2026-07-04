'use client'

import { getWorkedMuscles, MUSCLE_GROUPS } from '@/lib/muscle-map'
import type { WorkoutSession } from '@/lib/db/queries'

// SVG coordinate definitions for each muscle group
// viewBox="0 0 160 300" — left=front, right=back
const MUSCLE_RECTS: Record<string, { x: number; y: number; w: number; h: number; rx?: number }[]> = {
  // FRONT (x: 0–75)
  chest:      [{ x: 15, y: 68, w: 20, h: 16, rx: 4 }, { x: 40, y: 68, w: 20, h: 16, rx: 4 }],
  front_delt: [{ x: 8,  y: 62, w: 12, h: 10, rx: 5 }, { x: 55, y: 62, w: 12, h: 10, rx: 5 }],
  side_delt:  [{ x: 5,  y: 68, w: 8,  h: 8,  rx: 3 }, { x: 62, y: 68, w: 8,  h: 8,  rx: 3 }],
  biceps:     [{ x: 4,  y: 80, w: 9,  h: 18, rx: 4 }, { x: 62, y: 80, w: 9,  h: 18, rx: 4 }],
  core:       [{ x: 22, y: 86, w: 16, h: 22, rx: 3 }, { x: 38, y: 86, w: 16, h: 22, rx: 3 }],
  quads:      [{ x: 16, y: 138, w: 16, h: 30, rx: 4 }, { x: 43, y: 138, w: 16, h: 30, rx: 4 }],
  calves:     [{ x: 18, y: 200, w: 12, h: 20, rx: 4 }, { x: 45, y: 200, w: 12, h: 20, rx: 4 }],
  // BACK (x: 83–160)
  traps:      [{ x: 94, y: 58, w: 28, h: 12, rx: 4 }],
  upper_back: [{ x: 92, y: 70, w: 15, h: 18, rx: 4 }, { x: 110, y: 70, w: 15, h: 18, rx: 4 }],
  lats:       [{ x: 88, y: 78, w: 14, h: 22, rx: 4 }, { x: 115, y: 78, w: 14, h: 22, rx: 4 }],
  rear_delt:  [{ x: 85, y: 62, w: 12, h: 10, rx: 5 }, { x: 120, y: 62, w: 12, h: 10, rx: 5 }],
  triceps:    [{ x: 82, y: 80, w: 9,  h: 18, rx: 4 }, { x: 126, y: 80, w: 9,  h: 18, rx: 4 }],
  lower_back: [{ x: 98, y: 98, w: 22, h: 14, rx: 4 }],
  glutes:     [{ x: 94, y: 115, w: 18, h: 16, rx: 5 }, { x: 106, y: 115, w: 18, h: 16, rx: 5 }],
  hamstrings: [{ x: 93, y: 138, w: 16, h: 30, rx: 4 }, { x: 108, y: 138, w: 16, h: 30, rx: 4 }],
}

interface MuscleMapWidgetProps {
  recentWorkouts: WorkoutSession[]
  daysBack?: number
}

function getHeatColor(daysAgo: number): string {
  if (daysAgo <= 1) return 'var(--accent)'
  if (daysAgo <= 3) return 'rgba(var(--accent-rgb, 99,102,241), 0.75)'
  if (daysAgo <= 7) return 'rgba(var(--accent-rgb, 99,102,241), 0.4)'
  return 'rgba(var(--accent-rgb, 99,102,241), 0.2)'
}

export function MuscleMapWidget({ recentWorkouts, daysBack = 14 }: MuscleMapWidgetProps) {
  const today = new Date()
  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() - daysBack)

  // Build map: muscleId → most recent daysAgo
  const muscleLastWorked: Record<string, number> = {}

  for (const workout of recentWorkouts) {
    const workoutDate = new Date(workout.date + 'T12:00:00')
    if (workoutDate < cutoff) continue
    const daysAgo = Math.max(0, Math.floor((today.getTime() - workoutDate.getTime()) / 86400000))
    const exercises = workout.exercises ?? [workout.description]
    const muscles = getWorkedMuscles(exercises)
    for (const m of muscles) {
      if (muscleLastWorked[m] == null || daysAgo < muscleLastWorked[m]) {
        muscleLastWorked[m] = daysAgo
      }
    }
  }

  const workedIds = Object.keys(muscleLastWorked)

  // Legend: which muscles are highlighted
  const workedLabels = MUSCLE_GROUPS
    .filter((g) => workedIds.includes(g.id))
    .slice(0, 5)
    .map((g) => g.label)

  return (
    <div className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-2 h-full overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Muscle Map</h2>
        <span className="text-xs text-text-subtle">last {daysBack}d</span>
      </div>

      {recentWorkouts.length === 0 ? (
        <p className="text-text-subtle text-xs text-center py-4">No workouts logged yet</p>
      ) : (
        <>
          <div className="flex justify-center flex-1 min-h-0">
            <svg viewBox="0 0 160 240" className="h-full max-h-44" style={{ maxWidth: '200px' }}>
              {/* Front body outline */}
              <ellipse cx="37" cy="32" rx="14" ry="16" fill="none" stroke="var(--border)" strokeWidth="1.5" />
              <path d="M12 58 Q37 50 62 58 L68 130 L54 130 L50 110 L24 110 L20 130 L6 130 Z" fill="none" stroke="var(--border)" strokeWidth="1.5" />
              <path d="M12 62 L4 98 L14 98 L20 78" fill="none" stroke="var(--border)" strokeWidth="1.5" />
              <path d="M62 62 L70 98 L60 98 L54 78" fill="none" stroke="var(--border)" strokeWidth="1.5" />
              <path d="M20 130 L16 190 L20 230 L28 230 L30 190 L34 160 L40 190 L42 230 L50 230 L54 190 L54 130" fill="none" stroke="var(--border)" strokeWidth="1.5" />
              {/* Back body outline */}
              <ellipse cx="108" cy="32" rx="14" ry="16" fill="none" stroke="var(--border)" strokeWidth="1.5" />
              <path d="M84 58 Q108 50 132 58 L138 130 L124 130 L120 110 L96 110 L92 130 L78 130 Z" fill="none" stroke="var(--border)" strokeWidth="1.5" />
              <path d="M84 62 L76 98 L86 98 L92 78" fill="none" stroke="var(--border)" strokeWidth="1.5" />
              <path d="M132 62 L140 98 L130 98 L124 78" fill="none" stroke="var(--border)" strokeWidth="1.5" />
              <path d="M92 130 L88 190 L92 230 L100 230 L102 190 L106 160 L112 190 L114 230 L122 230 L126 190 L124 130" fill="none" stroke="var(--border)" strokeWidth="1.5" />
              {/* Labels */}
              <text x="37" y="250" textAnchor="middle" fontSize="7" fill="var(--text-muted)">Front</text>
              <text x="108" y="250" textAnchor="middle" fontSize="7" fill="var(--text-muted)">Back</text>
              {/* Muscle regions */}
              {Object.entries(MUSCLE_RECTS).map(([muscleId, rects]) => {
                const daysAgo = muscleLastWorked[muscleId]
                const isWorked = daysAgo != null
                return rects.map((r, ri) => (
                  <rect
                    key={`${muscleId}-${ri}`}
                    x={r.x} y={r.y} width={r.w} height={r.h}
                    rx={r.rx ?? 3}
                    fill={isWorked ? getHeatColor(daysAgo) : 'var(--surface-elevated)'}
                    stroke={isWorked ? 'var(--accent)' : 'var(--border)'}
                    strokeWidth={isWorked ? '1' : '0.5'}
                    opacity={isWorked ? 0.9 : 0.5}
                  />
                ))
              })}
            </svg>
          </div>

          {workedLabels.length > 0 && (
            <div className="flex flex-wrap gap-1 shrink-0">
              {workedLabels.map((l) => (
                <span key={l} className="text-xs px-2 py-0.5 rounded-full border border-border" style={{ background: 'var(--surface-elevated)', color: 'var(--accent)' }}>
                  {l}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
