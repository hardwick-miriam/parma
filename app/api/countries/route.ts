import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('user_preferences')
    .select('visited_countries')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ countries: (data?.visited_countries as string[]) ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { codes } = await request.json() as { codes: string[] }
  if (!Array.isArray(codes) || codes.length === 0) {
    return NextResponse.json({ error: 'codes must be a non-empty array' }, { status: 400 })
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('user_preferences')
    .select('visited_countries')
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  const current: string[] = (existing?.visited_countries as string[]) ?? []
  const merged = [...new Set([...current, ...codes.map((c) => c.toUpperCase())])]

  const { error: upsertErr } = await supabase
    .from('user_preferences')
    .upsert({ user_id: user.id, visited_countries: merged, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  return NextResponse.json({ countries: merged })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')?.toUpperCase()
  if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 })

  const { data: existing, error: fetchErr } = await supabase
    .from('user_preferences')
    .select('visited_countries')
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  const current: string[] = (existing?.visited_countries as string[]) ?? []
  const updated = current.filter((c) => c !== code)

  const { error: upsertErr } = await supabase
    .from('user_preferences')
    .upsert({ user_id: user.id, visited_countries: updated, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  return NextResponse.json({ countries: updated })
}
