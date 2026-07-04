import Fuse from 'fuse.js'

export interface FuzzyItem {
  name: string
  [key: string]: unknown
}

export interface FuzzyMatch<T> {
  item: T
  score: number // 0 = perfect, 1 = no match
}

/**
 * Build a reusable Fuse instance for fuzzy name matching.
 * threshold 0.4: tolerant enough for typos like "skulcrushers" but not wild false matches.
 */
export function buildFuse<T extends FuzzyItem>(
  items: T[],
  keys: string[] = ['name'],
  threshold = 0.4,
): Fuse<T> {
  return new Fuse(items, {
    keys,
    threshold,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
  })
}

/** Return best match or null if nothing scores well enough */
export function fuzzyFind<T extends FuzzyItem>(
  fuse: Fuse<T>,
  query: string,
): T | null {
  if (!query?.trim()) return null
  const results = fuse.search(query.trim())
  if (!results.length) return null
  const best = results[0]
  if ((best.score ?? 1) > 0.4) return null
  return best.item
}

/** Return top-n matches */
export function fuzzyFindAll<T extends FuzzyItem>(
  fuse: Fuse<T>,
  query: string,
  limit = 5,
): T[] {
  if (!query?.trim()) return []
  return fuse.search(query.trim(), { limit }).map((r) => r.item)
}
