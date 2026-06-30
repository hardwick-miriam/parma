import type { DailyStats, HealthStatus } from './db/queries'

export interface RecoveryData {
  score: number
  level: 'poor' | 'fair' | 'good' | 'great'
  explanation: string
}

export function computeRecovery(
  stats: DailyStats | null,
  health: HealthStatus | null
): RecoveryData {
  if (!stats) {
    return { score: 50, level: 'fair', explanation: 'Log data today to see your readiness' }
  }

  // Sleep: 0-40 pts (8h = full score)
  const sh = stats.sleep_hours
  const sleepPts = sh != null ? Math.min(40, (Math.min(sh, 9) / 9) * 40) : 20

  // Mood: 0-25 pts
  const moodMap: Record<string, number> = { great: 25, good: 20, okay: 12, low: 5, bad: 0 }
  const moodPts = stats.mood ? (moodMap[stats.mood] ?? 12) : 12

  // Hydration: 0-20 pts (2L = full score)
  const hydraPts = Math.min(20, ((stats.water_ml ?? 0) / 2000) * 20)

  // Active logging bonus: 5 pts
  const activePts = stats.calories > 0 || stats.steps > 0 || (stats.water_ml ?? 0) > 0 ? 5 : 0

  let score = sleepPts + moodPts + hydraPts + activePts

  if (health?.sick) score -= 25
  if (health?.injured) score -= 10

  score = Math.round(Math.min(100, Math.max(0, score)))

  const level: RecoveryData['level'] =
    score >= 80 ? 'great' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor'

  const parts: string[] = []
  if (sh != null) {
    if (sh >= 8) parts.push(`${sh}h sleep`)
    else if (sh < 6) parts.push(`short sleep (${sh}h)`)
    else parts.push(`${sh}h sleep`)
  }
  if (stats.mood === 'great' || stats.mood === 'good') parts.push(`${stats.mood} mood`)
  else if (stats.mood === 'bad' || stats.mood === 'low') parts.push(`${stats.mood} mood`)
  const litres = (stats.water_ml ?? 0) / 1000
  if (litres >= 2) parts.push('well hydrated')
  else if (litres > 0 && litres < 1.5) parts.push(`${litres.toFixed(1)}L water`)
  if (health?.sick) parts.push('sick')
  if (health?.injured) parts.push('managing injury')

  const explanation =
    parts.length > 0
      ? parts.join(' · ')
      : level === 'great'
        ? 'All systems go'
        : 'Keep tracking to refine this'

  return { score, level, explanation }
}
