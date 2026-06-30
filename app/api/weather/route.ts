import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const BASE = 'https://api.openweathermap.org/data/2.5'

function iconToEmoji(icon: string): string {
  const code = icon.slice(0, 2)
  const map: Record<string, string> = {
    '01': '☀️', '02': '⛅', '03': '☁️', '04': '☁️',
    '09': '🌧️', '10': '🌦️', '11': '⛈️', '13': '❄️', '50': '🌫️',
  }
  return map[code] ?? '🌤️'
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.OPENWEATHERMAP_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Weather not configured' }, { status: 503 })

  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 })
  }

  try {
    const [currentRes, forecastRes] = await Promise.all([
      fetch(`${BASE}/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`),
      fetch(`${BASE}/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&cnt=8`),
    ])

    if (!currentRes.ok || !forecastRes.ok) {
      return NextResponse.json({ error: 'Weather service unavailable' }, { status: 502 })
    }

    const current = await currentRes.json()
    const forecast = await forecastRes.json()

    const now = Math.floor(Date.now() / 1000)
    const periods = (forecast.list as Array<{
      dt: number
      main: { temp: number }
      weather: Array<{ description: string; icon: string }>
    }>)
      .filter((item) => item.dt > now)
      .slice(0, 3)
      .map((item) => ({
        dt: item.dt,
        temp: Math.round(item.main.temp),
        emoji: iconToEmoji(item.weather[0].icon),
        description: item.weather[0].description,
      }))

    return NextResponse.json(
      {
        location: current.name as string,
        temp: Math.round((current.main as { temp: number }).temp),
        feelsLike: Math.round((current.main as { feels_like: number }).feels_like),
        humidity: (current.main as { humidity: number }).humidity,
        description: (current.weather as Array<{ description: string }>)[0].description,
        emoji: iconToEmoji((current.weather as Array<{ icon: string }>)[0].icon),
        windKph: Math.round(((current.wind as { speed?: number })?.speed ?? 0) * 3.6),
        periods,
      },
      { headers: { 'Cache-Control': 'max-age=1800, s-maxage=1800' } }
    )
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
