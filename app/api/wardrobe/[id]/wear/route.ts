import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLocalDate } from '@/lib/date'
import { logWear, removeWear } from '@/lib/db/wardrobe'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const wornOn = typeof body?.worn_on === 'string' ? body.worn_on : getLocalDate()

  try {
    await logWear(user.id, id, wornOn, supabase)
    return NextResponse.json({ ok: true, worn_on: wornOn })
  } catch (err) {
    console.error('[wardrobe/wear] failed:', err)
    return NextResponse.json({ error: 'Failed to log wear' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'date is required' }, { status: 400 })

  try {
    await removeWear(user.id, id, date, supabase)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[wardrobe/wear] delete failed:', err)
    return NextResponse.json({ error: 'Failed to remove wear' }, { status: 500 })
  }
}
