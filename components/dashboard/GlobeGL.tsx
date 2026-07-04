'use client'

import { useEffect, useRef, useState } from 'react'
import Globe from 'react-globe.gl'
import type { GlobeMethods } from 'react-globe.gl'

interface GlobeGLProps {
  visitedCountries: string[]
  compact: boolean
}

interface CountryFeature {
  type: string
  properties: { ISO_A3: string; NAME: string }
  geometry: unknown
}

const ACCENT = '#8b5cf6'
const GLOW = 'rgba(139,92,246,0.5)'
const BG = '#111113'
const OCEAN = '#1a1a24'
const BASE_LAND = '#2a2a36'

export default function GlobeGL({ visitedCountries, compact }: GlobeGLProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const [countries, setCountries] = useState<{ features: CountryFeature[] } | null>(null)
  const [size, setSize] = useState({ w: 300, h: 300 })
  const visitedSet = new Set(visitedCountries.map((c) => c.toUpperCase()))

  // Load GeoJSON
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
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

  // Auto-rotate
  useEffect(() => {
    if (!globeRef.current) return
    globeRef.current.controls().autoRotate = true
    globeRef.current.controls().autoRotateSpeed = compact ? 0.5 : 0.3
    globeRef.current.controls().enableZoom = !compact
  }, [compact, countries])

  // Point of view
  useEffect(() => {
    if (!globeRef.current) return
    globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: compact ? 2 : 1.8 }, 0)
  }, [compact])

  function countryColor(feat: object): string {
    const iso = (feat as CountryFeature).properties.ISO_A3?.toUpperCase()
    return visitedSet.has(iso) ? ACCENT : BASE_LAND
  }

  function countryAltitude(feat: object): number {
    const iso = (feat as CountryFeature).properties.ISO_A3?.toUpperCase()
    return visitedSet.has(iso) ? 0.008 : 0.001
  }

  return (
    <div ref={containerRef} className="absolute inset-0">
      <Globe
        ref={globeRef}
        width={size.w}
        height={size.h}
        backgroundColor={OCEAN}
        atmosphereColor={GLOW}
        atmosphereAltitude={0.12}
        globeImageUrl=""
        hexPolygonsData={countries?.features ?? []}
        hexPolygonColor={countryColor}
        hexPolygonAltitude={countryAltitude}
        hexPolygonMargin={0.3}
        hexPolygonResolution={3}
      />
    </div>
  )
}
