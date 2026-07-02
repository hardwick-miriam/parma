// TEMPORARY DIAGNOSTIC ENDPOINT — remove after debugging
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()

  // 1. Who is the authenticated user?
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  const authResult = {
    userId: user?.id ?? null,
    email: user?.email ?? null,
    authError: authError ? { message: authError.message, status: authError.status } : null,
  }

  // 2. Can we SELECT from media_log?
  const { data: selectData, error: selectError } = await supabase
    .from('media_log')
    .select('id, category, title')
    .limit(3)

  const selectResult = {
    data: selectData,
    error: selectError
      ? { code: selectError.code, message: selectError.message, details: selectError.details, hint: selectError.hint }
      : null,
  }

  // 3. Try an INSERT (only if we have a real user id)
  let insertResult: Record<string, unknown> = { skipped: 'no authenticated user' }
  if (user?.id) {
    const payload = {
      user_id: user.id,
      category: 'film',
      title: '__debug_test__',
      rating: null,
      note: null,
      added_date: new Date().toISOString().split('T')[0],
    }
    const { data: insertData, error: insertError } = await supabase
      .from('media_log')
      .insert(payload)
      .select()
      .single()

    insertResult = {
      payload,
      data: insertData,
      error: insertError
        ? { code: insertError.code, message: insertError.message, details: insertError.details, hint: insertError.hint }
        : null,
      success: !insertError,
    }

    // Clean up the test row if insert succeeded
    if (!insertError && insertData?.id) {
      await supabase.from('media_log').delete().eq('id', insertData.id)
    }
  }

  return NextResponse.json({ auth: authResult, select: selectResult, insert: insertResult }, { status: 200 })
}
