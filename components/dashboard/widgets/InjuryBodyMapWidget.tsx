'use client'

import type { InjuryWithCheckins } from '@/lib/db/queries'

// Maps body_part strings to SVG regions (cx, cy, r for circles overlay)
const BODY_PART_COORDS: Record<string, { cx: number; cy: number; r: number; front: boolean }> = {
  // Front
  head:       { cx: 37,  cy: 32,  r: 14,  front: true },
  neck:       { cx: 37,  cy: 50,  r: 7,   front: true },
  chest:      { cx: 37,  cy: 78,  r: 16,  front: true },
  shoulder:   { cx: 10,  cy: 68,  r: 10,  front: true },
  'left shoulder':  { cx: 10, cy: 68, r: 10, front: true },
  'right shoulder': { cx: 64, cy: 68, r: 10, front: true },
  elbow:      { cx: 5,   cy: 92,  r: 7,   front: true },
  wrist:      { cx: 3,   cy: 108, r: 6,   front: true },
  hand:       { cx: 3,   cy: 116, r: 6,   front: true },
  abs:        { cx: 37,  cy: 108, r: 12,  front: true },
  hip:        { cx: 37,  cy: 125, r: 10,  front: true },
  knee:       { cx: 25,  cy: 168, r: 9,   front: true },
  'left knee':  { cx: 25, cy: 168, r: 9,  front: true },
  'right knee': { cx: 49, cy: 168, r: 9,  front: true },
  shin:       { cx: 25,  cy: 188, r: 7,   front: true },
  ankle:      { cx: 25,  cy: 212, r: 7,   front: true },
  foot:       { cx: 25,  cy: 222, r: 7,   front: true },
  quad:       { cx: 25,  cy: 150, r: 10,  front: true },
  // Back
  'upper back': { cx: 108, cy: 80, r: 16, front: false },
  back:         { cx: 108, cy: 80, r: 16, front: false },
  'lower back': { cx: 108, cy: 103, r: 12, front: false },
  traps:        { cx: 108, cy: 63, r: 12, front: false },
  lat:          { cx: 93,  cy: 90, r: 10, front: false },
  glute:        { cx: 108, cy: 122, r: 14, front: false },
  glutes:       { cx: 108, cy: 122, r: 14, front: false },
  hamstring:    { cx: 101, cy: 155, r: 10, front: false },
  hamstrings:   { cx: 101, cy: 155, r: 10, front: false },
  calf:         { cx: 100, cy: 205, r: 8,  front: false },
  calves:       { cx: 100, cy: 205, r: 8,  front: false },
  achilles:     { cx: 100, cy: 215, r: 6,  front: false },
}

function normalizeBodyPart(part: string | null): string | null {
  if (!part) return null
  const lower = part.toLowerCase().trim()
  // Direct match
  if (BODY_PART_COORDS[lower]) return lower
  // Partial match
  const key = Object.keys(BODY_PART_COORDS).find((k) => lower.includes(k) || k.includes(lower))
  return key ?? null
}

interface InjuryBodyMapWidgetProps {
  activeInjuries: InjuryWithCheckins[]
  allInjuries?: InjuryWithCheckins[]
}

export function InjuryBodyMapWidget({ activeInjuries, allInjuries = [] }: InjuryBodyMapWidgetProps) {
  const resolvedRecent = allInjuries.filter((inj) => {
    if (!inj.resolved_on) return false
    const resolvedAt = new Date(inj.resolved_on)
    return Date.now() - resolvedAt.getTime() < 30 * 24 * 60 * 60 * 1000
  })

  const hasAny = activeInjuries.length > 0 || resolvedRecent.length > 0

  return (
    <div className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-2 h-full overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Injury Map</h2>
        {activeInjuries.length > 0 && (
          <span className="text-xs font-semibold text-red-400">{activeInjuries.length} active</span>
        )}
      </div>

      {!hasAny && (
        <p className="text-text-subtle text-xs text-center py-4">No active injuries</p>
      )}

      <div className="flex justify-center flex-1 min-h-0">
        <svg viewBox="0 0 160 240" className="h-full max-h-48" style={{ maxWidth: '200px' }}>
          {/* Front body */}
          <ellipse cx="37" cy="32" rx="14" ry="16" fill="none" stroke="var(--border)" strokeWidth="1.5" />
          <path d="M12 58 Q37 50 62 58 L68 130 L54 130 L50 110 L24 110 L20 130 L6 130 Z" fill="none" stroke="var(--border)" strokeWidth="1.5" />
          <path d="M12 62 L4 98 L14 98 L20 78" fill="none" stroke="var(--border)" strokeWidth="1.5" />
          <path d="M62 62 L70 98 L60 98 L54 78" fill="none" stroke="var(--border)" strokeWidth="1.5" />
          <path d="M20 130 L16 190 L20 230 L28 230 L30 190 L34 160 L40 190 L42 230 L50 230 L54 190 L54 130" fill="none" stroke="var(--border)" strokeWidth="1.5" />
          {/* Back body */}
          <ellipse cx="108" cy="32" rx="14" ry="16" fill="none" stroke="var(--border)" strokeWidth="1.5" />
          <path d="M84 58 Q108 50 132 58 L138 130 L124 130 L120 110 L96 110 L92 130 L78 130 Z" fill="none" stroke="var(--border)" strokeWidth="1.5" />
          <path d="M84 62 L76 98 L86 98 L92 78" fill="none" stroke="var(--border)" strokeWidth="1.5" />
          <path d="M132 62 L140 98 L130 98 L124 78" fill="none" stroke="var(--border)" strokeWidth="1.5" />
          <path d="M92 130 L88 190 L92 230 L100 230 L102 190 L106 160 L112 190 L114 230 L122 230 L126 190 L124 130" fill="none" stroke="var(--border)" strokeWidth="1.5" />
          {/* Labels */}
          <text x="37" y="250" textAnchor="middle" fontSize="7" fill="var(--text-muted)">Front</text>
          <text x="108" y="250" textAnchor="middle" fontSize="7" fill="var(--text-muted)">Back</text>

          {/* Active injury markers */}
          {activeInjuries.map((inj) => {
            const key = normalizeBodyPart(inj.body_part)
            if (!key) return null
            const coord = BODY_PART_COORDS[key]
            return (
              <g key={inj.id}>
                <circle cx={coord.cx} cy={coord.cy} r={coord.r + 2} fill="rgba(239,68,68,0.2)" stroke="rgb(239,68,68)" strokeWidth="1.5" />
                <title>{inj.description}</title>
              </g>
            )
          })}

          {/* Recently resolved markers (lighter) */}
          {resolvedRecent.map((inj) => {
            const key = normalizeBodyPart(inj.body_part)
            if (!key) return null
            const coord = BODY_PART_COORDS[key]
            return (
              <circle key={inj.id} cx={coord.cx} cy={coord.cy} r={coord.r} fill="rgba(34,197,94,0.15)" stroke="rgb(34,197,94)" strokeWidth="1" strokeDasharray="2,1" />
            )
          })}
        </svg>
      </div>

      {activeInjuries.length > 0 && (
        <div className="flex flex-col gap-1 shrink-0">
          {activeInjuries.slice(0, 3).map((inj) => (
            <div key={inj.id} className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
              <span className="text-text truncate">{inj.description}</span>
              {inj.body_part && <span className="text-text-muted shrink-0">({inj.body_part})</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
