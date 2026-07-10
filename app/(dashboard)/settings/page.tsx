export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getUserPreferences } from '@/lib/db/preferences'
import { getWhoopConnection } from '@/lib/db/whoop'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [prefs, whoopConn] = await Promise.all([
    getUserPreferences(user.id).catch(() => null),
    getWhoopConnection(user.id).catch(() => null),
  ])

  return (
    <div className="max-w-5xl mx-auto">
    <SettingsClient
      userId={user.id}
      currentEmail={user.email ?? ''}
      initialPrefs={{
        weightGoal: prefs?.weight_goal_kg ?? null,
        token: prefs?.shortcuts_token ?? null,
        savedPlaces: prefs?.saved_places ?? [],
        mounjaroEnabled: prefs?.mounjaro_enabled ?? false,
        weatherBgEnabled: prefs?.weather_bg_enabled ?? false,
      }}
      whoopConnection={whoopConn ? {
        displayName: whoopConn.whoop_display_name,
        lastSyncAt: whoopConn.last_sync_at,
      } : null}
    />
    </div>
  )
}
