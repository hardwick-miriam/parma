'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Globe from 'react-globe.gl'
import type { GlobeMethods } from 'react-globe.gl'
import { useTheme, type Theme } from '@/components/ThemeProvider'

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

// Per-theme globe colour palette
const THEME_PALETTE: Record<Theme, {
  ocean: string
  baseLand: string
  baseSide: string
  accentLand: string
  accentSide: string
  hoverLand: string
  atmosphere: string
  tooltipBg: string
  tooltipBorder: string
}> = {
  normal:           { ocean: '#0d0d14', baseLand: '#1e1e2e', baseSide: 'rgba(0,0,0,0.5)',    accentLand: '#8b5cf6', accentSide: 'rgba(139,92,246,0.4)',  hoverLand: '#3a3a52', atmosphere: 'rgba(139,92,246,0.4)',  tooltipBg: 'rgba(10,10,20,0.88)',    tooltipBorder: 'rgba(139,92,246,0.5)' },
  hacker:           { ocean: '#010d01', baseLand: '#081208', baseSide: 'rgba(0,18,0,0.5)',    accentLand: '#00ff41', accentSide: 'rgba(0,255,65,0.35)',   hoverLand: '#0f2a0f', atmosphere: 'rgba(0,255,65,0.35)',   tooltipBg: 'rgba(0,10,0,0.88)',      tooltipBorder: 'rgba(0,255,65,0.5)' },
  brutalism:        { ocean: '#080808', baseLand: '#181818', baseSide: 'rgba(0,0,0,0.6)',    accentLand: '#e11d48', accentSide: 'rgba(225,29,72,0.4)',   hoverLand: '#282828', atmosphere: 'rgba(225,29,72,0.35)',  tooltipBg: 'rgba(8,8,8,0.9)',        tooltipBorder: 'rgba(225,29,72,0.6)' },
  'old-money':      { ocean: '#181208', baseLand: '#2a2010', baseSide: 'rgba(10,5,0,0.5)',   accentLand: '#c8a840', accentSide: 'rgba(200,168,64,0.4)',  hoverLand: '#3c3020', atmosphere: 'rgba(200,168,64,0.35)', tooltipBg: 'rgba(20,15,5,0.88)',     tooltipBorder: 'rgba(200,168,64,0.5)' },
  'dark-academia':  { ocean: '#120e08', baseLand: '#1e180e', baseSide: 'rgba(8,5,0,0.5)',    accentLand: '#b87a30', accentSide: 'rgba(184,122,48,0.4)',  hoverLand: '#2e2418', atmosphere: 'rgba(184,122,48,0.35)', tooltipBg: 'rgba(15,10,5,0.88)',     tooltipBorder: 'rgba(184,122,48,0.5)' },
  'midnight-ocean': { ocean: '#020610', baseLand: '#08162a', baseSide: 'rgba(0,8,20,0.5)',   accentLand: '#22d3ee', accentSide: 'rgba(34,211,238,0.4)',  hoverLand: '#102238', atmosphere: 'rgba(34,211,238,0.4)',  tooltipBg: 'rgba(2,6,18,0.88)',      tooltipBorder: 'rgba(34,211,238,0.5)' },
  synthwave:        { ocean: '#08001a', baseLand: '#12082a', baseSide: 'rgba(15,0,35,0.5)',  accentLand: '#e879f9', accentSide: 'rgba(232,121,249,0.4)', hoverLand: '#1e0a3a', atmosphere: 'rgba(232,121,249,0.45)', tooltipBg: 'rgba(8,0,20,0.88)',      tooltipBorder: 'rgba(232,121,249,0.5)' },
}

export default function GlobeGL({ visitedCountries, compact, onToggle }: GlobeGLProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const [countries, setCountries] = useState<{ features: CountryFeature[] } | null>(null)
  const [size, setSize] = useState({ w: 300, h: 300 })
  const [hovered, setHovered] = useState<CountryFeature | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const { theme } = useTheme()
  const pal = THEME_PALETTE[theme] ?? THEME_PALETTE.normal
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
    if (iso === hovered?.properties?.ISO_A3?.toUpperCase()) return pal.hoverLand
    return visitedSet.has(iso) ? pal.accentLand : pal.baseLand
  }

  function polygonSideColor(feat: object): string {
    const iso = getIso(feat)
    return visitedSet.has(iso) ? pal.accentSide : pal.baseSide
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
    return `<div style="background:${pal.tooltipBg};border:1px solid ${pal.tooltipBorder};border-radius:6px;padding:4px 8px;font-size:11px;color:#fff;white-space:nowrap">${name}${visited ? ' ✓' : ''}</div>`
  }, [getIso, getName, visitedSet, pal])

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
        backgroundColor={pal.ocean}
        atmosphereColor={pal.atmosphere}
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
            background: pal.tooltipBg,
            border: `1px solid ${pal.tooltipBorder}`,
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
