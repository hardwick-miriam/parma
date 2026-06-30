'use client'

import { useState, useEffect } from 'react'

interface WeatherData {
  location: string
  temp: number
  feelsLike: number
  humidity: number
  description: string
  emoji: string
  windKph: number
  periods: Array<{ dt: number; temp: number; emoji: string; description: string }>
}

// Module-level cache so navigating away and back doesn't re-fetch immediately
let _cache: { data: WeatherData; lat: string; lon: string; ts: number } | null = null
const CACHE_TTL = 30 * 60 * 1000

function formatPeriodTime(dt: number) {
  return new Date(dt * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
}

export function WeatherWidget() {
  const [data, setData] = useState<WeatherData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    function fetchWeather(lat: string, lon: string) {
      if (
        _cache &&
        _cache.lat === lat &&
        _cache.lon === lon &&
        Date.now() - _cache.ts < CACHE_TTL
      ) {
        if (!cancelled) {
          setData(_cache.data)
          setLoading(false)
        }
        return
      }

      fetch(`/api/weather?lat=${lat}&lon=${lon}`)
        .then((r) => r.json())
        .then((json) => {
          if (cancelled) return
          if (json.error) {
            setError(json.error === 'Weather not configured' ? 'No API key set' : json.error)
          } else {
            _cache = { data: json, lat, lon, ts: Date.now() }
            setData(json)
          }
          setLoading(false)
        })
        .catch(() => {
          if (!cancelled) {
            setError('Could not load weather')
            setLoading(false)
          }
        })
    }

    if (!navigator.geolocation) {
      setError('Geolocation unavailable')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(4)
        const lon = pos.coords.longitude.toFixed(4)
        fetchWeather(lat, lon)
      },
      () => {
        if (!cancelled) {
          setError('Location denied')
          setLoading(false)
        }
      },
      { timeout: 8000 }
    )

    return () => { cancelled = true }
  }, [])

  return (
    <div
      className="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-3 h-full"
      style={{ boxShadow: 'var(--shadow-md)' }}
    >
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Weather</h2>

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-text-subtle text-xs">Locating…</span>
        </div>
      )}

      {error && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-text-subtle text-xs text-center">{error}</span>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Current conditions */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-text tabular-nums">{data.temp}°</span>
                <span className="text-2xl leading-none">{data.emoji}</span>
              </div>
              <p className="text-xs text-text-muted mt-0.5 capitalize">{data.description}</p>
              <p className="text-[10px] text-text-subtle mt-0.5">{data.location}</p>
            </div>
          </div>

          {/* Details row */}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            <span className="text-[11px] text-text-subtle">Feels {data.feelsLike}°</span>
            <span className="text-[11px] text-text-subtle">{data.humidity}% humidity</span>
            {data.windKph > 0 && (
              <span className="text-[11px] text-text-subtle">{data.windKph} km/h</span>
            )}
          </div>

          {/* Forecast periods */}
          {data.periods.length > 0 && (
            <div className="grid grid-cols-3 gap-1 pt-1 border-t border-border">
              {data.periods.map((p) => (
                <div key={p.dt} className="flex flex-col items-center gap-0.5 py-1">
                  <span className="text-[10px] text-text-subtle tabular-nums">
                    {formatPeriodTime(p.dt)}
                  </span>
                  <span className="text-base leading-none">{p.emoji}</span>
                  <span className="text-xs font-medium text-text tabular-nums">{p.temp}°</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
