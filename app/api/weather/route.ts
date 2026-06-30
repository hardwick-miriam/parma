import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// WMO weather code → emoji
function wmoEmoji(code: number, isDay: boolean): string {
  if (code === 0 || code === 1) return isDay ? '☀️' : '🌙'
  if (code === 2) return '⛅'
  if (code === 3) return '☁️'
  if (code === 45 || code === 48) return '🌫️'
  if (code >= 51 && code <= 57) return '🌦️'
  if (code >= 61 && code <= 67) return '🌧️'
  if (code >= 71 && code <= 77) return '❄️'
  if (code >= 80 && code <= 82) return '🌧️'
  if (code >= 85 && code <= 86) return '❄️'
  if (code >= 95) return '⛈️'
  return isDay ? '🌤️' : '🌙'
}

// WMO weather code → human description
function wmoDescription(code: number): string {
  if (code === 0) return 'clear sky'
  if (code === 1) return 'mainly clear'
  if (code === 2) return 'partly cloudy'
  if (code === 3) return 'overcast'
  if (code === 45) return 'fog'
  if (code === 48) return 'icy fog'
  if (code === 51) return 'light drizzle'
  if (code === 53) return 'moderate drizzle'
  if (code === 55) return 'dense drizzle'
  if (code === 56 || code === 57) return 'freezing drizzle'
  if (code === 61) return 'light rain'
  if (code === 63) return 'moderate rain'
  if (code === 65) return 'heavy rain'
  if (code === 66 || code === 67) return 'freezing rain'
  if (code === 71) return 'light snow'
  if (code === 73) return 'moderate snow'
  if (code === 75) return 'heavy snow'
  if (code === 77) return 'snow grains'
  if (code === 80) return 'light showers'
  if (code === 81) return 'moderate showers'
  if (code === 82) return 'heavy showers'
  if (code === 85) return 'snow showers'
  if (code === 86) return 'heavy snow showers'
  if (code === 95) return 'thunderstorm'
  if (code === 96 || code === 99) return 'thunderstorm with hail'
  return 'unknown'
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 })
  }

  try {
    const omUrl =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m` +
      `&hourly=temperature_2m,weather_code,is_day` +
      `&wind_speed_unit=kmh&timezone=auto&forecast_days=1`

    const geoUrl =
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`

    const [omRes, geoRes] = await Promise.all([
      fetch(omUrl, { cache: 'no-store' }),
      fetch(geoUrl, {
        cache: 'no-store',
        headers: { 'User-Agent': 'parma-health-tracker/1.0 (personal app)' },
      }),
    ])

    if (!omRes.ok) {
      return NextResponse.json({ error: 'Weather service unavailable' }, { status: 502 })
    }

    const om = await omRes.json()
    const geo = geoRes.ok ? await geoRes.json() : null

    const cur = om.current as {
      temperature_2m: number
      apparent_temperature: number
      relative_humidity_2m: number
      is_day: number
      weather_code: number
      wind_speed_10m: number
    }

    const isDay = cur.is_day === 1

    // Pick next 3 hourly slots after now
    const nowMs = Date.now()
    const hourlyTimes: string[] = om.hourly?.time ?? []
    const hourlyTemps: number[] = om.hourly?.temperature_2m ?? []
    const hourlyCodes: number[] = om.hourly?.weather_code ?? []
    const hourlyIsDay: number[] = om.hourly?.is_day ?? []

    const periods: Array<{ dt: number; temp: number; emoji: string; description: string }> = []
    for (let i = 0; i < hourlyTimes.length && periods.length < 3; i++) {
      const slotMs = new Date(hourlyTimes[i]).getTime()
      if (slotMs > nowMs) {
        periods.push({
          dt: Math.floor(slotMs / 1000),
          temp: Math.round(hourlyTemps[i]),
          emoji: wmoEmoji(hourlyCodes[i], hourlyIsDay[i] === 1),
          description: wmoDescription(hourlyCodes[i]),
        })
      }
    }

    // Best available location name from Nominatim reverse geocode
    const addr = geo?.address ?? {}
    const location: string =
      addr.city ?? addr.town ?? addr.village ?? addr.hamlet ?? addr.county ?? 'Your location'

    return NextResponse.json({
      location,
      temp: Math.round(cur.temperature_2m),
      feelsLike: Math.round(cur.apparent_temperature),
      humidity: Math.round(cur.relative_humidity_2m),
      description: wmoDescription(cur.weather_code),
      emoji: wmoEmoji(cur.weather_code, isDay),
      windKph: Math.round(cur.wind_speed_10m),
      conditionCode: cur.weather_code,
      isDay,
      periods,
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
