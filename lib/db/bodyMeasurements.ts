import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { type MeasurementSite } from '@/lib/bodyMeasurementTypes'

export { MEASUREMENT_SITES, toCm, type MeasurementSite } from '@/lib/bodyMeasurementTypes'

export interface BodyMeasurement {
  id: string
  user_id: string
  measured_on: string
  site: MeasurementSite
  value_cm: number
  note: string | null
  created_at: string
}

export async function insertBodyMeasurement(
  userId: string,
  measuredOn: string,
  site: MeasurementSite,
  valueCm: number,
  note?: string,
  client?: SupabaseClient
): Promise<BodyMeasurement> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from('body_measurements')
    .insert({ user_id: userId, measured_on: measuredOn, site, value_cm: valueCm, note: note ?? null })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function getBodyMeasurements(
  userId: string,
  days = 365,
  client?: SupabaseClient
): Promise<BodyMeasurement[]> {
  const supabase = client ?? (await createClient())
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('user_id', userId)
    .gte('measured_on', since)
    .order('measured_on', { ascending: true })
  if (error) throw error
  return data ?? []
}

export interface SiteSummary {
  site: MeasurementSite
  latest: number | null
  latestDate: string | null
  change30d: number | null
  change90d: number | null
  trend: { date: string; value_cm: number }[]
}

/** One summary per site actually logged — pure computation over already-fetched rows, no extra query. */
export function summariseBySite(rows: BodyMeasurement[]): SiteSummary[] {
  const bySite = new Map<MeasurementSite, BodyMeasurement[]>()
  for (const row of rows) {
    const list = bySite.get(row.site) ?? []
    list.push(row)
    bySite.set(row.site, list)
  }

  const now = Date.now()
  const summaries: SiteSummary[] = []
  for (const [site, entries] of bySite) {
    const sorted = [...entries].sort((a, b) => a.measured_on.localeCompare(b.measured_on))
    const latestEntry = sorted[sorted.length - 1]

    const findClosestBefore = (daysAgo: number) => {
      const cutoff = now - daysAgo * 24 * 60 * 60 * 1000
      const before = sorted.filter((e) => new Date(e.measured_on + 'T12:00:00Z').getTime() <= cutoff)
      return before.length ? before[before.length - 1] : null
    }
    const entry30 = findClosestBefore(30)
    const entry90 = findClosestBefore(90)

    summaries.push({
      site,
      latest: latestEntry.value_cm,
      latestDate: latestEntry.measured_on,
      change30d: entry30 ? Math.round((latestEntry.value_cm - entry30.value_cm) * 10) / 10 : null,
      change90d: entry90 ? Math.round((latestEntry.value_cm - entry90.value_cm) * 10) / 10 : null,
      trend: sorted.map((e) => ({ date: e.measured_on, value_cm: e.value_cm })),
    })
  }
  return summaries.sort((a, b) => a.site.localeCompare(b.site))
}
