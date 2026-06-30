import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.OPENWEATHERMAP_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 503 })

  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat') ?? '43.1107'
  const lon = searchParams.get('lon') ?? '12.3908'

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`

  const res = await fetch(url, { cache: 'no-store' })
  const raw = await res.json()

  return NextResponse.json({
    request_url: url.replace(apiKey, '[HIDDEN]'),
    http_status: res.status,
    raw_response: raw,
    extracted: {
      name: raw.name,
      coord: raw.coord,
      'main.temp': raw.main?.temp,
      'main.feels_like': raw.main?.feels_like,
      'main.temp_min': raw.main?.temp_min,
      'main.temp_max': raw.main?.temp_max,
      'main.humidity': raw.main?.humidity,
      'weather[0].id': raw.weather?.[0]?.id,
      'weather[0].description': raw.weather?.[0]?.description,
      'weather[0].icon': raw.weather?.[0]?.icon,
      'wind.speed_ms': raw.wind?.speed,
      'wind.speed_kph': raw.wind?.speed != null ? Math.round(raw.wind.speed * 3.6) : null,
      dt: raw.dt,
      dt_human: raw.dt ? new Date(raw.dt * 1000).toISOString() : null,
    },
    widget_would_display: {
      temp: raw.main?.temp != null ? Math.round(raw.main.temp) : null,
      feelsLike: raw.main?.feels_like != null ? Math.round(raw.main.feels_like) : null,
    },
  })
}
