import Fuse from 'fuse.js'
import { chronoParseDate } from '@/lib/chronoParse'
import { getLocalDate } from '@/lib/date'
import type { WardrobeItem } from '@/lib/db/wardrobe'

export interface WearLogMatch {
  fragment: string
  item: { id: string; name: string } | null
}

const WEAR_VERBS = /\b(wore|worn|wearing|had on|put on|rocking)\b/gi
const STOPWORDS = /\b(today|yesterday|this morning|this evening|last night)\b/gi

/**
 * Splits free text like "wore the grey hoodie and black cargos yesterday" into
 * candidate item phrases, fuzzy-matches each against the user's wardrobe (fuse.js,
 * no AI call — this is a pure client-cost-free match per CLAUDE.md rule 5), and
 * resolves the date via chrono-node (defaults to today).
 */
export function matchWearLog(
  text: string,
  items: Pick<WardrobeItem, 'id' | 'name' | 'brand' | 'colours' | 'tags'>[],
  tz: string = 'Europe/London'
): { date: string; matches: WearLogMatch[] } {
  const chrono = chronoParseDate(text, tz)
  const date = chrono.resolvedDate ?? getLocalDate(tz)

  const cleaned = text
    .replace(WEAR_VERBS, '')
    .replace(STOPWORDS, '')
    .replace(/\bthe\b/gi, '')
    .trim()

  const fragments = cleaned
    .split(/,| and /i)
    .map((f) => f.trim())
    .filter((f) => f.length > 1)

  if (!fragments.length) return { date, matches: [] }

  const corpus = items.map((i) => ({
    id: i.id,
    name: i.name,
    haystack: [i.name, i.brand ?? '', ...(i.colours ?? []), ...(i.tags ?? [])].join(' '),
  }))

  const fuse = new Fuse(corpus, {
    keys: ['name', 'haystack'],
    threshold: 0.4,
    includeScore: true,
  })

  const matches: WearLogMatch[] = fragments.map((fragment) => {
    const results = fuse.search(fragment)
    const best = results[0]
    if (!best) return { fragment, item: null }
    return { fragment, item: { id: best.item.id, name: best.item.name } }
  })

  return { date, matches }
}
