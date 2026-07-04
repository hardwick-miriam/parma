'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,          // 1 min — most health data changes infrequently
            gcTime: 5 * 60_000,         // 5 min cache retention
            refetchOnWindowFocus: false, // suppress redundant refetch on tab focus
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
