import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncWhoopUser } from '@/lib/whoop/sync'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await syncWhoopUser(user.id)
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ synced: result.synced })
}
