import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export interface CityConfig {
  name: string
  country: string
  lat: number
  lon: number
  timezone: string
}

async function geocodeCity(name: string): Promise<CityConfig | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) return null
  const data = await res.json()
  const r = data.results?.[0]
  if (!r) return null
  return {
    name: r.name as string,
    country: (r.country as string) ?? '',
    lat: r.latitude as number,
    lon: r.longitude as number,
    timezone: r.timezone as string,
  }
}

async function getCities(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_preferences')
    .select('world_clocks')
    .eq('user_id', userId)
    .maybeSingle()
  return (data?.world_clocks as CityConfig[]) ?? []
}

async function saveCities(userId: string, cities: CityConfig[]) {
  const supabase = await createClient()
  await supabase
    .from('user_preferences')
    .upsert({ user_id: userId, world_clocks: cities, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cities = await getCities(user.id)
  return NextResponse.json({ cities })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await request.json() as { name: string }
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const city = await geocodeCity(name.trim())
  if (!city) return NextResponse.json({ error: `City not found: ${name}` }, { status: 404 })

  const current = await getCities(user.id)
  if (current.some((c) => c.name.toLowerCase() === city.name.toLowerCase())) {
    return NextResponse.json({ cities: current }) // already exists
  }
  const updated = [...current, city]
  await saveCities(user.id, updated)
  return NextResponse.json({ cities: updated })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const name = new URL(request.url).searchParams.get('name')
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const current = await getCities(user.id)
  const updated = current.filter((c) => c.name !== name)
  await saveCities(user.id, updated)
  return NextResponse.json({ cities: updated })
}
