// The ONE config spot for progressive-overload logic — change the rule here,
// nowhere else references how the next-set recommendation is computed.

export const PROGRESSION_CONFIG = {
  /** Rep range target: hit this many reps on the top set → recommend more weight next time. */
  topOfRepRange: 12,
  /** Bottom of the rep range to suggest after a weight increase. */
  bottomOfRepRange: 8,
  /** Weight to add when the last session hit the top of the rep range. */
  weightIncrementKg: 2.5,
}

export interface SetLike { weight: number; reps: number }

export interface Recommendation {
  weight: number
  reps: number
  reason: string
}

/**
 * Simple, transparent progressive overload: if last time's top set reached
 * the top of the rep range, recommend more weight for fewer reps; otherwise
 * recommend the same weight for one more rep than last time.
 */
export function recommendNextSet(lastTopSet: SetLike | null): Recommendation | null {
  if (!lastTopSet) return null

  const { topOfRepRange, bottomOfRepRange, weightIncrementKg } = PROGRESSION_CONFIG

  if (lastTopSet.reps >= topOfRepRange) {
    return {
      weight: Math.round((lastTopSet.weight + weightIncrementKg) * 10) / 10,
      reps: bottomOfRepRange,
      reason: `Hit ${lastTopSet.reps} reps last time (top of range) — try +${weightIncrementKg}kg for ${bottomOfRepRange}.`,
    }
  }

  return {
    weight: lastTopSet.weight,
    reps: lastTopSet.reps + 1,
    reason: `Last time: ${lastTopSet.weight}kg × ${lastTopSet.reps}. Try one more rep at the same weight.`,
  }
}
