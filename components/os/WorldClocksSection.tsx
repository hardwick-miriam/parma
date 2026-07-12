'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CityConfig } from '@/app/api/world-clocks/route'

// Module-level weather cache — survives re-renders
const weatherCache = new Map<string, { temp: number; emoji: string; fetchedAt: number }>()
const CACHE_TTL = 30 * 60 * 1000

function wmoEmoji(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 2) return '🌤️'
  if (code === 3) return '☁️'
  if (code <= 48) return '🌫️'
  if (code <= 55) return '🌦️'
  if (code <= 67) return '🌧️'
  if (code <= 77) return '❄️'
  if (code <= 82) return '🌦️'
  return '⛈️'
}

async function fetchWeather(lat: number, lon: number): Promise<{ temp: number; emoji: string }> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`
  const cached = weatherCache.get(key)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return { temp: cached.temp, emoji: cached.emoji }
  }
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&forecast_days=1&timezone=auto`
  const res = await fetch(url)
  const json = await res.json()
  const temp = Math.round(json.current.temperature_2m as number)
  const emoji = wmoEmoji(json.current.weather_code as number)
  weatherCache.set(key, { temp, emoji, fetchedAt: Date.now() })
  return { temp, emoji }
}

function cityTime(timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
}

function CityCard({ city, weather, tick, onRemove, removing }: {
  city: CityConfig
  weather: { temp: number; emoji: string } | null
  tick: number
  onRemove: (name: string) => void
  removing: boolean
}) {
  const [confirm, setConfirm] = useState(false)
  void tick

  return (
    <div
      className="shrink-0 flex flex-col justify-between rounded-xl px-3 py-3 relative group"
      style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', width: '120px', height: '136px' }}
    >
      {confirm ? (
        <div className="absolute top-1.5 right-1.5 flex gap-1 z-10">
          <button onClick={() => onRemove(city.name)} disabled={removing} className="text-[9px] bg-negative text-white px-1.5 py-0.5 rounded font-medium disabled:opacity-50">
            {removing ? '…' : 'Remove'}
          </button>
          <button onClick={() => setConfirm(false)} className="text-[9px] bg-surface text-text-muted px-1.5 py-0.5 rounded border border-border font-medium">✕</button>
        </div>
      ) : (
        <button
          onClick={() => setConfirm(true)}
          className="absolute top-1.5 right-1.5 w-4 h-4 rounded flex items-center justify-center text-text-subtle opacity-60 group-hover:opacity-100 transition-opacity text-xs"
          style={{ background: 'var(--surface)' }}
        >
          ×
        </button>
      )}

      <div>
        <p className="text-[10px] font-medium text-text-muted truncate pr-4">{city.name}</p>
        <p className="text-[9px] text-text-subtle truncate">{city.country}</p>
      </div>

      <div>
        <p className="text-3xl font-bold text-text tabular-nums leading-none">{cityTime(city.timezone)}</p>
      </div>

      <div className="flex items-center gap-1">
        {weather ? (
          <>
            <span className="text-base leading-none">{weather.emoji}</span>
            <span className="text-sm font-medium text-text-muted">{weather.temp}°</span>
          </>
        ) : (
          <span className="text-xs text-text-subtle">…</span>
        )}
      </div>
    </div>
  )
}

function ClocksSkeleton() {
  return (
    <div className="flex gap-3 px-4 pb-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="w-[120px] h-[136px] rounded-xl bg-surface-elevated animate-pulse shrink-0" />
      ))}
    </div>
  )
}

export function WorldClocksSection() {
  const queryClient = useQueryClient()
  const [weather, setWeather] = useState<Record<string, { temp: number; emoji: string }>>({})
  const [tick, setTick] = useState(0)
  const [adding, setAdding] = useState(false)
  const [input, setInput] = useState('')
  const [addError, setAddError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const citiesQuery = useQuery({
    queryKey: ['world-clocks'],
    queryFn: async () => {
      const res = await fetch('/api/world-clocks')
      if (!res.ok) throw new Error('Failed to load world clocks')
      return res.json() as Promise<{ cities: CityConfig[] }>
    },
  })
  const cities = citiesQuery.data?.cities ?? []

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/world-clocks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'City not found')
      return data.cities as CityConfig[]
    },
    onSuccess: (newCities) => {
      queryClient.setQueryData(['world-clocks'], { cities: newCities })
      setInput('')
      setAdding(false)
      setAddError('')
    },
    onError: (e) => setAddError(e instanceof Error ? e.message : 'City not found'),
  })

  const removeMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/world-clocks?name=${encodeURIComponent(name)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to remove city')
      return (await res.json()).cities as CityConfig[]
    },
    onSuccess: (newCities) => queryClient.setQueryData(['world-clocks'], { cities: newCities }),
  })

  // Update clock every 30s
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  // Fetch weather for all cities (30min cache)
  useEffect(() => {
    for (const city of cities) {
      const key = `${city.lat.toFixed(2)},${city.lon.toFixed(2)}`
      fetchWeather(city.lat, city.lon).then((w) => setWeather((prev) => ({ ...prev, [key]: w }))).catch(() => {})
    }
  }, [cities])

  useEffect(() => { if (adding) inputRef.current?.focus() }, [adding])

  const handleAdd = useCallback(() => {
    const name = input.trim()
    if (!name) return
    setAddError('')
    addMutation.mutate(name)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input])

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', minHeight: '180px' }}>
      <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest">World Clocks</h2>
        <button
          onClick={() => { setAdding(true); setAddError('') }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/15 text-accent text-xs font-medium hover:bg-accent/25 transition-colors"
        >
          + Add city
        </button>
      </div>

      {adding && (
        <div className="flex flex-col gap-1.5 px-4 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setInput('') } }}
              placeholder="City name (e.g. London, Tokyo)"
              className="flex-1 min-w-0 rounded-lg text-sm text-text placeholder:text-text-subtle px-3 py-1.5 focus:outline-none focus:border-border-strong transition-colors"
              style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
            />
            <button
              onClick={handleAdd}
              disabled={addMutation.isPending}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {addMutation.isPending ? '…' : 'Add'}
            </button>
            <button
              onClick={() => { setAdding(false); setInput(''); setAddError('') }}
              className="shrink-0 text-text-subtle hover:text-text text-sm transition-colors"
            >
              ✕
            </button>
          </div>
          {addError && <p className="text-[10px] text-negative">{addError}</p>}
        </div>
      )}

      {citiesQuery.isLoading ? (
        <ClocksSkeleton />
      ) : citiesQuery.isError ? (
        <p className="text-xs text-negative px-4 pb-4">Couldn't load your world clocks.</p>
      ) : cities.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center pb-4 gap-2 text-center px-4">
          <p className="text-sm text-text-subtle">No cities added yet.</p>
          <p className="text-xs text-text-subtle">Say "add London to my world clocks" or tap + Add city</p>
        </div>
      ) : (
        <div className="flex gap-3 px-4 pb-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {cities.map((city) => {
            const key = `${city.lat.toFixed(2)},${city.lon.toFixed(2)}`
            return (
              <CityCard
                key={city.name}
                city={city}
                weather={weather[key] ?? null}
                tick={tick}
                onRemove={(name) => removeMutation.mutate(name)}
                removing={removeMutation.isPending && removeMutation.variables === city.name}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
