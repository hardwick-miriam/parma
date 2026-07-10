import Fuse from 'fuse.js'

const TRIGGER_SPLIT = /\b(made me feel|made me|tasted|felt|note:)\b/i

/**
 * Lightweight NLP for food notes — no AI call (matches the wardrobe wear-log
 * pattern): splits "the chicken wrap made me feel sick" into a food-name
 * fragment and a note fragment, then fuzzy-matches the food fragment against
 * the user's known food descriptions via fuse.js.
 */
export function matchFoodNote(
  text: string,
  knownDescriptions: string[]
): { description: string; note: string } | null {
  const match = text.match(TRIGGER_SPLIT)
  if (!match || match.index == null) return null

  const foodFragment = text.slice(0, match.index).replace(/\bthe\b/gi, '').trim()
  const noteFragment = text.slice(match.index + match[0].length).trim()
  if (!foodFragment || !noteFragment) return null

  const fuse = new Fuse(knownDescriptions, { threshold: 0.4 })
  const best = fuse.search(foodFragment)[0]
  const description = best ? best.item : foodFragment

  return { description, note: noteFragment }
}
