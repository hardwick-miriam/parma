import type { MuscleId } from './muscles'
import { resolveExercise, aggregateMuscleLoads } from './muscles'

export interface SessionLoad {
  date: string        // YYYY-MM-DD
  exercises: string[] // exercise names parsed from log
  whoopStrain?: number
  whoopRecovery?: number  // 0-100, affects decay speed
}

export interface SorenessEntry {
  muscleId: MuscleId
  loggedAt: string  // ISO string
  intensity: number // 1-10
}

export interface MuscleRecoveryState {
  muscleId: MuscleId
  load: number          // 0-1, current effective load
  hoursToFullRecovery: number
  sorenessPenalty: boolean
}

const BASE_RECOVERY_HOURS_HEAVY = 72  // full load → 72h
const BASE_RECOVERY_HOURS_LIGHT = 36  // minimal load → 36h

function recoveryWindowHours(peakLoad: number): number {
  return BASE_RECOVERY_HOURS_LIGHT + peakLoad * (BASE_RECOVERY_HOURS_HEAVY - BASE_RECOVERY_HOURS_LIGHT)
}

// WHOOP recovery score → decay multiplier
// High recovery (>80) = 1.25x faster decay; Low (<50) = 0.75x slower
function whoopDecayMultiplier(score: number | undefined): number {
  if (score === undefined) return 1.0
  if (score >= 80) return 1.25
  if (score >= 65) return 1.1
  if (score >= 50) return 1.0
  if (score >= 35) return 0.9
  return 0.75
}

export function computeMuscleRecovery(
  sessions: SessionLoad[],
  sorenessLogs: SorenessEntry[],
  whoopRecoveryHistory: Array<{ date: string; score: number }> = [],
  sorenessMultipliers: Partial<Record<MuscleId, number>> = {},
  nowMs = Date.now()
): Partial<Record<MuscleId, MuscleRecoveryState>> {
  const result: Partial<Record<MuscleId, MuscleRecoveryState>> = {}

  // Build daily WHOOP recovery map
  const recoveryByDate: Record<string, number> = {}
  for (const r of whoopRecoveryHistory) {
    recoveryByDate[r.date] = r.score
  }

  // Collect per-muscle peak loads with timestamps
  const peakByMuscle: Partial<Record<MuscleId, { peakLoad: number; peakMs: number; whoopDecay: number }>> = {}

  for (const session of sessions) {
    const sessionMs = new Date(session.date + 'T12:00:00').getTime()
    const loads = aggregateMuscleLoads(
      session.exercises.map(name => ({ name, whoopStrain: session.whoopStrain }))
    )
    const wd = recoveryByDate[session.date]
    const decayMult = whoopDecayMultiplier(wd)

    for (const [muscle, load] of Object.entries(loads) as Array<[MuscleId, number]>) {
      const existing = peakByMuscle[muscle]
      if (!existing || load > existing.peakLoad) {
        peakByMuscle[muscle] = { peakLoad: load, peakMs: sessionMs, whoopDecay: decayMult }
      }
    }
  }

  // Add soreness-boosted peaks for muscles that were sore but may not have been tracked
  const sorenessInfluence: Partial<Record<MuscleId, number>> = {}
  for (const entry of sorenessLogs) {
    const ageH = (nowMs - new Date(entry.loggedAt).getTime()) / 3_600_000
    if (ageH > 96) continue  // soreness data older than 4 days = irrelevant
    sorenessInfluence[entry.muscleId] = Math.max(
      sorenessInfluence[entry.muscleId] ?? 0,
      (entry.intensity / 10) * Math.max(0, 1 - ageH / 96)
    )
  }

  for (const [muscle, { peakLoad, peakMs, whoopDecay }] of Object.entries(peakByMuscle) as Array<[MuscleId, { peakLoad: number; peakMs: number; whoopDecay: number }]>) {
    const sorenessMultiplier = sorenessMultipliers[muscle] ?? 1.0
    const sorenessPenalty = (sorenessInfluence[muscle] ?? 0) > 0.3
    const effectiveMult = whoopDecay * (sorenessPenalty ? 1 / sorenessMultiplier : 1.0)

    const baseWindowH = recoveryWindowHours(peakLoad)
    const effectiveWindowH = baseWindowH / effectiveMult
    const elapsedH = (nowMs - peakMs) / 3_600_000
    const remaining = Math.max(0, effectiveWindowH - elapsedH)
    const load = remaining > 0 ? (remaining / effectiveWindowH) * peakLoad : 0

    if (load > 0.04) {
      result[muscle] = {
        muscleId: muscle,
        load,
        hoursToFullRecovery: remaining,
        sorenessPenalty,
      }
    }
  }

  // Add sore muscles that had no logged workout
  for (const [muscle, influence] of Object.entries(sorenessInfluence) as Array<[MuscleId, number]>) {
    if (result[muscle]) continue
    if (influence < 0.2) continue
    result[muscle] = {
      muscleId: muscle,
      load: influence * 0.6,
      hoursToFullRecovery: influence * 48,
      sorenessPenalty: true,
    }
  }

  return result
}
