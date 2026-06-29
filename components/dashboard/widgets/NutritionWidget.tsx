'use client'

import { CircularProgress } from '@/components/ui/CircularProgress'

interface NutritionWidgetProps {
  calories: number
  protein_g: number
  calorieTarget?: number
  proteinTarget?: number
}

export function NutritionWidget({
  calories,
  protein_g,
  calorieTarget = 2000,
  proteinTarget = 150,
}: NutritionWidgetProps) {
  return (
    <div className="rounded-2xl bg-surface p-6 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">
        Nutrition
      </h2>
      <div className="flex justify-around gap-4">
        <div className="flex flex-col items-center gap-2">
          <CircularProgress value={calories} max={calorieTarget} size={120} label="kcal" />
          <span className="text-xs text-text-muted">{calorieTarget} target</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <CircularProgress value={protein_g} max={proteinTarget} size={120} label="protein" unit="g" />
          <span className="text-xs text-text-muted">{proteinTarget}g target</span>
        </div>
      </div>
    </div>
  )
}
