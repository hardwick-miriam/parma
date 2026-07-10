import Fuse from 'fuse.js'

// Deliberately narrow: "log"/"add" are quick-add-shaped verbs. "had"/"ate"
// are excluded even though they're common in food logging — "had a chicken
// wrap for lunch" is a genuine one-off food description, not a request to
// re-add a saved meal, and must never be hijacked into logging the wrong
// (saved-meal) items instead of what was actually typed.
const QUICK_ADD_RE = /\b(log|add)\s+(my|the)\s+(.+)/i

/**
 * Zero-AI-cost quick-add matcher for the food chat bar: "log my usual
 * breakfast" -> fuzzy match "usual breakfast" against the user's saved meal
 * names (same pattern as wardrobe wear-logging and food-notes NLP-lite —
 * no LLM call, just fuse.js). Requires the explicit log/add + my/the phrasing
 * and a fairly close match, specifically to avoid mis-firing on ordinary
 * food descriptions that happen to share words with a saved meal's name.
 */
export function matchSavedMealQuickAdd(
  text: string,
  savedMealNames: string[]
): string | null {
  const m = text.match(QUICK_ADD_RE)
  if (!m) return null
  const query = m[3].trim()
  if (!query) return null

  const fuse = new Fuse(savedMealNames, { threshold: 0.3 })
  const best = fuse.search(query)[0]
  return best ? best.item : null
}
