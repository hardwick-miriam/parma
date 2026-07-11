'use client'

import { useEffect, useState, Suspense, lazy, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const GlobeGL = lazy(() => import('@/components/dashboard/GlobeGL'))

function StaticMapFallback({ count }: { count: number }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 py-10">
      <span className="text-4xl">🗺️</span>
      <p className="text-sm text-text-muted">{count} {count === 1 ? 'country' : 'countries'} visited</p>
      <p className="text-xs text-text-subtle">WebGL not available on this device</p>
    </div>
  )
}

export function GlobeSection() {
  const queryClient = useQueryClient()
  const [webglOk, setWebglOk] = useState<boolean | null>(null)

  const countriesQuery = useQuery({
    queryKey: ['visited-countries'],
    queryFn: async () => {
      const res = await fetch('/api/countries')
      if (!res.ok) throw new Error('Failed to load visited countries')
      return res.json() as Promise<{ countries: string[] }>
    },
  })

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      setWebglOk(!!gl)
    } catch {
      setWebglOk(false)
    }
  }, [])

  const toggleMutation = useMutation({
    mutationFn: async ({ isoA3, nowVisited }: { isoA3: string; nowVisited: boolean }) => {
      if (nowVisited) {
        const res = await fetch('/api/countries', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codes: [isoA3] }),
        })
        if (!res.ok) throw new Error('Failed to save country')
      } else {
        const res = await fetch(`/api/countries?code=${isoA3}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to remove country')
      }
    },
    onMutate: async ({ isoA3, nowVisited }) => {
      await queryClient.cancelQueries({ queryKey: ['visited-countries'] })
      const previous = queryClient.getQueryData<{ countries: string[] }>(['visited-countries'])
      queryClient.setQueryData<{ countries: string[] }>(['visited-countries'], (old) => {
        const list = old?.countries ?? []
        return { countries: nowVisited ? [...list.filter((c) => c !== isoA3), isoA3] : list.filter((c) => c !== isoA3) }
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['visited-countries'], context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['visited-countries'] }),
  })

  const handleToggle = useCallback((isoA3: string, nowVisited: boolean) => {
    toggleMutation.mutate({ isoA3, nowVisited })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visitedCountries = countriesQuery.data?.countries ?? []

  return (
    <div
      className="rounded-2xl bg-surface border border-border flex flex-col gap-2 overflow-hidden"
      style={{ boxShadow: 'var(--shadow-md)', height: 360 }}
    >
      <div className="flex items-center justify-between px-4 pt-4 shrink-0">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest">World</h2>
        <span className="text-xs text-text-subtle">{visitedCountries.length} {visitedCountries.length === 1 ? 'country' : 'countries'}</span>
      </div>

      <div className="flex-1 relative min-h-0">
        {countriesQuery.isLoading || webglOk === null ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-text-muted">Loading…</span>
          </div>
        ) : countriesQuery.isError ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-negative">Couldn't load your visited countries.</span>
          </div>
        ) : webglOk ? (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><span className="text-xs text-text-muted">Loading globe…</span></div>}>
            <GlobeGL visitedCountries={visitedCountries} compact={false} onToggle={handleToggle} />
          </Suspense>
        ) : (
          <StaticMapFallback count={visitedCountries.length} />
        )}
      </div>

      {webglOk && !countriesQuery.isLoading && (
        <p className="text-center text-[10px] text-text-subtle pb-2 shrink-0">Tap a country to toggle visited</p>
      )}
    </div>
  )
}
