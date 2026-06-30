import type { DailyStats } from './db/queries'
import type { StreakData } from './streaks'

export interface Milestone {
  id: string
  title: string
  message: string
  emoji: string
}

const KEY = 'parma-seen-milestones'

function getSeen(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

export function dismissMilestone(id: string): void {
  const seen = getSeen()
  seen.add(id)
  localStorage.setItem(KEY, JSON.stringify([...seen]))
}

export function detectMilestones(
  today: DailyStats | null,
  history: DailyStats[],
  streaks: StreakData
): Milestone[] {
  const seen = getSeen()
  const out: Milestone[] = []

  function add(m: Milestone) {
    if (!seen.has(m.id)) out.push(m)
  }

  // Streak milestones
  for (const [key, count] of Object.entries(streaks) as [keyof StreakData, number][]) {
    if (count === 7) add({ id: `streak-${key}-7`, emoji: '🔥', title: '7-Day Streak!', message: `Seven days straight hitting your ${key} target.` })
    if (count === 14) add({ id: `streak-${key}-14`, emoji: '💪', title: '2-Week Streak!', message: `Fourteen days in a row on ${key}. Serious consistency.` })
    if (count === 30) add({ id: `streak-${key}-30`, emoji: '🏆', title: '30-Day Streak!', message: `Elite. 30 days straight hitting your ${key} target.` })
  }

  // Total days logged
  const logged = history.filter((d) => d.calories > 0 || d.steps > 0 || (d.water_ml ?? 0) > 0).length
  if (logged === 30) add({ id: 'days-30', emoji: '📊', title: '30 Days Tracked!', message: "A full month of data. You're building a picture of your health." })
  if (logged === 100) add({ id: 'days-100', emoji: '💯', title: '100 Days Tracked!', message: 'Triple digits. Genuinely rare commitment.' })

  if (!today) return out

  // New personal bests
  const weights = history.map((d) => d.weight_kg).filter((w): w is number => w !== null)
  if (today.weight_kg !== null && weights.length >= 3) {
    const prev = weights.slice(0, -1)
    if (today.weight_kg < Math.min(...prev)) {
      add({ id: `wt-low-${today.date}`, emoji: '📉', title: 'New Low Weight!', message: `${today.weight_kg.toFixed(1)} kg — your lowest recorded weight.` })
    }
  }

  const steps = history.map((d) => d.steps).filter((s) => s > 0)
  if (today.steps > 0 && steps.length >= 3) {
    const prev = steps.slice(0, -1)
    if (today.steps > Math.max(...prev)) {
      add({ id: `steps-high-${today.date}`, emoji: '🚶', title: 'Step Record!', message: `${today.steps.toLocaleString()} steps — your best day ever.` })
    }
  }

  // First 10k day
  const hadPrev10k = history.slice(0, -1).some((d) => d.steps >= 10_000)
  if (today.steps >= 10_000 && !hadPrev10k) {
    add({ id: 'first-10k', emoji: '🎯', title: 'First 10K Steps!', message: "You hit 10,000 steps for the first time. Keep going." })
  }

  return out
}
