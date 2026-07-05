'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Globe from 'react-globe.gl'
import type { GlobeMethods } from 'react-globe.gl'

interface GlobeGLProps {
  visitedCountries: string[]
  compact: boolean
  onToggle?: (isoA3: string, nowVisited: boolean) => void
}

interface CountryFeature {
  type: string
  properties: { ISO_A3: string; ADMIN: string; NAME?: string }
  geometry: unknown
}

const ACCENT = '#8b5cf6'
const ACCENT_SIDE = 'rgba(139,92,246,0.4)'
const OCEAN = '#111118'
const BASE_LAND = '#232330'
const BASE_SIDE = 'rgba(0,0,0,0.5)'
const HOVER_LAND = '#3a3a52'

export default function GlobeGL({ visitedCountries, compact, onToggle }: GlobeGLProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const [countries, setCountries] = useState<{ features: CountryFeature[] } | null>(null)
  const [size, setSize] = useState({ w: 300, h: 300 })
  const [hovered, setHovered] = useState<CountryFeature | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const visitedSet = new Set(visitedCountries.map((c) => c.toUpperCase()))

  // Load vendored GeoJSON
  useEffect(() => {
    fetch('/geo/world.geojson')
      .then((r) => r.json())
      .then(setCountries)
      .catch(() => {})
  }, [])

  // Track container size
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => {
      const e = entries[0]
      setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Globe settings after countries load
  useEffect(() => {
    if (!globeRef.current) return
    const ctrl = globeRef.current.controls()
    ctrl.autoRotate = true
    ctrl.autoRotateSpeed = compact ? 0.4 : 0.25
    ctrl.enableZoom = !compact
    ctrl.enableDamping = true
    ctrl.dampingFactor = 0.1
  }, [compact, countries])

  useEffect(() => {
    if (!globeRef.current) return
    globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: compact ? 2.1 : 1.8 }, 0)
  }, [compact])

  const getIso = useCallback((feat: object) =>
    (feat as CountryFeature).properties.ISO_A3?.toUpperCase() ?? '', [])

  const getName = useCallback((feat: object) =>
    (feat as CountryFeature).properties.ADMIN
    ?? (feat as CountryFeature).properties.NAME
    ?? (feat as CountryFeature).properties.ISO_A3
    ?? '?', [])

  function polygonColor(feat: object): string {
    const iso = getIso(feat)
    if (iso === hovered?.properties?.ISO_A3?.toUpperCase()) return HOVER_LAND
    return visitedSet.has(iso) ? ACCENT : BASE_LAND
  }

  function polygonSideColor(feat: object): string {
    const iso = getIso(feat)
    return visitedSet.has(iso) ? ACCENT_SIDE : BASE_SIDE
  }

  function polygonAltitude(feat: object): number {
    const iso = getIso(feat)
    return visitedSet.has(iso) ? 0.018 : 0.003
  }

  function handlePolygonClick(feat: object, _evt: MouseEvent) {
    const iso = getIso(feat)
    if (!iso || iso === '-99') return
    const nowVisited = !visitedSet.has(iso)
    onToggle?.(iso, nowVisited)
    // Pause autorotate briefly
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = false
      setTimeout(() => {
        if (globeRef.current) globeRef.current.controls().autoRotate = true
      }, 2000)
    }
  }

  function handlePolygonHover(feat: object | null, _prev: object | null) {
    setHovered(feat as CountryFeature | null)
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setTooltipPos({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 10 })
  }

  const label = useCallback((feat: object) => {
    const iso = getIso(feat)
    const name = getName(feat)
    const visited = visitedSet.has(iso)
    return `<div style="background:rgba(10,10,20,0.85);border:1px solid rgba(139,92,246,0.4);border-radius:6px;padding:4px 8px;font-size:11px;color:#fff;white-space:nowrap">${name}${visited ? ' ✓' : ''}</div>`
  }, [getIso, getName, visitedSet])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      onMouseMove={handleMouseMove}
    >
      <Globe
        ref={globeRef}
        width={size.w}
        height={size.h}
        backgroundColor={OCEAN}
        atmosphereColor="rgba(139,92,246,0.4)"
        atmosphereAltitude={0.15}
        globeImageUrl=""
        polygonsData={countries?.features ?? []}
        polygonCapColor={polygonColor}
        polygonSideColor={polygonSideColor}
        polygonStrokeColor={() => 'rgba(255,255,255,0.08)'}
        polygonAltitude={polygonAltitude}
        onPolygonClick={handlePolygonClick}
        onPolygonHover={handlePolygonHover}
        polygonLabel={label}
      />

      {/* Country name tooltip (desktop hover) */}
      {hovered && (
        <div
          className="pointer-events-none absolute text-[11px] text-white rounded-md px-2 py-1"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            background: 'rgba(10,10,20,0.9)',
            border: '1px solid rgba(139,92,246,0.4)',
            whiteSpace: 'nowrap',
            zIndex: 10,
          }}
        >
          {getName(hovered)}
          {visitedSet.has(getIso(hovered)) ? ' ✓' : ''}
        </div>
      )}
    </div>
  )
}
