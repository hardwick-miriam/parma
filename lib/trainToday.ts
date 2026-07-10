import type { MuscleId } from './muscles'
import type { MuscleRecoveryState } from './muscleRecovery'

const REGION_MAP: Record<string, MuscleId[]> = {
  Chest: ['chest-l', 'chest-r'],
  Back: ['lats-l', 'lats-r', 'rhomboids', 'traps', 'lower-back'],
  Legs: ['quads-l', 'quads-r', 'hamstrings-l', 'hamstrings-r', 'glutes-l', 'glutes-r', 'calves-l', 'calves-r', 'calves-front-l', 'calves-front-r', 'adductors-l', 'adductors-r'],
  Shoulders: ['front-delts-l', 'front-delts-r', 'rear-delts-l', 'rear-delts-r'],
  Arms: ['biceps-l', 'biceps-r', 'triceps-l', 'triceps-r', 'forearms-l', 'forearms-r'],
  Core: ['abs-upper', 'abs-lower', 'obliques-l', 'obliques-r'],
}

/** Pure computation, no AI — freshest (most recovered) muscle region + today's planned routine session, as one line. */
export function trainTodayLine(
  recoveryMap: Partial<Record<MuscleId, MuscleRecoveryState>>,
  plannedSessionLabel?: string | null
): string {
  const regionLoads = Object.entries(REGION_MAP).map(([region, ids]) => {
    const hasData = ids.some((id) => recoveryMap[id] != null)
    const avgLoad = ids.reduce((sum, id) => sum + (recoveryMap[id]?.load ?? 0), 0) / ids.length
    return { region, avgLoad, hasData }
  })

  const trained = regionLoads.filter((r) => r.hasData)
  const freshest = trained.length
    ? trained.reduce((best, r) => (r.avgLoad < best.avgLoad ? r : best), trained[0])
    : null

  if (plannedSessionLabel && freshest) {
    return `Routine has "${plannedSessionLabel}" scheduled today — ${freshest.region.toLowerCase()} is also your freshest muscle group (${Math.round((1 - freshest.avgLoad) * 100)}% recovered).`
  }
  if (plannedSessionLabel) {
    return `Routine has "${plannedSessionLabel}" scheduled today.`
  }
  if (freshest) {
    return `${freshest.region} is your freshest muscle group today — ${Math.round((1 - freshest.avgLoad) * 100)}% recovered and ready to train.`
  }
  return 'No recent training data yet — log a session to get muscle-freshness recommendations.'
}
