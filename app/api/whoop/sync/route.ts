import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncWhoopUser } from '@/lib/whoop/sync'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let result: Awaited<ReturnType<typeof syncWhoopUser>>
  try {
    result = await syncWhoopUser(user.id)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected sync failure' },
      { status: 500 }
    )
  }

  if (result.error) {
    return NextResponse.json({ error: result.error, detail: result }, { status: 500 })
  }

  return NextResponse.json(result)
}
