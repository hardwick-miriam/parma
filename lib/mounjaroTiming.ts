// Pure, client-safe cadence/due-date logic for Mounjaro timing intelligence
// (feature 6). No DB access — operates on already-fetched dose rows.

export interface DoseDate {
  taken_date: string
}

/** Median gap in days between consecutive doses — median (not mean) so one missed/doubled dose doesn't skew the detected cadence. */
export function detectCadenceDays(doses: DoseDate[]): number | null {
  if (doses.length < 2) return null
  const sorted = [...doses].sort((a, b) => a.taken_date.localeCompare(b.taken_date))
  const gaps: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const d1 = new Date(sorted[i - 1].taken_date + 'T12:00:00Z').getTime()
    const d2 = new Date(sorted[i].taken_date + 'T12:00:00Z').getTime()
    gaps.push(Math.round((d2 - d1) / 86400000))
  }
  const sortedGaps = [...gaps].sort((a, b) => a - b)
  const mid = Math.floor(sortedGaps.length / 2)
  return sortedGaps.length % 2
    ? sortedGaps[mid]
    : Math.round((sortedGaps[mid - 1] + sortedGaps[mid]) / 2)
}

/** Predicted next dose date = most recent dose + detected cadence. */
export function nextDueDate(doses: DoseDate[], cadenceDays: number | null): string | null {
  if (!doses.length || !cadenceDays) return null
  const sorted = [...doses].sort((a, b) => b.taken_date.localeCompare(a.taken_date))
  const d = new Date(sorted[0].taken_date + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + cadenceDays)
  return d.toISOString().slice(0, 10)
}

export interface DueStatus {
  cadenceDays: number | null
  nextDate: string | null
  due: 'today' | 'tomorrow' | 'overdue' | null
}

/** today/tomorrow in the given YYYY-MM-DD terms (caller passes getLocalDate() output). */
export function computeDueStatus(doses: DoseDate[], today: string): DueStatus {
  const cadenceDays = detectCadenceDays(doses)
  const nextDate = nextDueDate(doses, cadenceDays)
  if (!nextDate) return { cadenceDays, nextDate, due: null }

  const todayMs = new Date(today + 'T12:00:00Z').getTime()
  const nextMs = new Date(nextDate + 'T12:00:00Z').getTime()
  const diffDays = Math.round((nextMs - todayMs) / 86400000)

  const due = diffDays === 0 ? 'today' : diffDays === 1 ? 'tomorrow' : diffDays < 0 ? 'overdue' : null
  return { cadenceDays, nextDate, due }
}
