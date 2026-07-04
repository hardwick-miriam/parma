import * as chrono from 'chrono-node'
import { getLocalDate } from './date'

const DEFAULT_TZ = 'Europe/London'

export interface ChronoResult {
  resolvedDate: string | null  // YYYY-MM-DD — the date the entry belongs to
  cleanText: string            // text with date expressions stripped (for shorter prompts)
}

/**
 * Pre-parse date expressions in the user's log text.
 * Returns the resolved calendar date and the original text (we don't strip —
 * stripping can mangle the log and we want the AI to see the full context).
 *
 * The resolved date is passed to the AI as ground truth so it doesn't have to guess.
 */
export function chronoParseDate(
  text: string,
  tz: string = DEFAULT_TZ,
  referenceDate?: Date,
): ChronoResult {
  const ref = referenceDate ?? new Date()
  const refStr = getLocalDate(tz, ref)

  // Use chrono-node casual parser with explicit reference date
  const results = chrono.casual.parse(text, { instant: ref, timezone: ianaToChronoOffset(tz, ref) })

  if (!results.length) {
    return { resolvedDate: null, cleanText: text }
  }

  // Take the most confident result (first is best)
  const best = results[0]
  const parsed = best.start.date()

  // Only use the result if it's in the past or today (not future scheduling)
  const parsedStr = formatDate(parsed)

  // Sanity check: reject dates more than 30 days in the future
  const refMs = ref.getTime()
  const parsedMs = parsed.getTime()
  const daysDiff = (parsedMs - refMs) / (1000 * 60 * 60 * 24)
  if (daysDiff > 1) {
    // Future date — probably not a log date, ignore
    return { resolvedDate: null, cleanText: text }
  }

  const resolvedDate = parsedStr !== refStr ? parsedStr : null

  if (resolvedDate) {
    console.log(`[chrono] resolved "${text.slice(0, 60)}" → ${resolvedDate} (ref: ${refStr})`)
  }

  return { resolvedDate, cleanText: text }
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * chrono-node accepts numeric UTC offsets (minutes) or IANA names in newer versions.
 * Fall back to numeric offset computed from the IANA timezone.
 */
function ianaToChronoOffset(tz: string, ref: Date): number {
  try {
    const offsetStr = new Intl.DateTimeFormat('en', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    }).formatToParts(ref).find(p => p.type === 'timeZoneName')?.value ?? 'UTC+0'
    // offsetStr like 'GMT+1' or 'GMT-5'
    const match = offsetStr.match(/([+-])(\d+)(?::(\d+))?/)
    if (!match) return 0
    const sign = match[1] === '-' ? -1 : 1
    const hours = parseInt(match[2], 10)
    const minutes = parseInt(match[3] ?? '0', 10)
    return sign * (hours * 60 + minutes)
  } catch {
    return 0
  }
}
