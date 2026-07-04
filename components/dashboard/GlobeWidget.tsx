'use client'

import { useEffect, useState, Suspense, lazy } from 'react'
import { useGridItemSize } from './GridItemSizeContext'

interface GlobeWidgetProps {
  visitedCountries?: string[] // ISO alpha-3 codes — if not passed, fetched from /api/countries
}

// Lazy-load the heavy WebGL globe
const GlobeGL = lazy(() => import('./GlobeGL'))

// Static SVG fallback (from original WorldMapWidget, simplified)
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
    if (initialCountries !== undefined) return // passed in — no fetch needed
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
            <GlobeGL visitedCountries={visitedCountries} compact={compact} />
          </Suspense>
        ) : (
          <StaticMapFallback count={visitedCountries.length} />
        )}
      </div>
    </div>
  )
}
