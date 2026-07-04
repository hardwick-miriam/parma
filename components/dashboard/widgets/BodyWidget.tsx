'use client'

import { useState, useEffect, useMemo } from 'react'
import { useGridItemSize } from '@/components/dashboard/GridItemSizeContext'
import type { MuscleId, MuscleView } from '@/lib/muscles'
import { MUSCLE_GROUP_LABEL, MUSCLE_SIDE } from '@/lib/muscles'
import type { MuscleRecoveryState } from '@/lib/muscleRecovery'
import type { InjuryWithCheckins } from '@/lib/db/queries'

// ─── SVG body figure paths ────────────────────────────────────────────────────
// viewBox "0 0 280 330"  Front figure: cx≈70  Back figure: cx≈210

// Each muscle group has a named shape used both for the outline style and the overlay
type MuscleSVGDef = {
  id: MuscleId
  view: MuscleView
  shape: 'ellipse' | 'rect' | 'path'
  // ellipse
  cx?: number; cy?: number; rx?: number; ry?: number
  // rect
  x?: number; y?: number; w?: number; h?: number; r?: number
  // path
  d?: string
}

const MUSCLE_DEFS: MuscleSVGDef[] = [
  // ── FRONT ──────────────────────────────────────────────────────────────────
  { id: 'chest-l',        view: 'front', shape: 'ellipse', cx: 55,  cy: 86,  rx: 16, ry: 13 },
  { id: 'chest-r',        view: 'front', shape: 'ellipse', cx: 85,  cy: 86,  rx: 16, ry: 13 },
  { id: 'front-delts-l',  view: 'front', shape: 'ellipse', cx: 35,  cy: 71,  rx: 10, ry: 9 },
  { id: 'front-delts-r',  view: 'front', shape: 'ellipse', cx: 105, cy: 71,  rx: 10, ry: 9 },
  { id: 'biceps-l',       view: 'front', shape: 'ellipse', cx: 20,  cy: 107, rx: 7,  ry: 16 },
  { id: 'biceps-r',       view: 'front', shape: 'ellipse', cx: 120, cy: 107, rx: 7,  ry: 16 },
  { id: 'triceps-l',      view: 'front', shape: 'ellipse', cx: 17,  cy: 105, rx: 5,  ry: 14 },
  { id: 'triceps-r',      view: 'front', shape: 'ellipse', cx: 123, cy: 105, rx: 5,  ry: 14 },
  { id: 'forearms-l',     view: 'front', shape: 'ellipse', cx: 13,  cy: 148, rx: 6,  ry: 20 },
  { id: 'forearms-r',     view: 'front', shape: 'ellipse', cx: 127, cy: 148, rx: 6,  ry: 20 },
  { id: 'abs-upper',      view: 'front', shape: 'rect',    x: 56,   y: 103,  w: 28,  h: 20, r: 3 },
  { id: 'abs-lower',      view: 'front', shape: 'rect',    x: 57,   y: 124,  w: 26,  h: 18, r: 3 },
  { id: 'obliques-l',     view: 'front', shape: 'ellipse', cx: 46,  cy: 120, rx: 8,  ry: 18 },
  { id: 'obliques-r',     view: 'front', shape: 'ellipse', cx: 94,  cy: 120, rx: 8,  ry: 18 },
  { id: 'quads-l',        view: 'front', shape: 'ellipse', cx: 56,  cy: 220, rx: 15, ry: 32 },
  { id: 'quads-r',        view: 'front', shape: 'ellipse', cx: 84,  cy: 220, rx: 15, ry: 32 },
  { id: 'adductors-l',    view: 'front', shape: 'ellipse', cx: 64,  cy: 218, rx: 7,  ry: 22 },
  { id: 'adductors-r',    view: 'front', shape: 'ellipse', cx: 76,  cy: 218, rx: 7,  ry: 22 },
  { id: 'calves-front-l', view: 'front', shape: 'ellipse', cx: 55,  cy: 282, rx: 9,  ry: 20 },
  { id: 'calves-front-r', view: 'front', shape: 'ellipse', cx: 85,  cy: 282, rx: 9,  ry: 20 },
  { id: 'tibialis-l',     view: 'front', shape: 'ellipse', cx: 49,  cy: 278, rx: 5,  ry: 18 },
  { id: 'tibialis-r',     view: 'front', shape: 'ellipse', cx: 91,  cy: 278, rx: 5,  ry: 18 },
  // ── BACK ───────────────────────────────────────────────────────────────────
  { id: 'traps',          view: 'back',  shape: 'path', d: 'M 195 60 Q 210 48 225 60 L 232 75 Q 210 68 188 75 Z' },
  { id: 'rear-delts-l',   view: 'back',  shape: 'ellipse', cx: 175, cy: 70,  rx: 10, ry: 9 },
  { id: 'rear-delts-r',   view: 'back',  shape: 'ellipse', cx: 245, cy: 70,  rx: 10, ry: 9 },
  { id: 'lats-l',         view: 'back',  shape: 'path', d: 'M 188 78 Q 174 110 179 148 L 197 148 Q 190 118 196 82 Z' },
  { id: 'lats-r',         view: 'back',  shape: 'path', d: 'M 232 78 Q 246 110 241 148 L 223 148 Q 230 118 224 82 Z' },
  { id: 'rhomboids',      view: 'back',  shape: 'rect',    x: 198,  y: 78,   w: 24,  h: 36, r: 4 },
  { id: 'lower-back',     view: 'back',  shape: 'rect',    x: 201,  y: 146,  w: 18,  h: 22, r: 4 },
  { id: 'glutes-l',       view: 'back',  shape: 'ellipse', cx: 198, cy: 188, rx: 18, ry: 20 },
  { id: 'glutes-r',       view: 'back',  shape: 'ellipse', cx: 222, cy: 188, rx: 18, ry: 20 },
  { id: 'hamstrings-l',   view: 'back',  shape: 'ellipse', cx: 198, cy: 234, rx: 14, ry: 28 },
  { id: 'hamstrings-r',   view: 'back',  shape: 'ellipse', cx: 222, cy: 234, rx: 14, ry: 28 },
  { id: 'calves-l',       view: 'back',  shape: 'ellipse', cx: 198, cy: 283, rx: 10, ry: 22 },
  { id: 'calves-r',       view: 'back',  shape: 'ellipse', cx: 222, cy: 283, rx: 10, ry: 22 },
]

// ─── Body outline paths (white lines, like reference image) ──────────────────

const FRONT_OUTLINE = `
  M 70 8 m -13 0 a 13 13 0 1 0 26 0 a 13 13 0 1 0 -26 0
  M 70 21 L 68 38 M 68 38 L 40 55 M 40 55 L 27 60 L 16 90 L 10 130 L 10 168 L 17 195 L 16 225
  M 68 38 L 72 38 M 72 38 L 100 55 M 100 55 L 113 60 L 124 90 L 130 130 L 130 168 L 123 195 L 124 225
  M 40 55 L 40 80 Q 40 150 45 170 Q 48 172 70 174 Q 92 172 95 170 Q 100 150 100 80 L 100 55
  M 70 174 L 55 175 L 47 260 L 45 300 L 50 310 L 58 310 L 60 265 L 65 254
  M 70 174 L 85 175 L 93 260 L 95 300 L 90 310 L 82 310 L 80 265 L 75 254
  M 65 254 L 75 254
  M 16 225 L 12 240
  M 124 225 L 128 240
`

const BACK_OUTLINE = `
  M 210 8 m -13 0 a 13 13 0 1 0 26 0 a 13 13 0 1 0 -26 0
  M 210 21 L 208 38 M 208 38 L 180 55 M 180 55 L 167 60 L 156 90 L 150 130 L 150 168 L 157 195 L 156 225
  M 208 38 L 212 38 M 212 38 L 240 55 M 240 55 L 253 60 L 264 90 L 270 130 L 270 168 L 263 195 L 264 225
  M 180 55 L 180 80 Q 180 150 185 170 Q 188 172 210 174 Q 232 172 235 170 Q 240 150 240 80 L 240 55
  M 210 174 L 195 175 L 187 260 L 185 300 L 190 310 L 198 310 L 200 265 L 205 254
  M 210 174 L 225 175 L 233 260 L 235 300 L 230 310 L 222 310 L 220 265 L 215 254
  M 205 254 L 215 254
  M 156 225 L 152 240
  M 264 225 L 268 240
`

// ─── Render helpers ───────────────────────────────────────────────────────────

function renderShape(def: MuscleSVGDef, fill: string, opacity: number, stroke?: string) {
  const key = def.id
  if (def.shape === 'ellipse') {
    return <ellipse key={key} cx={def.cx} cy={def.cy} rx={def.rx} ry={def.ry} fill={fill} fillOpacity={opacity} stroke={stroke} strokeWidth={stroke ? 1 : 0} />
  }
  if (def.shape === 'rect') {
    return <rect key={key} x={def.x} y={def.y} width={def.w} height={def.h} rx={def.r ?? 0} fill={fill} fillOpacity={opacity} stroke={stroke} strokeWidth={stroke ? 1 : 0} />
  }
  return <path key={key} d={def.d} fill={fill} fillOpacity={opacity} stroke={stroke} strokeWidth={stroke ? 1 : 0} />
}

// Hatched pattern for injury overlay
function HatchDef() {
  return (
    <defs>
      <pattern id="hatch-injury" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="5" stroke="#ef4444" strokeWidth="1.5" opacity="0.6" />
      </pattern>
      <pattern id="hatch-recovering" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="5" stroke="#f59e0b" strokeWidth="1.5" opacity="0.5" />
      </pattern>
    </defs>
  )
}

// ─── Injury helper ────────────────────────────────────────────────────────────

function injuryMuscles(injuries: InjuryWithCheckins[]): Set<string> {
  const muscles = new Set<string>()
  for (const inj of injuries) {
    const bp = (inj.body_part ?? '').toLowerCase()
    if (bp.includes('chest')) { muscles.add('chest-l'); muscles.add('chest-r') }
    if (bp.includes('shoulder') || bp.includes('delt')) {
      muscles.add('front-delts-l'); muscles.add('front-delts-r')
      muscles.add('rear-delts-l'); muscles.add('rear-delts-r')
    }
    if (bp.includes('bicep')) { muscles.add('biceps-l'); muscles.add('biceps-r') }
    if (bp.includes('tricep')) { muscles.add('triceps-l'); muscles.add('triceps-r') }
    if (bp.includes('back') && !bp.includes('lower')) { muscles.add('rhomboids'); muscles.add('lats-l'); muscles.add('lats-r') }
    if (bp.includes('lower back') || bp.includes('lumbar')) muscles.add('lower-back')
    if (bp.includes('trap')) muscles.add('traps')
    if (bp.includes('quad') || (bp.includes('thigh') && !bp.includes('inner'))) { muscles.add('quads-l'); muscles.add('quads-r') }
    if (bp.includes('hamstring') || bp.includes('ham')) { muscles.add('hamstrings-l'); muscles.add('hamstrings-r') }
    if (bp.includes('glute') || bp.includes('hip')) { muscles.add('glutes-l'); muscles.add('glutes-r') }
    if (bp.includes('calf') || bp.includes('calves')) { muscles.add('calves-l'); muscles.add('calves-r') }
    if (bp.includes('knee')) { muscles.add('quads-l'); muscles.add('quads-r') }
    if (bp.includes('ankle')) { muscles.add('calves-front-l'); muscles.add('calves-front-r') }
  }
  return muscles
}

// ─── Muscle detail popover ────────────────────────────────────────────────────

function MusclePopover({
  muscleId,
  recovery,
  injury,
  onClose,
}: {
  muscleId: MuscleId
  recovery: MuscleRecoveryState | undefined
  injury: InjuryWithCheckins | undefined
  onClose: () => void
}) {
  const label = MUSCLE_GROUP_LABEL[muscleId]
  const loadPct = recovery ? Math.round(recovery.load * 100) : 0
  const hoursLeft = recovery ? Math.round(recovery.hoursToFullRecovery) : 0

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full rounded-xl p-4 flex flex-col gap-2"
        style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-lg)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-text">{label}</p>
          <button onClick={onClose} className="text-text-subtle text-lg leading-none hover:text-text">×</button>
        </div>
        {recovery ? (
          <div className="flex flex-col gap-1">
            <div className="w-full h-1.5 rounded-full bg-surface overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${loadPct}%`, background: 'var(--accent)', opacity: 0.8 }} />
            </div>
            <p className="text-xs text-text-muted">{loadPct}% load · {hoursLeft}h to recover{recovery.sorenessPenalty ? ' (soreness penalty)' : ''}</p>
          </div>
        ) : (
          <p className="text-xs text-text-subtle">Fully recovered</p>
        )}
        {injury && (
          <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
            ⚠ {injury.description} — {injury.checkins.at(-1)?.feeling_pct ?? '?'}% recovered
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SVG Figure ───────────────────────────────────────────────────────────────

function BodyFigure({
  view,
  recoveryMap,
  injuredMuscles,
  activeInjuries,
  accentColor,
  onMuscle,
}: {
  view: MuscleView
  recoveryMap: Partial<Record<MuscleId, MuscleRecoveryState>>
  injuredMuscles: Set<string>
  activeInjuries: InjuryWithCheckins[]
  accentColor: string
  onMuscle: (id: MuscleId) => void
}) {
  const visibleDefs = MUSCLE_DEFS.filter(d => d.view === view)
  const outline = view === 'front' ? FRONT_OUTLINE : BACK_OUTLINE

  const vb = view === 'front' ? '0 0 140 330' : '140 0 140 330'

  return (
    <svg
      viewBox={vb}
      width="100%"
      height="100%"
      style={{ maxHeight: '100%' }}
    >
      <HatchDef />
      {/* Body outline */}
      <g stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={outline} />
      </g>

      {/* Muscle overlays — load glow */}
      {visibleDefs.map(def => {
        const rec = recoveryMap[def.id]
        const isInjured = injuredMuscles.has(def.id)
        const load = rec?.load ?? 0

        if (load < 0.05 && !isInjured) return null

        const opacity = 0.15 + load * 0.6

        return (
          <g key={def.id} style={{ cursor: 'pointer' }} onClick={() => onMuscle(def.id)}>
            {/* Load glow */}
            {load > 0.05 && renderShape(def, accentColor, opacity)}
            {/* Injury hatch overlay */}
            {isInjured && renderShape(def, 'url(#hatch-injury)', 1, '#ef4444')}
          </g>
        )
      })}

      {/* Click targets for ALL muscle groups (transparent) */}
      {visibleDefs.map(def => (
        <g key={`tap-${def.id}`} style={{ cursor: 'pointer' }} onClick={() => onMuscle(def.id)}>
          {renderShape(def, 'transparent', 0)}
        </g>
      ))}
    </svg>
  )
}

// ─── Widget ───────────────────────────────────────────────────────────────────

export interface BodyWidgetProps {
  recentWorkouts?: Array<{ date: string; description: string; exercises?: string[] | null; duration_minutes?: number | null; source?: string | null; whoopStrain?: number }>
  activeInjuries?: InjuryWithCheckins[]
  recoveryMap?: Partial<Record<MuscleId, MuscleRecoveryState>>
}

export function BodyWidget({ recentWorkouts = [], activeInjuries = [], recoveryMap = {} }: BodyWidgetProps) {
  const { w, h } = useGridItemSize()
  const compact = w <= 2 || h <= 4
  const sideBySide = w >= 6 && h >= 5

  const [view, setView] = useState<MuscleView>('front')
  const [tapped, setTapped] = useState<MuscleId | null>(null)
  const [accentColor, setAccentColor] = useState('var(--accent)')

  useEffect(() => {
    const el = document.documentElement
    const c = getComputedStyle(el).getPropertyValue('--accent').trim()
    if (c) setAccentColor(c)
  }, [])

  const injured = useMemo(() => injuryMuscles(activeInjuries), [activeInjuries])

  const tappedRecovery = tapped ? recoveryMap[tapped] : undefined
  const tappedInjury = tapped
    ? activeInjuries.find(inj => injured.has(tapped) && (inj.body_part ?? '').toLowerCase().includes(MUSCLE_GROUP_LABEL[tapped].toLowerCase().split(' ')[0]))
    : undefined

  const workedCount = Object.keys(recoveryMap).length
  const injuredCount = activeInjuries.length

  if (compact) {
    return (
      <div className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-2 h-full overflow-hidden" style={{ boxShadow: 'var(--shadow-md)', background: 'var(--surface)' }}>
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest truncate">Body</h2>
        <div className="flex-1 flex flex-col justify-center gap-1">
          <p className="text-2xl font-bold text-text tabular-nums">{workedCount}</p>
          <p className="text-xs text-text-subtle">muscles worked</p>
          {injuredCount > 0 && <p className="text-xs text-red-400">{injuredCount} injury{injuredCount !== 1 ? 's' : ''}</p>}
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative rounded-2xl border border-border flex flex-col h-full overflow-hidden"
      style={{ background: '#0c0c10', boxShadow: 'var(--shadow-md)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
        <h2 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Body</h2>
        <div className="flex items-center gap-1">
          {workedCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'var(--accent)', color: '#fff', opacity: 0.85 }}>
              {workedCount} worked
            </span>
          )}
          {injuredCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-semibold">
              {injuredCount} injured
            </span>
          )}
        </div>
      </div>

      {/* Figure(s) */}
      <div className="flex-1 flex items-center justify-center min-h-0 px-2 pb-2">
        {sideBySide ? (
          <div className="flex w-full h-full gap-2">
            <div className="flex-1 h-full">
              <BodyFigure view="front" recoveryMap={recoveryMap} injuredMuscles={injured} activeInjuries={activeInjuries} accentColor={accentColor} onMuscle={setTapped} />
            </div>
            <div className="flex-1 h-full">
              <BodyFigure view="back" recoveryMap={recoveryMap} injuredMuscles={injured} activeInjuries={activeInjuries} accentColor={accentColor} onMuscle={setTapped} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full w-full">
            <div className="flex-1 min-h-0">
              <BodyFigure view={view} recoveryMap={recoveryMap} injuredMuscles={injured} activeInjuries={activeInjuries} accentColor={accentColor} onMuscle={setTapped} />
            </div>
            {/* Front/Back toggle */}
            <div className="flex justify-center gap-2 py-1 shrink-0">
              {(['front', 'back'] as MuscleView[]).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-md transition-colors"
                  style={{
                    background: view === v ? 'var(--accent)' : 'transparent',
                    color: view === v ? '#fff' : 'rgba(255,255,255,0.35)',
                    border: `1px solid ${view === v ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Muscle detail popover */}
      {tapped && (
        <MusclePopover
          muscleId={tapped}
          recovery={tappedRecovery}
          injury={tappedInjury}
          onClose={() => setTapped(null)}
        />
      )}
    </div>
  )
}
