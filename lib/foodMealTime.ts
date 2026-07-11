export type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export const MEAL_TIMES: MealTime[] = ['breakfast', 'lunch', 'dinner', 'snack']

export const MEAL_TIME_LABELS: Record<MealTime, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
}

/** Local (Europe/London) hour-of-day buckets, used only to group/display items that were never assigned a meal. */
export function inferMealTime(createdAt: string): MealTime {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: 'numeric', hour12: false }).format(new Date(createdAt))
  )
  if (hour < 11) return 'breakfast'
  if (hour < 15) return 'lunch'
  if (hour < 18) return 'snack'
  return 'dinner'
}
