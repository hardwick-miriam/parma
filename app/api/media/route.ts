import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMediaLog, deleteMediaEntry } from '@/lib/db/media'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entries = await getMediaLog(user.id).catch(() => [])
  return NextResponse.json({ entries })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  await deleteMediaEntry(user.id, id)
  return NextResponse.json({ ok: true })
}
