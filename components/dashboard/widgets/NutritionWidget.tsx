'use client'

import { CircularProgress } from '@/components/ui/CircularProgress'
import { StreakBadge } from '@/components/ui/StreakBadge'
import { ComparisonBadge } from '@/components/ui/ComparisonBadge'
import type { PeriodComparison } from '@/lib/comparison'

interface NutritionWidgetProps {
  calories: number
  protein_g: number
  calorieTarget?: number
  proteinTarget?: number
  proteinStreak?: number
  calorieComp?: PeriodComparison | null
  proteinComp?: PeriodComparison | null
}

export function NutritionWidget({
  calories,
  protein_g,
  calorieTarget = 2000,
  proteinTarget = 150,
  proteinStreak = 0,
  calorieComp,
  proteinComp,
}: NutritionWidgetProps) {
  return (
    <div className="rounded-2xl bg-surface border border-border p-6 flex flex-col gap-4 h-full" style={{ boxShadow: 'var(--shadow-md)' }}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Nutrition</h2>
        <StreakBadge count={proteinStreak} label="protein days" />
      </div>
      <div className="flex flex-col sm:flex-row justify-around gap-5 sm:gap-4">
        <div className="flex sm:flex-col items-center gap-4 sm:gap-2">
          <CircularProgress value={calories} max={calorieTarget} size={110} label="kcal" countUp />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-muted">{calorieTarget} target</span>
            {calorieComp && <ComparisonBadge change={calorieComp.change} />}
          </div>
        </div>
        <div className="flex sm:flex-col items-center gap-4 sm:gap-2">
          <CircularProgress value={protein_g} max={proteinTarget} size={110} label="protein" unit="g" countUp />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-muted">{proteinTarget}g target</span>
            {proteinComp && <ComparisonBadge change={proteinComp.change} />}
          </div>
        </div>
      </div>
    </div>
  )
}
