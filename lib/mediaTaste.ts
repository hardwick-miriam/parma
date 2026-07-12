// Client-safe pure functions deriving favourites/taste-radar/breakdown from an
// already-loaded media_log entry list — no separate fetch, computed from
// whatever MediaWidget's ['media'] query already has cached.
import type { MediaEntry, MediaCategory } from '@/lib/db/media'

export interface FavouriteSlot {
  slot: 1 | 2 | 3
  entry: MediaEntry | null
  pinned: boolean
}

/** Top 3 for a category: pinned items keep their slot; remaining slots fill with the highest-rated (ties broken by most recent) unpinned items. */
export function computeFavourites(entries: MediaEntry[], category: MediaCategory): FavouriteSlot[] {
  const inCategory = entries.filter((e) => e.category === category)
  const pinned = inCategory.filter((e) => e.pinned_slot != null)
  const unpinned = inCategory
    .filter((e) => e.pinned_slot == null && e.rating != null)
    .sort((a, b) => (b.rating! - a.rating!) || b.added_date.localeCompare(a.added_date))

  const slots: FavouriteSlot[] = [1, 2, 3].map((slot) => {
    const pin = pinned.find((e) => e.pinned_slot === slot)
    return { slot: slot as 1 | 2 | 3, entry: pin ?? null, pinned: !!pin }
  })

  let candidateIdx = 0
  for (const s of slots) {
    if (s.entry) continue
    while (candidateIdx < unpinned.length && slots.some((x) => x.entry?.id === unpinned[candidateIdx].id)) candidateIdx++
    if (candidateIdx < unpinned.length) {
      s.entry = unpinned[candidateIdx]
      candidateIdx++
    }
  }
  return slots
}

export interface GenreRadarPoint {
  genre: string
  you: number // 0-100
  average: number // flat neutral baseline, since Parma has no other users' data to compare against
}

/** Rating-weighted preference per genre: average rating scaled by how much you've actually watched it
 * (sqrt of count, so one 10/10 doesn't out-rank a genre you've watched 15 times and rated consistently
 * well) — normalised to 0-100 against the strongest genre so the radar always uses the full scale. */
export function computeGenreRadar(entries: MediaEntry[], maxAxes = 6): GenreRadarPoint[] {
  const stats = new Map<string, { ratingSum: number; ratingCount: number; count: number }>()
  for (const e of entries) {
    for (const g of e.genres ?? []) {
      const s = stats.get(g) ?? { ratingSum: 0, ratingCount: 0, count: 0 }
      s.count++
      if (e.rating != null) { s.ratingSum += e.rating; s.ratingCount++ }
      stats.set(g, s)
    }
  }

  const scored = [...stats.entries()]
    .map(([genre, s]) => {
      const avgRating = s.ratingCount ? s.ratingSum / s.ratingCount : 0
      return { genre, count: s.count, rawScore: avgRating * Math.sqrt(s.count) }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, maxAxes)

  const maxRaw = Math.max(...scored.map((s) => s.rawScore), 1)
  return scored
    .map((s) => ({ genre: s.genre, you: Math.round((s.rawScore / maxRaw) * 100), average: 50 }))
    .sort((a, b) => a.genre.localeCompare(b.genre))
}

export interface MediaBreakdown {
  filmCount: number
  showCount: number
  ratedCount: number
  averageRating: number | null
  mostWatchedGenre: string | null
  thisYearCount: number
  ratingDistribution: { rating: number; count: number }[]
}

export function computeBreakdown(entries: MediaEntry[], year: string): MediaBreakdown {
  const filmCount = entries.filter((e) => e.category === 'film').length
  const showCount = entries.filter((e) => e.category === 'show').length
  const rated = entries.filter((e) => e.rating != null)
  const averageRating = rated.length ? rated.reduce((s, e) => s + (e.rating ?? 0), 0) / rated.length : null

  const genreCounts = new Map<string, number>()
  for (const e of entries) for (const g of e.genres ?? []) genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1)
  let mostWatchedGenre: string | null = null
  let maxCount = 0
  for (const [g, c] of genreCounts) if (c > maxCount) { maxCount = c; mostWatchedGenre = g }

  const thisYearCount = entries.filter((e) => e.added_date.startsWith(year)).length

  const distMap = new Map<number, number>()
  for (const e of rated) {
    const bucket = Math.round(e.rating!)
    distMap.set(bucket, (distMap.get(bucket) ?? 0) + 1)
  }
  const ratingDistribution = Array.from({ length: 10 }, (_, i) => ({ rating: i + 1, count: distMap.get(i + 1) ?? 0 }))

  return { filmCount, showCount, ratedCount: rated.length, averageRating, mostWatchedGenre, thisYearCount, ratingDistribution }
}
