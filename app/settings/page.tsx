import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsPageClient from '@/components/settings/SettingsPageClient'
import type { UserSettings } from '@/types'

const DEFAULT_SETTINGS: Omit<UserSettings, 'user_id'> = {
  stack_style: 'Shuffled',
  pages_visible: 3,
  gap: 8,
  shadow_depth: 12,
  theme: 'default',
  accent_color: '#6b2737',
  editor_font: 'EB Garamond',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const initialSettings: UserSettings = settings ?? { user_id: user.id, ...DEFAULT_SETTINGS }

  return <SettingsPageClient userId={user.id} initialSettings={initialSettings} />
}
