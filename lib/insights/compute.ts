import type { DailyStats } from '@/lib/db/queries'

export interface Insight {
  type: 'correlation' | 'trend' | 'consistency' | 'week_comparison'
  metric_a: string | null
  metric_b: string | null
  title: string
  body: string
  strength: number | null
}

const MIN_PAIRS = 14  // minimum paired data points for correlations
const MIN_TREND = 10  // minimum points for trend

type NumericKey = 'calories' | 'protein_g' | 'steps' | 'water_ml' | 'sleep_hours' | 'weight_kg'

const METRIC_LABELS: Record<string, string> = {
  calories: 'calories',
  protein_g: 'protein',
  steps: 'steps',
  water_ml: 'hydration',
  sleep_hours: 'sleep',
  weight_kg: 'weight',
  mood: 'mood',
  recovery_score: 'recovery',
  trained: 'training',
  days_since_dose: 'days since dose',
}

const MOOD_SCORE: Record<string, number> = {
  great: 5, good: 4, okay: 3, low: 2, bad: 1,
}

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

function linearSlope(ys: number[]): number {
  const n = ys.length
  if (n < 2) return 0
  const xs = Array.from({ length: n }, (_, i) => i)
  const mx = (n - 1) / 2
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    den += (xs[i] - mx) ** 2
  }
  return den === 0 ? 0 : num / den
}

function pairSeries(data: DailyStats[], keyA: NumericKey | 'mood', keyB: NumericKey | 'mood') {
  const pairs: [number, number][] = []
  for (const row of data) {
    const a = keyA === 'mood' ? MOOD_SCORE[row.mood ?? ''] : (row[keyA] as number | null)
    const b = keyB === 'mood' ? MOOD_SCORE[row.mood ?? ''] : (row[keyB] as number | null)
    if (a != null && a > 0 && b != null && b > 0) pairs.push([a, b])
  }
  return pairs
}

function correlationInsight(r: number, a: string, b: string): Insight {
  const la = METRIC_LABELS[a] ?? a
  const lb = METRIC_LABELS[b] ?? b
  const abs = Math.abs(r)
  const direction = r > 0 ? 'positively' : 'negatively'
  const strength = abs >= 0.6 ? 'strongly' : abs >= 0.4 ? 'moderately' : 'weakly'
  return {
    type: 'correlation',
    metric_a: a,
    metric_b: b,
    title: `${la[0].toUpperCase() + la.slice(1)} & ${lb} linked`,
    body: `Your ${la} and ${lb} are ${strength} ${direction} correlated (r=${r.toFixed(2)}). On days with higher ${la} you tend to have ${r > 0 ? 'higher' : 'lower'} ${lb}.`,
    strength: r,
  }
}

export function computeInsights(data: DailyStats[]): Insight[] {
  const insights: Insight[] = []
  if (data.length < MIN_TREND) return insights

  // --- Correlations ---
  const PAIRS: [NumericKey | 'mood', NumericKey | 'mood'][] = [
    ['sleep_hours', 'mood'],
    ['sleep_hours', 'steps'],
    ['sleep_hours', 'weight_kg'],
    ['calories', 'weight_kg'],
    ['calories', 'steps'],
    ['protein_g', 'weight_kg'],
    ['water_ml', 'mood'],
    ['steps', 'mood'],
  ]

  for (const [a, b] of PAIRS) {
    const pairs = pairSeries(data, a, b)
    if (pairs.length < MIN_PAIRS) continue
    const xs = pairs.map((p) => p[0])
    const ys = pairs.map((p) => p[1])
    const r = pearson(xs, ys)
    if (Math.abs(r) >= 0.3) {
      insights.push(correlationInsight(r, a as string, b as string))
    }
  }

  // --- Trends ---
  const TREND_METRICS: NumericKey[] = ['weight_kg', 'calories', 'steps', 'sleep_hours']
  for (const m of TREND_METRICS) {
    const vals = data
      .filter((d) => (d[m] as number | null) != null && (d[m] as number) > 0)
      .map((d) => d[m] as number)
    if (vals.length < MIN_TREND) continue
    const slope = linearSlope(vals)
    const label = METRIC_LABELS[m] ?? m
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length

    // Only surface if slope is meaningful relative to average
    const pctPerWeek = (slope * 7 / avg) * 100
    if (Math.abs(pctPerWeek) < 1) continue

    const dir = slope > 0 ? 'increasing' : 'decreasing'
    const absWeekly = Math.abs(slope * 7)
    const unit = m === 'water_ml' ? 'ml/week' : m === 'sleep_hours' ? 'min/week' : m === 'weight_kg' ? 'kg/week' : '/week'
    const weeklyStr = m === 'sleep_hours'
      ? `${(absWeekly * 60).toFixed(0)} min/week`
      : m === 'weight_kg'
      ? `${absWeekly.toFixed(2)} kg/week`
      : `${Math.round(absWeekly)} ${unit}`

    insights.push({
      type: 'trend',
      metric_a: m,
      metric_b: null,
      title: `${label[0].toUpperCase() + label.slice(1)} ${dir}`,
      body: `Your ${label} has been ${dir} by about ${weeklyStr} over the past ${vals.length} days.`,
      strength: slope,
    })
  }

  // --- Consistency ---
  const recent = data.slice(-30)
  if (recent.length >= 7) {
    for (const m of ['calories', 'steps', 'sleep_hours'] as NumericKey[]) {
      const logged = recent.filter((d) => (d[m] as number | null) != null && (d[m] as number) > 0).length
      const pct = Math.round((logged / recent.length) * 100)
      const label = METRIC_LABELS[m]
      if (pct >= 80) {
        insights.push({
          type: 'consistency',
          metric_a: m,
          metric_b: null,
          title: `Consistent ${label} logging`,
          body: `You've logged ${label} on ${pct}% of days in the past ${recent.length} days. Keep it up!`,
          strength: pct / 100,
        })
      }
    }
  }

  // --- Week comparison ---
  if (data.length >= 14) {
    const thisWeek = data.slice(-7)
    const lastWeek = data.slice(-14, -7)
    for (const m of ['calories', 'steps', 'sleep_hours'] as NumericKey[]) {
      const avg = (rows: DailyStats[]) => {
        const vals = rows.filter((d) => (d[m] as number | null) != null && (d[m] as number) > 0)
        if (!vals.length) return null
        return vals.reduce((sum, d) => sum + (d[m] as number), 0) / vals.length
      }
      const tw = avg(thisWeek)
      const lw = avg(lastWeek)
      if (tw == null || lw == null || lw === 0) continue
      const pctChange = ((tw - lw) / lw) * 100
      if (Math.abs(pctChange) < 5) continue
      const label = METRIC_LABELS[m]
      const dir = pctChange > 0 ? 'up' : 'down'
      const sign = pctChange > 0 ? '+' : ''
      insights.push({
        type: 'week_comparison',
        metric_a: m,
        metric_b: null,
        title: `${label[0].toUpperCase() + label.slice(1)} ${dir} this week`,
        body: `Your average ${label} is ${sign}${pctChange.toFixed(0)}% vs last week (${formatVal(tw, m)} vs ${formatVal(lw, m)}).`,
        strength: pctChange / 100,
      })
    }
  }

  return insights
}

export interface DailyRecoveryPoint {
  date: string
  recovery_score: number | null
}

/**
 * Mood correlations feature (22) — extends the same plain-stats engine with
 * signals that aren't on DailyStats itself (WHOOP recovery, whether the user
 * trained). Weather is deliberately NOT attempted here: there is no daily
 * weather-history table anywhere in the schema (app/api/weather is a live
 * fetch, nothing persisted per-day) — correlating against it would require
 * a new forward-collecting pipeline, out of scope for a pure-stats feature.
 */
export function computeMoodCorrelations(
  data: DailyStats[],
  whoopHistory: DailyRecoveryPoint[],
  trainedDates: Set<string>
): Insight[] {
  const insights: Insight[] = []
  if (data.length < MIN_TREND) return insights

  // mood vs recovery (joined by date — not on DailyStats itself)
  const whoopByDate = new Map(whoopHistory.map((w) => [w.date, w.recovery_score]))
  const recoveryPairs: [number, number][] = []
  for (const row of data) {
    const moodScore = MOOD_SCORE[row.mood ?? '']
    const recovery = whoopByDate.get(row.date)
    if (moodScore != null && moodScore > 0 && recovery != null && recovery > 0) {
      recoveryPairs.push([recovery, moodScore])
    }
  }
  if (recoveryPairs.length >= MIN_PAIRS) {
    const r = pearson(recoveryPairs.map((p) => p[0]), recoveryPairs.map((p) => p[1]))
    if (Math.abs(r) >= 0.3) insights.push(correlationInsight(r, 'recovery_score', 'mood'))
  }

  // mood vs protein/calories — same PAIRS mechanism, just not in the default list
  for (const key of ['protein_g', 'calories'] as const) {
    const pairs = pairSeries(data, key, 'mood')
    if (pairs.length < MIN_PAIRS) continue
    const r = pearson(pairs.map((p) => p[0]), pairs.map((p) => p[1]))
    if (Math.abs(r) >= 0.3) insights.push(correlationInsight(r, key, 'mood'))
  }

  // mood vs did/didn't train (point-biserial — same Pearson formula with a 0/1 series)
  const trainPairs: [number, number][] = []
  for (const row of data) {
    const moodScore = MOOD_SCORE[row.mood ?? '']
    if (moodScore == null || moodScore <= 0) continue
    trainPairs.push([trainedDates.has(row.date) ? 1 : 0, moodScore])
  }
  if (trainPairs.length >= MIN_PAIRS) {
    const xs = trainPairs.map((p) => p[0])
    const hasVariance = xs.some((x) => x !== xs[0])
    if (hasVariance) {
      const r = pearson(xs, trainPairs.map((p) => p[1]))
      if (Math.abs(r) >= 0.3) {
        const abs = Math.abs(r)
        const strength = abs >= 0.6 ? 'strongly' : abs >= 0.4 ? 'moderately' : 'weakly'
        insights.push({
          type: 'correlation',
          metric_a: 'trained',
          metric_b: 'mood',
          title: r > 0 ? 'Mood higher on training days' : 'Mood lower on training days',
          body: `Your mood is ${strength} ${r > 0 ? 'higher' : 'lower'} on days you train (r=${r.toFixed(2)}).`,
          strength: r,
        })
      }
    }
  }

  return insights
}

function formatVal(val: number, metric: string): string {
  if (metric === 'water_ml') return `${(val / 1000).toFixed(1)}L`
  if (metric === 'sleep_hours') return `${val.toFixed(1)}h`
  if (metric === 'weight_kg') return `${val.toFixed(1)}kg`
  return Math.round(val).toLocaleString()
}
