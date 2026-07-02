'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const WATCHED_TABLES = [
  'daily_stats',
  'workouts',
  'log_entries',
  'health_status',
  'injuries',
  'journal_notes',
  'media_log',
  'progress_photos',
  'user_preferences',
]

export function RealtimeSync({ userId }: { userId: string }) {
  const router = useRouter()
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

      const handler = () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => router.refresh(), 500)
      }

      for (const table of WATCHED_TABLES) {
        channel = channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
          handler,
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
  }, [userId, router])

  return null
}
