'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Tables to watch — all have user_id column so we can filter server-side
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
    const supabase = createClient()

    // Single channel, multiple postgres_changes subscriptions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = supabase.channel(`parma-sync-${userId}`)

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

    channel.subscribe()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [userId, router])

  return null
}
