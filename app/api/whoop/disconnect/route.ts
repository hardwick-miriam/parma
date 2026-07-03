import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWhoopConnection, deleteWhoopConnection } from '@/lib/db/whoop'
import { REVOKE_URL } from '@/lib/whoop/client'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getWhoopConnection(user.id)
  if (conn) {
    // Best-effort token revocation
    try {
      await fetch(REVOKE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: conn.access_token,
          client_id: process.env.WHOOP_CLIENT_ID!,
          client_secret: process.env.WHOOP_CLIENT_SECRET!,
        }).toString(),
      })
    } catch {
      // Ignore revocation errors — still delete local record
    }
    await deleteWhoopConnection(user.id)
  }

  return NextResponse.json({ success: true })
}
