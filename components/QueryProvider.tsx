'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,         // 1 min — most health data changes infrequently
            gcTime: 5 * 60_000,        // 5 min cache retention
            // Realtime (RealtimeSync + invalidateQueries) is the primary
            // live-update path and covers every published table instantly.
            // refetchOnWindowFocus is just the gentle fallback for anything
            // realtime genuinely can't reach (e.g. a change made while this
            // tab's websocket was disconnected) — it refetches in the
            // background only, never clears existing data, so it doesn't
            // introduce a flash of its own.
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      })
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

// Query keys — centralised to ensure invalidation targets are consistent
export const queryKeys = {
  routines: ['routines'] as const,
  soreness: ['soreness'] as const,
  insights: ['insights'] as const,
}
