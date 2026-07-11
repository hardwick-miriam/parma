'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { TABLE_QUERY_KEYS, WATCHED_TABLES } from '@/lib/realtimeInvalidation'

/**
 * Live data sync — a DB change from ANY source (this tab, another tab, the
 * mobile app, a WHOOP webhook) invalidates only the TanStack Query keys that
 * actually depend on the changed table. TanStack then refetches those queries
 * in the background and swaps the data in place once it resolves — the old
 * data stays on screen the whole time (no unmount, no blank/spinner flash),
 * and nothing NOT reading that data re-renders at all.
 *
 * This used to call router.refresh(), which re-fetches and re-renders the
 * ENTIRE current route's server-rendered payload for every change regardless
 * of which table fired — the visible "flash": every widget on the page
 * (even ones unrelated to what changed) went through a fetch/loading cycle
 * together, since Next has no way to invalidate just one piece of a Server
 * Component's props.
 */
export function RealtimeSync({ userId }: { userId: string }) {
  const queryClient = useQueryClient()
  const pendingTables = useRef<Set<string>>(new Set())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Guard: bail out if env vars aren't available in the browser bundle
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return

    let supabase: ReturnType<typeof createClient> | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null

    try {
      supabase = createClient()
      channel = supabase.channel(`parma-sync-${userId}`)

      function flush() {
        // Union of every affected query key across all tables that changed
        // within the debounce window, invalidated once (not once per table)
        // so a food log (which touches both food_log and daily_stats) only
        // triggers one refetch per query, not two.
        const keys = new Set<string>()
        for (const table of pendingTables.current) {
          for (const key of TABLE_QUERY_KEYS[table] ?? []) keys.add(key)
        }
        pendingTables.current.clear()
        for (const key of keys) {
          queryClient.invalidateQueries({ queryKey: [key] })
        }
      }

      const handler = (table: string) => {
        pendingTables.current.add(table)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(flush, 500)
      }

      for (const table of WATCHED_TABLES) {
        channel = channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
          () => handler(table),
        )
      }

      // Subscribe with an error callback so failures stay silent
      channel.subscribe((status: string, err?: Error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Realtime unavailable (tables not in publication, or network) — degrade gracefully
          void err
        }
      })
    } catch {
      // Initialisation failed (missing env vars, etc.) — degrade gracefully
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      try {
        if (supabase && channel) supabase.removeChannel(channel)
      } catch { /* ignore cleanup errors */ }
    }
  }, [userId, queryClient])

  return null
}
