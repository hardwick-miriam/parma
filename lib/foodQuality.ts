// Client-safe pure function — no server imports, so it can be used in the
// timeline UI as well as any future server-side aggregation.

export interface MacroTotals {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fibre_g: number
  sugar_g: number
  salt_g: number
}

export interface MacroTargets {
  calorie_target: number
  protein_target_g: number
  carbs_target_g: number
  fat_target_g: number
  fibre_target_g: number
  sugar_target_g: number
  salt_target_g: number
}

/**
 * A simple 0-100 "day quality" score: rewards hitting protein/fibre targets,
 * penalises exceeding sugar/salt targets. Not a medical score — a rough,
 * explainable glanceable signal for the day-quality ring.
 */
export function computeDayQuality(totals: MacroTotals, targets: MacroTargets): number {
  if (totals.calories === 0) return 0

  const proteinScore = Math.min(100, (totals.protein_g / Math.max(1, targets.protein_target_g)) * 100)
  const fibreScore = Math.min(100, (totals.fibre_g / Math.max(1, targets.fibre_target_g)) * 100)

  const sugarScore = totals.sugar_g <= targets.sugar_target_g
    ? 100
    : Math.max(0, 100 - ((totals.sugar_g - targets.sugar_target_g) / Math.max(1, targets.sugar_target_g)) * 100)

  const saltScore = totals.salt_g <= targets.salt_target_g
    ? 100
    : Math.max(0, 100 - ((totals.salt_g - targets.salt_target_g) / Math.max(1, targets.salt_target_g)) * 100)

  return Math.round((proteinScore + fibreScore + sugarScore + saltScore) / 4)
}
