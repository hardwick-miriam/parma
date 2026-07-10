export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getUserPreferences } from '@/lib/db/preferences'
import { FoodClient } from '@/components/food/FoodClient'

export default async function FoodPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const prefs = await getUserPreferences(user.id).catch(() => null)

  return (
    <div className="max-w-3xl mx-auto">
      <FoodClient
        targets={{
          calorie_target: prefs?.calorie_target ?? 2000,
          protein_target_g: prefs?.protein_target_g ?? 150,
          carbs_target_g: prefs?.carbs_target_g ?? 250,
          fat_target_g: prefs?.fat_target_g ?? 70,
          fibre_target_g: prefs?.fibre_target_g ?? 30,
          sugar_target_g: prefs?.sugar_target_g ?? 90,
          salt_target_g: prefs?.salt_target_g ?? 6,
        }}
      />
    </div>
  )
}
