'use client'

import { useState, useEffect, useMemo } from 'react'
import { useGridItemSize } from '@/components/dashboard/GridItemSizeContext'
import type { MuscleId, MuscleView } from '@/lib/muscles'
import { MUSCLE_GROUP_LABEL } from '@/lib/muscles'
import type { MuscleRecoveryState } from '@/lib/muscleRecovery'
import type { InjuryWithCheckins } from '@/lib/db/queries'

// ─── Muscle zone hit-areas (aligned to the anatomical paths below) ────────────
// Front figure centre x=70  ·  Back figure centre x=210  ·  height 334

type MuscleSVGDef = {
  id: MuscleId
  view: MuscleView
  shape: 'ellipse' | 'rect' | 'path'
  cx?: number; cy?: number; rx?: number; ry?: number
  x?: number;  y?: number;  w?: number;  h?: number;  r?: number
  d?: string
}

const MUSCLE_DEFS: MuscleSVGDef[] = [
  // ── FRONT ────────────────────────────────────────────────────────────────────
  { id: 'chest-l',        view: 'front', shape: 'ellipse', cx: 52,  cy: 92,  rx: 18, ry: 14 },
  { id: 'chest-r',        view: 'front', shape: 'ellipse', cx: 88,  cy: 92,  rx: 18, ry: 14 },
  { id: 'front-delts-l',  view: 'front', shape: 'ellipse', cx: 22,  cy: 80,  rx: 10, ry: 11 },
  { id: 'front-delts-r',  view: 'front', shape: 'ellipse', cx: 118, cy: 80,  rx: 10, ry: 11 },
  { id: 'biceps-l',       view: 'front', shape: 'ellipse', cx: 17,  cy: 122, rx:  7, ry: 18 },
  { id: 'biceps-r',       view: 'front', shape: 'ellipse', cx: 123, cy: 122, rx:  7, ry: 18 },
  { id: 'triceps-l',      view: 'front', shape: 'ellipse', cx: 13,  cy: 120, rx:  5, ry: 16 },
  { id: 'triceps-r',      view: 'front', shape: 'ellipse', cx: 127, cy: 120, rx:  5, ry: 16 },
  { id: 'forearms-l',     view: 'front', shape: 'ellipse', cx: 13,  cy: 174, rx:  6, ry: 18 },
  { id: 'forearms-r',     view: 'front', shape: 'ellipse', cx: 127, cy: 174, rx:  6, ry: 18 },
  { id: 'abs-upper',      view: 'front', shape: 'rect',    x: 58,   y: 122,  w: 24,  h: 24,  r: 3 },
  { id: 'abs-lower',      view: 'front', shape: 'rect',    x: 58,   y: 148,  w: 24,  h: 22,  r: 3 },
  { id: 'obliques-l',     view: 'front', shape: 'ellipse', cx: 44,  cy: 152, rx:  9, ry: 22 },
  { id: 'obliques-r',     view: 'front', shape: 'ellipse', cx: 96,  cy: 152, rx:  9, ry: 22 },
  { id: 'quads-l',        view: 'front', shape: 'ellipse', cx: 50,  cy: 240, rx: 14, ry: 30 },
  { id: 'quads-r',        view: 'front', shape: 'ellipse', cx: 90,  cy: 240, rx: 14, ry: 30 },
  { id: 'adductors-l',    view: 'front', shape: 'ellipse', cx: 61,  cy: 238, rx:  7, ry: 24 },
  { id: 'adductors-r',    view: 'front', shape: 'ellipse', cx: 79,  cy: 238, rx:  7, ry: 24 },
  { id: 'calves-front-l', view: 'front', shape: 'ellipse', cx: 47,  cy: 307, rx:  8, ry: 18 },
  { id: 'calves-front-r', view: 'front', shape: 'ellipse', cx: 93,  cy: 307, rx:  8, ry: 18 },
  { id: 'tibialis-l',     view: 'front', shape: 'ellipse', cx: 44,  cy: 308, rx:  5, ry: 17 },
  { id: 'tibialis-r',     view: 'front', shape: 'ellipse', cx: 96,  cy: 308, rx:  5, ry: 17 },
  // ── BACK ─────────────────────────────────────────────────────────────────────
  { id: 'traps',          view: 'back',  shape: 'path',    d: 'M 209,56 C 198,62 185,70 183,80 C 181,90 184,98 190,102 C 198,106 210,108 210,108 C 210,108 222,106 230,102 C 236,98 239,90 237,80 C 235,70 222,62 211,56 Z' },
  { id: 'rear-delts-l',   view: 'back',  shape: 'ellipse', cx: 172, cy: 80,  rx: 11, ry: 11 },
  { id: 'rear-delts-r',   view: 'back',  shape: 'ellipse', cx: 248, cy: 80,  rx: 11, ry: 11 },
  { id: 'lats-l',         view: 'back',  shape: 'path',    d: 'M 183,98 C 176,114 175,134 178,154 C 181,166 186,175 192,181 L 200,166 C 196,156 195,140 198,124 C 200,112 202,102 202,98 Z' },
  { id: 'lats-r',         view: 'back',  shape: 'path',    d: 'M 237,98 C 244,114 245,134 242,154 C 239,166 234,175 228,181 L 220,166 C 224,156 225,140 222,124 C 220,112 218,102 218,98 Z' },
  { id: 'rhomboids',      view: 'back',  shape: 'rect',    x: 200,  y: 86,   w: 20,  h: 30,  r: 4 },
  { id: 'lower-back',     view: 'back',  shape: 'rect',    x: 202,  y: 148,  w: 16,  h: 26,  r: 4 },
  { id: 'glutes-l',       view: 'back',  shape: 'ellipse', cx: 196, cy: 204, rx: 18, ry: 20 },
  { id: 'glutes-r',       view: 'back',  shape: 'ellipse', cx: 224, cy: 204, rx: 18, ry: 20 },
  { id: 'hamstrings-l',   view: 'back',  shape: 'ellipse', cx: 196, cy: 248, rx: 14, ry: 26 },
  { id: 'hamstrings-r',   view: 'back',  shape: 'ellipse', cx: 224, cy: 248, rx: 14, ry: 26 },
  { id: 'calves-l',       view: 'back',  shape: 'ellipse', cx: 196, cy: 302, rx: 10, ry: 20 },
  { id: 'calves-r',       view: 'back',  shape: 'ellipse', cx: 224, cy: 302, rx: 10, ry: 20 },
]

// ─── Anatomical body silhouette ───────────────────────────────────────────────
// Single closed path traced from the reference image (public/body-reference.png).
// Centre x=70, height 334. Rendered with translate(140,0) for the back view.
//
// Clockwise from head-top → right head → right neck/shoulder → right arm outer
// → right hand → right arm inner → right axilla → right torso → right leg →
// right foot → left foot → left leg → left torso → left axilla →
// left arm inner → left hand → left arm outer → left shoulder → left head → Z

const BODY_OUTLINE = `
M 70 2
C 85 2 87 11 87 20 C 87 30 81 37 74 39
C 75 40 77 43 78 50 C 81 55 91 59 104 63
C 116 66 123 69 128 74 C 133 80 134 91 132 104
C 130 116 129 129 128 142 C 128 149 129 156 130 164
C 130 173 129 182 127 192 C 127 198 129 208 129 217
C 128 226 127 234 124 238 C 121 240 119 235 119 225
C 119 215 119 205 118 196 C 116 186 114 174 112 163
C 111 154 110 144 109 134 C 108 122 108 111 110 102
C 110 94 113 87 117 84
C 118 91 117 104 116 118 C 115 132 112 147 109 161
C 107 171 104 178 101 183 C 100 190 104 198 108 206
C 107 218 105 236 102 254 C 99 270 97 280 96 292
C 96 305 95 317 93 326 C 91 331 88 334 83 334
L 104 334 C 106 332 107 329 105 326
C 103 323 96 322 87 322 C 82 322 76 322 70 322
C 64 322 58 322 53 322 C 44 322 37 323 35 326
C 33 329 34 332 36 334 L 57 334
C 52 334 49 331 47 326 C 45 317 44 305 44 292
C 43 280 41 270 38 254 C 35 236 33 218 32 206
C 36 198 40 190 39 183 C 36 178 33 171 31 161
C 28 147 25 132 24 118 C 23 104 22 91 23 84
C 27 87 30 94 30 102 C 32 111 32 122 31 134
C 30 144 29 154 28 163 C 26 174 24 186 22 196
C 21 205 21 215 21 225 C 21 235 19 240 16 238
C 12 234 11 226 11 217 C 11 208 13 198 13 192
C 11 182 10 173 10 164 C 11 156 12 149 12 142
C 11 129 10 116 8 104 C 6 91 7 80 12 74
C 17 69 27 66 36 63 C 49 59 59 55 62 50
C 63 43 65 40 66 39 C 59 37 53 30 53 20
C 53 11 55 2 70 2 Z
`

// ─── Internal muscle-definition lines (front) ─────────────────────────────────
// Matches the reference figure's white internal lines. Rendered at low opacity.
const FRONT_LINES = [
  // Sternocleidomastoid (neck)
  'M 63 40 C 61 45 60 50 59 55',
  'M 77 40 C 79 45 80 50 81 55',
  // Left deltoid boundary
  'M 36 63 C 28 72 21 84 21 98',
  // Right deltoid boundary
  'M 104 63 C 112 72 119 84 119 98',
  // Sternal groove (pec centre)
  'M 70 63 L 70 118',
  // Left pec lower arc
  'M 35 100 C 44 110 57 117 68 120',
  // Right pec lower arc
  'M 105 100 C 96 110 83 117 72 120',
  // Left pec lateral edge
  'M 70 63 C 58 72 44 92 36 108',
  // Right pec lateral edge
  'M 70 63 C 82 72 96 92 104 108',
  // Linea alba
  'M 70 120 L 70 186',
  // Upper transverse
  'M 59 132 C 64 133 70 133 76 133 L 81 132',
  // Mid transverse
  'M 57 150 C 64 151 70 151 76 151 L 83 150',
  // Lower transverse
  'M 56 168 C 63 169 70 169 77 169 L 84 168',
  // Left oblique sweep
  'M 59 132 C 52 150 45 166 40 182',
  // Right oblique sweep
  'M 81 132 C 88 150 95 166 100 182',
  // Left bicep outer line
  'M 20 108 C 18 122 16 138 16 154',
  // Right bicep outer line
  'M 120 108 C 122 122 124 138 124 154',
  // Left forearm outer
  'M 16 162 C 14 175 14 185 15 193',
  // Right forearm outer
  'M 124 162 C 126 175 126 185 125 193',
  // Left outer quad line
  'M 48 218 C 47 237 46 254 47 270',
  // Right outer quad line
  'M 92 218 C 93 237 94 254 93 270',
  // Left VMO/inner quad
  'M 61 258 C 59 266 58 274 58 282',
  // Right VMO
  'M 79 258 C 81 266 82 274 82 282',
  // Left patella arc
  'M 45 282 C 50 290 57 293 63 291 C 67 290 70 288 70 286',
  // Right patella arc
  'M 95 282 C 90 290 83 293 77 291 C 73 290 70 288 70 286',
  // Left tibialis (shin)
  'M 45 298 C 46 310 46 320 47 328',
  // Right tibialis
  'M 95 298 C 94 310 94 320 93 328',
]

// ─── Internal muscle-definition lines (back) ─────────────────────────────────
// All x = front-equivalent + 140
const BACK_LINES = [
  // Spine
  'M 210 58 L 210 180',
  // Left trap outline
  'M 209 56 C 200 63 187 70 183 81 C 181 89 183 96 189 102',
  // Right trap outline
  'M 211 56 C 220 63 233 70 237 81 C 239 89 237 96 231 102',
  // Left trap inner (blade boundary)
  'M 209 56 C 205 70 202 84 202 96',
  // Right trap inner
  'M 211 56 C 215 70 218 84 218 96',
  // Left lat outer edge
  'M 183 102 C 178 118 177 138 180 156 C 183 167 188 176 194 182',
  // Right lat outer edge
  'M 237 102 C 242 118 243 138 240 156 C 237 167 232 176 226 182',
  // Left rhomboid boundary
  'M 202 88 C 202 98 202 108 203 116',
  'M 210 84 C 207 94 204 106 204 116',
  'M 203 116 C 206 119 210 120 210 120',
  // Right rhomboid boundary
  'M 218 88 C 218 98 218 108 217 116',
  'M 210 84 C 213 94 216 106 216 116',
  'M 217 116 C 214 119 210 120 210 120',
  // Lower back erectors
  'M 205 150 L 205 178',
  'M 215 150 L 215 178',
  'M 202 150 L 218 150',
  'M 203 178 L 217 178',
  // Glute centre line
  'M 210 188 L 210 222',
  // Left glute lower arc
  'M 191 222 C 196 231 203 235 210 235',
  // Right glute lower arc
  'M 229 222 C 224 231 217 235 210 235',
  // Left hamstring separation
  'M 196 230 C 196 247 196 263 197 276',
  'M 205 228 C 205 245 204 261 203 274',
  // Right hamstring separation
  'M 224 230 C 224 247 224 263 223 276',
  'M 215 228 C 215 245 216 261 217 274',
  // Left gastrocnemius
  'M 194 292 C 192 305 194 317 196 325',
  'M 203 290 C 202 303 201 315 200 323',
  // Right gastrocnemius
  'M 226 292 C 228 305 226 317 224 325',
  'M 217 290 C 218 303 219 315 220 323',
  // Left rear delt boundary
  'M 184 76 C 182 86 181 96 184 104',
  // Right rear delt boundary
  'M 236 76 C 238 86 239 96 236 104',
  // Left tricep
  'M 167 104 C 165 118 164 134 165 150',
  // Right tricep
  'M 253 104 C 255 118 256 134 255 150',
  // Neck lines
  'M 203 48 C 203 53 204 57 205 62',
  'M 217 48 C 217 53 216 57 215 62',
]

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

// ─── SVG figure ───────────────────────────────────────────────────────────────

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
  const vb = view === 'front' ? '0 0 140 334' : '140 0 140 334'
  // The single outline path is centred at x=70; translate +140 to position the back figure
  const outlineOffset = view === 'back' ? 140 : 0
  const detailLines = view === 'front' ? FRONT_LINES : BACK_LINES

  return (
    <svg viewBox={vb} width="100%" height="100%" style={{ maxHeight: '100%' }}>
      <HatchDef />

      {/* Anatomical silhouette — traced from body-reference.png */}
      <g
        transform={`translate(${outlineOffset},0)`}
        stroke="rgba(255,255,255,0.60)"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={BODY_OUTLINE} />
      </g>

      {/* Internal muscle-definition lines */}
      <g stroke="rgba(255,255,255,0.28)" strokeWidth="0.75" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {detailLines.map((d, i) => <path key={i} d={d} />)}
      </g>

      {/* Muscle-load heat overlays */}
      {visibleDefs.map(def => {
        const rec = recoveryMap[def.id]
        const isInjured = injuredMuscles.has(def.id)
        const load = rec?.load ?? 0
        if (load < 0.05 && !isInjured) return null
        const opacity = 0.15 + load * 0.62
        return (
          <g key={def.id} style={{ cursor: 'pointer' }} onClick={() => onMuscle(def.id)}>
            {load > 0.05 && renderShape(def, accentColor, opacity)}
            {isInjured && renderShape(def, 'url(#hatch-injury)', 1, '#ef4444')}
          </g>
        )
      })}

      {/* Transparent click targets for all muscle zones */}
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
          {injuredCount > 0 && <p className="text-xs text-red-400">{injuredCount} injur{injuredCount !== 1 ? 'ies' : 'y'}</p>}
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
