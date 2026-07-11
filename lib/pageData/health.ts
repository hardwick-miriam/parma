import {
  getTodayStats, getHealthStatus, getInjuriesWithCheckins, getResolvedInjuriesWithCheckins,
} from '@/lib/db/queries'
import { getDailyStatsHistory } from '@/lib/db/history'
import { getWhoopConnection, getLatestWhoopMetrics, getWhoopMetrics } from '@/lib/db/whoop'
import { getUserPreferences } from '@/lib/db/preferences'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Everything the Health page needs. Called from both the server page (first paint) and /api/health-summary (client refetch on realtime invalidation). */
export async function getHealthPageData(userId: string, supabase: SupabaseClient) {
  const whoopConn = await getWhoopConnection(userId).catch(() => null)
  const whoopConnected = !!whoopConn

  const [stats, health, injuries, pastInjuries, history, whoopToday, whoopHistory, prefs] = await Promise.all([
    getTodayStats(userId).catch(() => null),
    getHealthStatus(userId).catch(() => null),
    getInjuriesWithCheckins(userId).catch(() => []),
    getResolvedInjuriesWithCheckins(userId).catch(() => []),
    getDailyStatsHistory(userId, 60).catch(() => []),
    whoopConnected ? getLatestWhoopMetrics(userId).catch(() => null) : null,
    whoopConnected ? getWhoopMetrics(userId, 14).catch(() => []) : Promise.resolve([]),
    getUserPreferences(userId).catch(() => null),
  ])

  return {
    stats, health, injuries, pastInjuries, history, whoop: whoopToday, whoopHistory, whoopConnected,
    hiddenWidgets: prefs?.hidden_widgets ?? [],
    mounjaroEnabled: !!prefs?.mounjaro_enabled,
  }
}

export type HealthPageData = Awaited<ReturnType<typeof getHealthPageData>>
