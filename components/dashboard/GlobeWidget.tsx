'use client'

import { useEffect, useState, Suspense, lazy, useCallback } from 'react'
import { useGridItemSize } from './GridItemSizeContext'

interface GlobeWidgetProps {
  visitedCountries?: string[]
}

const GlobeGL = lazy(() => import('./GlobeGL'))

function StaticMapFallback({ count }: { count: number }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2">
      <span className="text-4xl">🗺️</span>
      <p className="text-sm text-text-muted">{count} {count === 1 ? 'country' : 'countries'} visited</p>
      <p className="text-xs text-text-subtle">WebGL not available</p>
    </div>
  )
}

export function GlobeWidget({ visitedCountries: initialCountries }: GlobeWidgetProps) {
  const { w, h } = useGridItemSize()
  const compact = w <= 2 || h <= 3
  const [webglOk, setWebglOk] = useState<boolean | null>(null)
  const [visitedCountries, setVisitedCountries] = useState<string[]>(initialCountries ?? [])

  useEffect(() => {
    if (initialCountries !== undefined) return
    fetch('/api/countries')
      .then((r) => r.json())
      .then((d) => { if (d.countries) setVisitedCountries(d.countries) })
      .catch(() => {})
  }, [initialCountries])

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      setWebglOk(!!gl)
    } catch {
      setWebglOk(false)
    }
  }, [])

  const handleToggle = useCallback((isoA3: string, nowVisited: boolean) => {
    // Optimistic update
    setVisitedCountries((prev) =>
      nowVisited
        ? [...prev.filter((c) => c !== isoA3), isoA3]
        : prev.filter((c) => c !== isoA3)
    )
    // Persist
    if (nowVisited) {
      fetch('/api/countries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes: [isoA3] }),
      }).catch(() => {
        // Revert on failure
        setVisitedCountries((prev) => prev.filter((c) => c !== isoA3))
      })
    } else {
      fetch(`/api/countries?code=${isoA3}`, { method: 'DELETE' }).catch(() => {
        setVisitedCountries((prev) => [...prev, isoA3])
      })
    }
  }, [])

  return (
    <div
      className="rounded-2xl bg-surface border border-border flex flex-col gap-2 h-full overflow-hidden"
      style={{ boxShadow: 'var(--shadow-md)' }}
    >
      <div className="flex items-center justify-between px-4 pt-4 shrink-0">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest">World</h2>
        <span className="text-xs text-text-subtle">{visitedCountries.length} countries</span>
      </div>

      <div className="flex-1 relative min-h-0">
        {webglOk === null ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <span className="text-xs text-text-muted">Loading…</span>
          </div>
        ) : webglOk ? (
          <Suspense fallback={<div className="flex-1 flex items-center justify-center h-full"><span className="text-xs text-text-muted">Loading globe…</span></div>}>
            <GlobeGL
              visitedCountries={visitedCountries}
              compact={compact}
              onToggle={handleToggle}
            />
          </Suspense>
        ) : (
          <StaticMapFallback count={visitedCountries.length} />
        )}
      </div>

      {!compact && (
        <p className="text-center text-[10px] text-text-subtle pb-2 shrink-0">Tap a country to toggle visited</p>
      )}
    </div>
  )
}
