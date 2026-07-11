import type { Insight } from './compute'
import type { MounjaroDose, MounjaroEffect } from '@/lib/db/mounjaro'
import type { DailyRecoveryPoint } from './compute'

const MIN_PAIRS = 8 // Mounjaro doses are weekly-ish — 8 paired points is already ~2 months of data

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length
  if (n < 2) return 0
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0, dx2 = 0, dy2 = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my
    num += dx * dy; dx2 += dx * dx; dy2 += dy * dy
  }
  const denom = Math.sqrt(dx2 * dy2)
  return denom === 0 ? 0 : num / denom
}

/** For a given date, how many days since the most recent dose on/before it — null if no dose precedes it. */
function daysSinceDoseFor(date: string, sortedDoseDates: string[]): number | null {
  let mostRecent: string | null = null
  for (const d of sortedDoseDates) {
    if (d <= date) mostRecent = d
    else break
  }
  if (!mostRecent) return null
  const diff = (new Date(date + 'T12:00:00Z').getTime() - new Date(mostRecent + 'T12:00:00Z').getTime()) / 86400000
  return Math.round(diff)
}

/**
 * Mounjaro timing correlations (feature 6b) — plain stats, no AI. Correlates
 * days-since-most-recent-dose against recovery and against logged side
 * effects (nausea/energy/appetite). Cached in the same `insights` table as
 * mood correlations, same min-sample-size discipline.
 */
export function computeMounjaroCorrelations(
  doses: MounjaroDose[],
  whoopHistory: DailyRecoveryPoint[],
  effects: MounjaroEffect[]
): Insight[] {
  const insights: Insight[] = []
  if (doses.length < 2) return insights // need at least 2 doses to know "days since"

  const doseDates = [...doses.map((d) => d.taken_date)].sort()

  // Recovery vs days-since-dose
  const recoveryPairs: [number, number][] = []
  for (const w of whoopHistory) {
    if (w.recovery_score == null || w.recovery_score <= 0) continue
    const days = daysSinceDoseFor(w.date, doseDates)
    if (days == null || days > 13) continue // only within roughly one dose cycle
    recoveryPairs.push([days, w.recovery_score])
  }
  if (recoveryPairs.length >= MIN_PAIRS) {
    const r = pearson(recoveryPairs.map((p) => p[0]), recoveryPairs.map((p) => p[1]))
    if (Math.abs(r) >= 0.3) {
      // Also report the single best day (highest average recovery) for a concrete, readable finding.
      const byDay = new Map<number, number[]>()
      for (const [d, score] of recoveryPairs) byDay.set(d, [...(byDay.get(d) ?? []), score])
      let bestDay = 0, bestAvg = -1
      for (const [d, scores] of byDay) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length
        if (scores.length >= 2 && avg > bestAvg) { bestAvg = avg; bestDay = d }
      }
      const abs = Math.abs(r)
      const strength = abs >= 0.6 ? 'strongly' : abs >= 0.4 ? 'moderately' : 'weakly'
      insights.push({
        type: 'correlation',
        metric_a: 'days_since_dose',
        metric_b: 'recovery_score',
        title: 'Recovery pattern around your Mounjaro dose',
        body: bestAvg >= 0
          ? `Your recovery is ${strength} linked to days since your last dose — day ${bestDay} averages your highest recovery (${Math.round(bestAvg)}).`
          : `Your recovery is ${strength} ${r > 0 ? 'higher' : 'lower'} the further out you are from your last dose (r=${r.toFixed(2)}).`,
        strength: r,
      })
    }
  }

  // Side effects vs days-since-dose
  for (const key of ['nausea', 'appetite', 'energy'] as const) {
    const pairs: [number, number][] = []
    for (const e of effects) {
      const val = e[key]
      if (val == null) continue
      const days = daysSinceDoseFor(e.logged_date, doseDates)
      if (days == null || days > 13) continue
      pairs.push([days, val])
    }
    if (pairs.length < MIN_PAIRS) continue
    const r = pearson(pairs.map((p) => p[0]), pairs.map((p) => p[1]))
    if (Math.abs(r) < 0.3) continue
    const abs = Math.abs(r)
    const strength = abs >= 0.6 ? 'strongly' : abs >= 0.4 ? 'moderately' : 'weakly'
    const worseAtStart = r > 0 // value rises as days-since-dose increases -> was lower right after dose
    insights.push({
      type: 'correlation',
      metric_a: 'days_since_dose',
      metric_b: key,
      title: `${key[0].toUpperCase() + key.slice(1)} pattern by day-since-dose`,
      body: `Your ${key} is ${strength} linked to days since your last dose — ${worseAtStart ? 'lowest right after a dose, recovering over the following days' : 'highest right after a dose, easing off over the following days'} (r=${r.toFixed(2)}).`,
      strength: r,
    })
  }

  return insights
}
