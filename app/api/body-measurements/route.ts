import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLocalDate } from '@/lib/date'
import {
  getBodyMeasurements, insertBodyMeasurement, summariseBySite, toCm, MEASUREMENT_SITES,
} from '@/lib/db/bodyMeasurements'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const rows = await getBodyMeasurements(user.id, 365, supabase)
    return NextResponse.json({ sites: summariseBySite(rows) })
  } catch (err) {
    console.error('[body-measurements] GET error:', err)
    return NextResponse.json({ error: 'Failed to load body measurements' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body || !MEASUREMENT_SITES.includes(body.site) || typeof body.value !== 'number' || body.value <= 0) {
    return NextResponse.json({ error: 'site and a positive value are required' }, { status: 400 })
  }
  const unit = body.unit === 'inch' ? 'inch' : 'cm'

  try {
    const measurement = await insertBodyMeasurement(
      user.id,
      body.measured_on ?? getLocalDate(),
      body.site,
      toCm(body.value, unit),
      body.note,
      supabase
    )
    return NextResponse.json({ measurement })
  } catch (err) {
    console.error('[body-measurements] POST error:', err)
    return NextResponse.json({ error: 'Failed to save measurement' }, { status: 500 })
  }
}
