'use client'

import { useState, useEffect, useMemo } from 'react'
import { useGridItemSize } from '@/components/dashboard/GridItemSizeContext'
import type { MuscleId, MuscleView } from '@/lib/muscles'
import { MUSCLE_GROUP_LABEL } from '@/lib/muscles'
import type { MuscleRecoveryState } from '@/lib/muscleRecovery'
import type { InjuryWithCheckins } from '@/lib/db/queries'

// ─── Muscle zone hit-areas ─────────────────────────────────────────────────
// Coordinates are in the native pixel space of public/body-front.png /
// public/body-back.png (1024×1536), used directly as the SVG viewBox so
// zones scale perfectly with the image at any render size. Hand-aligned by
// measuring the actual artwork (see PROGRESS.md for the calibration method —
// per-row brightness-segment detection via sharp, not eyeballed) rather than
// against the old traced-outline reference image.

type MuscleSVGDef = {
  id: MuscleId
  view: MuscleView
  shape: 'ellipse' | 'rect'
  cx?: number; cy?: number; rx?: number; ry?: number
  x?: number;  y?: number;  w?: number;  h?: number;  r?: number
}

const MUSCLE_DEFS: MuscleSVGDef[] = [
  // ── FRONT (public/body-front.png, 1024×1536) ──────────────────────────────
  { id: 'chest-l',        view: 'front', shape: 'ellipse', cx: 460, cy: 385,  rx: 68, ry: 52 },
  { id: 'chest-r',        view: 'front', shape: 'ellipse', cx: 572, cy: 385,  rx: 68, ry: 52 },
  { id: 'front-delts-l',  view: 'front', shape: 'ellipse', cx: 328, cy: 335,  rx: 50, ry: 50 },
  { id: 'front-delts-r',  view: 'front', shape: 'ellipse', cx: 694, cy: 335,  rx: 50, ry: 50 },
  { id: 'biceps-l',       view: 'front', shape: 'ellipse', cx: 298, cy: 530,  rx: 36, ry: 85 },
  { id: 'biceps-r',       view: 'front', shape: 'ellipse', cx: 722, cy: 530,  rx: 36, ry: 85 },
  { id: 'triceps-l',      view: 'front', shape: 'ellipse', cx: 248, cy: 525,  rx: 16, ry: 75 },
  { id: 'triceps-r',      view: 'front', shape: 'ellipse', cx: 774, cy: 525,  rx: 16, ry: 75 },
  { id: 'forearms-l',     view: 'front', shape: 'ellipse', cx: 228, cy: 715,  rx: 34, ry: 95 },
  { id: 'forearms-r',     view: 'front', shape: 'ellipse', cx: 794, cy: 715,  rx: 34, ry: 95 },
  { id: 'abs-upper',      view: 'front', shape: 'rect',    x: 442, y: 425,   w: 140, h: 90, r: 16 },
  { id: 'abs-lower',      view: 'front', shape: 'rect',    x: 447, y: 522,   w: 130, h: 105, r: 16 },
  { id: 'obliques-l',     view: 'front', shape: 'ellipse', cx: 408, cy: 545,  rx: 34, ry: 100 },
  { id: 'obliques-r',     view: 'front', shape: 'ellipse', cx: 614, cy: 545,  rx: 34, ry: 100 },
  { id: 'quads-l',        view: 'front', shape: 'ellipse', cx: 420, cy: 920,  rx: 66, ry: 110 },
  { id: 'quads-r',        view: 'front', shape: 'ellipse', cx: 600, cy: 920,  rx: 66, ry: 110 },
  { id: 'adductors-l',    view: 'front', shape: 'ellipse', cx: 472, cy: 870,  rx: 32, ry: 100 },
  { id: 'adductors-r',    view: 'front', shape: 'ellipse', cx: 550, cy: 870,  rx: 32, ry: 100 },
  { id: 'calves-front-l', view: 'front', shape: 'ellipse', cx: 406, cy: 1120, rx: 45, ry: 90 },
  { id: 'calves-front-r', view: 'front', shape: 'ellipse', cx: 613, cy: 1120, rx: 45, ry: 90 },
  { id: 'tibialis-l',     view: 'front', shape: 'ellipse', cx: 400, cy: 1215, rx: 28, ry: 70 },
  { id: 'tibialis-r',     view: 'front', shape: 'ellipse', cx: 612, cy: 1215, rx: 28, ry: 70 },
  // ── BACK (public/body-back.png, 1024×1536) ────────────────────────────────
  { id: 'traps',          view: 'back',  shape: 'ellipse', cx: 512, cy: 300,  rx: 105, ry: 68 },
  { id: 'rear-delts-l',   view: 'back',  shape: 'ellipse', cx: 318, cy: 350,  rx: 48, ry: 48 },
  { id: 'rear-delts-r',   view: 'back',  shape: 'ellipse', cx: 704, cy: 350,  rx: 48, ry: 48 },
  { id: 'lats-l',         view: 'back',  shape: 'ellipse', cx: 415, cy: 530,  rx: 42, ry: 110 },
  { id: 'lats-r',         view: 'back',  shape: 'ellipse', cx: 609, cy: 530,  rx: 42, ry: 110 },
  { id: 'rhomboids',      view: 'back',  shape: 'rect',    x: 452, y: 370,   w: 120, h: 75, r: 16 },
  { id: 'lower-back',     view: 'back',  shape: 'rect',    x: 477, y: 610,   w: 70, h: 90, r: 16 },
  { id: 'glutes-l',       view: 'back',  shape: 'ellipse', cx: 438, cy: 755,  rx: 72, ry: 68 },
  { id: 'glutes-r',       view: 'back',  shape: 'ellipse', cx: 586, cy: 755,  rx: 72, ry: 68 },
  { id: 'hamstrings-l',   view: 'back',  shape: 'ellipse', cx: 418, cy: 950,  rx: 60, ry: 105 },
  { id: 'hamstrings-r',   view: 'back',  shape: 'ellipse', cx: 598, cy: 950,  rx: 60, ry: 105 },
  { id: 'calves-l',       view: 'back',  shape: 'ellipse', cx: 404, cy: 1130, rx: 46, ry: 85 },
  { id: 'calves-r',       view: 'back',  shape: 'ellipse', cx: 614, cy: 1130, rx: 46, ry: 85 },
]

const VIEWBOX = '0 0 1024 1536'

// ─── Render helpers ───────────────────────────────────────────────────────────

function renderShape(def: MuscleSVGDef, fill: string, opacity: number, stroke?: string, filter?: string) {
  const key = def.id
  if (def.shape === 'ellipse') {
    return <ellipse key={key} cx={def.cx} cy={def.cy} rx={def.rx} ry={def.ry} fill={fill} fillOpacity={opacity} stroke={stroke} strokeWidth={stroke ? 3 : 0} filter={filter} />
  }
  return <rect key={key} x={def.x} y={def.y} width={def.w} height={def.h} rx={def.r ?? 0} fill={fill} fillOpacity={opacity} stroke={stroke} strokeWidth={stroke ? 3 : 0} filter={filter} />
}

function GlowDefs({ accentColor }: { accentColor: string }) {
  return (
    <defs>
      <radialGradient id="muscle-glow-fill">
        <stop offset="0%" stopColor={accentColor} stopOpacity="0.95" />
        <stop offset="70%" stopColor={accentColor} stopOpacity="0.55" />
        <stop offset="100%" stopColor={accentColor} stopOpacity="0.1" />
      </radialGradient>
      <filter id="muscle-blur" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="10" />
      </filter>
      <pattern id="hatch-injury" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="14" stroke="#ef4444" strokeWidth="4" opacity="0.75" />
      </pattern>
      <pattern id="hatch-recovering" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="14" stroke="#f59e0b" strokeWidth="4" opacity="0.6" />
      </pattern>
    </defs>
  )
}

// ─── Injury body-part → muscle-id mapping ────────────────────────────────────

// Single source of truth for injury body_part → muscle IDs, used both to
// highlight injured muscles on the diagram and (via injuryForMuscle below)
// to find which injury applies to a tapped muscle. Previously the tapped-
// muscle lookup used a separate, much cruder heuristic (matching only the
// first word of the muscle's display label against the injury text), so an
// injury logged as "shoulder" would never surface for a tap on "Rear Delt"
// even though this same keyword map already correctly flags it as injured.
function muscleIdsForBodyPart(bodyPart: string | null): Set<string> {
  const muscles = new Set<string>()
  const bp = (bodyPart ?? '').toLowerCase()
  if (bp.includes('chest')) { muscles.add('chest-l'); muscles.add('chest-r') }
  if (bp.includes('shoulder') || bp.includes('delt')) {
    muscles.add('front-delts-l'); muscles.add('front-delts-r')
    muscles.add('rear-delts-l'); muscles.add('rear-delts-r')
  }
  if (bp.includes('bicep')) { muscles.add('biceps-l'); muscles.add('biceps-r') }
  if (bp.includes('tricep')) { muscles.add('triceps-l'); muscles.add('triceps-r') }
  if (bp.includes('lat') || (bp.includes('back') && !bp.includes('lower'))) {
    muscles.add('rhomboids'); muscles.add('lats-l'); muscles.add('lats-r')
  }
  if (bp.includes('lower back') || bp.includes('lumbar')) muscles.add('lower-back')
  if (bp.includes('trap')) muscles.add('traps')
  if (bp.includes('quad') || (bp.includes('thigh') && !bp.includes('inner'))) {
    muscles.add('quads-l'); muscles.add('quads-r')
  }
  if (bp.includes('hamstring') || bp.includes('ham')) {
    muscles.add('hamstrings-l'); muscles.add('hamstrings-r')
  }
  if (bp.includes('glute') || bp.includes('hip')) { muscles.add('glutes-l'); muscles.add('glutes-r') }
  if (bp.includes('calf') || bp.includes('calves') || bp.includes('gastro')) {
    muscles.add('calves-l'); muscles.add('calves-r')
  }
  if (bp.includes('knee')) { muscles.add('quads-l'); muscles.add('quads-r') }
  if (bp.includes('ankle') || bp.includes('shin') || bp.includes('tibial')) {
    muscles.add('calves-front-l'); muscles.add('calves-front-r')
    muscles.add('tibialis-l'); muscles.add('tibialis-r')
  }
  if (bp.includes('oblique')) { muscles.add('obliques-l'); muscles.add('obliques-r') }
  if (bp.includes('ab') || bp.includes('core')) {
    muscles.add('abs-upper'); muscles.add('abs-lower')
  }
  if (bp.includes('forearm') || bp.includes('wrist')) {
    muscles.add('forearms-l'); muscles.add('forearms-r')
  }
  if (bp.includes('adduct') || bp.includes('groin') || bp.includes('inner thigh')) {
    muscles.add('adductors-l'); muscles.add('adductors-r')
  }
  return muscles
}

function injuryMuscles(injuries: InjuryWithCheckins[]): Set<string> {
  const muscles = new Set<string>()
  for (const inj of injuries) {
    for (const m of muscleIdsForBodyPart(inj.body_part)) muscles.add(m)
  }
  return muscles
}

// The first injury (if any) whose body_part keyword-maps to this muscle ID.
function injuryForMuscle(injuries: InjuryWithCheckins[], muscleId: string): InjuryWithCheckins | undefined {
  return injuries.find((inj) => muscleIdsForBodyPart(inj.body_part).has(muscleId))
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
    <div className="absolute inset-0 z-20 flex items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full rounded-xl p-4 flex flex-col gap-2"
        style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-lg)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-text">{label}</p>
          <button onClick={onClose} aria-label="Close" className="text-text-subtle text-lg leading-none hover:text-text w-11 h-11 -m-2 flex items-center justify-center shrink-0">×</button>
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

// ─── Figure layer: real artwork + data-driven SVG overlay ────────────────────

function BodyFigure({
  view,
  recoveryMap,
  injuredMuscles,
  accentColor,
  onMuscle,
}: {
  view: MuscleView
  recoveryMap: Partial<Record<MuscleId, MuscleRecoveryState>>
  injuredMuscles: Set<string>
  accentColor: string
  onMuscle: (id: MuscleId) => void
}) {
  const visibleDefs = MUSCLE_DEFS.filter(d => d.view === view)
  const src = view === 'front' ? '/body-front.png' : '/body-back.png'

  return (
    <div className="relative w-full h-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={`${view} muscle anatomy`} className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none" draggable={false} />
      <svg viewBox={VIEWBOX} width="100%" height="100%" className="absolute inset-0" style={{ maxHeight: '100%' }} preserveAspectRatio="xMidYMid meet">
        <GlowDefs accentColor={accentColor} />

        {/* Muscle-load glow overlays — soft radial glow, blurred, clipped to zone shape */}
        {visibleDefs.map(def => {
          const rec = recoveryMap[def.id]
          const isInjured = injuredMuscles.has(def.id)
          const load = rec?.load ?? 0
          if (load < 0.05 && !isInjured) return null
          const opacity = 0.25 + load * 0.65
          return (
            <g key={def.id} style={{ cursor: 'pointer' }} onClick={() => onMuscle(def.id)}>
              {load > 0.05 && renderShape(def, 'url(#muscle-glow-fill)', opacity, undefined, 'url(#muscle-blur)')}
              {isInjured && renderShape(def, 'url(#hatch-injury)', 1, '#ef4444')}
            </g>
          )
        })}

        {/* Transparent click targets for every muscle zone */}
        {visibleDefs.map(def => (
          <g key={`tap-${def.id}`} style={{ cursor: 'pointer' }} onClick={() => onMuscle(def.id)}>
            {renderShape(def, 'transparent', 0)}
          </g>
        ))}
      </svg>
    </div>
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
  const [accentColor, setAccentColor] = useState('#8b5cf6')

  useEffect(() => {
    const c = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    if (c) setAccentColor(c)
  }, [])

  const injured = useMemo(() => injuryMuscles(activeInjuries), [activeInjuries])
  const tappedRecovery = tapped ? recoveryMap[tapped] : undefined
  const tappedInjury = tapped ? injuryForMuscle(activeInjuries, tapped) : undefined

  const workedCount = Object.keys(recoveryMap).length
  const injuredCount = activeInjuries.length

  if (compact) {
    return (
      <div className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-2 h-full overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest truncate">Body</h2>
        <div className="flex-1 flex flex-col justify-center gap-1">
          <p className="text-2xl font-bold text-text tabular-nums">{workedCount}</p>
          <p className="text-xs text-text-subtle">muscles worked</p>
          {injuredCount > 0 && <p className="text-xs text-negative">{injuredCount} injur{injuredCount !== 1 ? 'ies' : 'y'}</p>}
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative rounded-2xl border border-border flex flex-col h-full overflow-hidden"
      style={{ background: '#0b0b0f', boxShadow: 'var(--shadow-md)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
        <h2 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Body</h2>
        <div className="flex items-center gap-1.5">
          {workedCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'var(--accent)', color: '#fff', opacity: 0.9 }}>
              {workedCount} worked
            </span>
          )}
          {injuredCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-negative/20 text-negative font-semibold">
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
              <BodyFigure view="front" recoveryMap={recoveryMap} injuredMuscles={injured} accentColor={accentColor} onMuscle={setTapped} />
            </div>
            <div className="flex-1 h-full">
              <BodyFigure view="back" recoveryMap={recoveryMap} injuredMuscles={injured} accentColor={accentColor} onMuscle={setTapped} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full w-full">
            <div className="flex-1 min-h-0 relative">
              {/* Both views stacked, crossfaded via opacity so switching front/back is a smooth transition rather than a hard cut */}
              <div className="absolute inset-0" style={{ opacity: view === 'front' ? 1 : 0, pointerEvents: view === 'front' ? 'auto' : 'none', transition: 'opacity 400ms ease' }}>
                <BodyFigure view="front" recoveryMap={recoveryMap} injuredMuscles={injured} accentColor={accentColor} onMuscle={setTapped} />
              </div>
              <div className="absolute inset-0" style={{ opacity: view === 'back' ? 1 : 0, pointerEvents: view === 'back' ? 'auto' : 'none', transition: 'opacity 400ms ease' }}>
                <BodyFigure view="back" recoveryMap={recoveryMap} injuredMuscles={injured} accentColor={accentColor} onMuscle={setTapped} />
              </div>
            </div>
            <div className="flex justify-center gap-2 py-1 shrink-0">
              {(['front', 'back'] as MuscleView[]).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-md transition-colors"
                  style={{
                    background: view === v ? 'var(--accent)' : 'transparent',
                    color: view === v ? '#fff' : 'rgba(255,255,255,0.35)',
                    border: `1px solid ${view === v ? 'var(--accent)' : 'rgba(255,255,255,0.12)'}`,
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

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
