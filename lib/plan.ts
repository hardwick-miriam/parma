import { createClient } from '@/lib/supabase/server'
export type { Plan } from './plan-config'
export { FREE_LIMITS } from './plan-config'

export async function getUserPlan(userId: string): Promise<import('./plan-config').Plan> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at, banned')
    .eq('user_id', userId)
    .single()

  if (!data || data.banned || data.plan !== 'premium') return 'free'
  if (data.plan_expires_at && new Date(data.plan_expires_at) < new Date()) return 'free'
  return 'premium'
}
