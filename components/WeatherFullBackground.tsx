'use client'

import { useEffect, useState } from 'react'
import { WeatherBackground, getCondition, type WeatherData } from './dashboard/widgets/WeatherWidget'

export function WeatherFullBackground() {
  const [data, setData] = useState<WeatherData | null>(null)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return
    let cancelled = false
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(4)
        const lon = pos.coords.longitude.toFixed(4)
        fetch(`/api/weather?lat=${lat}&lon=${lon}`)
          .then((r) => r.json())
          .then((json) => { if (!cancelled) setData(json) })
          .catch(() => {})
      },
      () => {},
      { timeout: 8000 }
    )
    return () => { cancelled = true }
  }, [])

  if (!data) return null

  const condition = getCondition(data.conditionCode, data.isDay)

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: -1 }}>
      {/* Weather animation fills the whole viewport */}
      <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: 0 }}>
        <WeatherBackground condition={condition} reduced={reduced} />
      </div>
      {/* Darkening overlay so dashboard widgets remain readable */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'none' }}
      />
    </div>
  )
}
