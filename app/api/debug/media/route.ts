// TEMPORARY DIAGNOSTIC ENDPOINT — remove after debugging
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated', authError })
  }

  const today = new Date().toISOString().split('T')[0]
  const results: Record<string, unknown> = {}

  // 1. daily_stats columns — does weight_kg / supplements / habits_done exist?
  for (const col of ['calories', 'protein_g', 'steps', 'water_ml', 'mood', 'sleep_hours',
                      'weight_kg', 'supplements', 'habits_done', 'notes']) {
    const { error } = await supabase
      .from('daily_stats')
      .select(col)
      .eq('user_id', user.id)
      .limit(1)
    results[`daily_stats.${col}`] = error ? `MISSING: ${error.message}` : 'ok'
  }

  // 2. log_entries — does logged_at exist?
  for (const col of ['raw_text', 'parsed_json', 'date', 'logged_at', 'created_at']) {
    const { error } = await supabase
      .from('log_entries')
      .select(col)
      .eq('user_id', user.id)
      .limit(1)
    results[`log_entries.${col}`] = error ? `MISSING: ${error.message}` : 'ok'
  }

  // 3. user_preferences — does visited_countries / world_clocks exist?
  for (const col of ['weight_goal_kg', 'shortcuts_token', 'saved_places',
                      'mounjaro_enabled', 'visited_countries', 'world_clocks']) {
    const { error } = await supabase
      .from('user_preferences')
      .select(col)
      .eq('user_id', user.id)
      .limit(1)
    results[`user_preferences.${col}`] = error ? `MISSING: ${error.message}` : 'ok'
  }

  // 4. Simulate exactly what saveLog does for a media-only entry
  //    (upsertDailyStats + insertLogEntry in parallel, then insertMediaEntry)
  const fakeMedia = { category: 'film' as const, title: '__debug_movie__' }

  // Step A: upsertDailyStats (media-only entry sends all zeros)
  const { error: statsErr } = await supabase
    .from('daily_stats')
    .upsert(
      { user_id: user.id, date: today, calories: 0, protein_g: 0, steps: 0, water_ml: 0 },
      { onConflict: 'user_id,date' }
    )
  results['sim.upsertDailyStats'] = statsErr
    ? { code: statsErr.code, message: statsErr.message, details: statsErr.details }
    : 'ok'

  // Step B: insertLogEntry
  const { error: logErr } = await supabase
    .from('log_entries')
    .insert({
      user_id: user.id,
      raw_text: '__debug__',
      parsed_json: { media: [fakeMedia] },
      logged_at: new Date().toISOString(),
    })
  results['sim.insertLogEntry'] = logErr
    ? { code: logErr.code, message: logErr.message, details: logErr.details }
    : 'ok'

  // Step C: insertMediaEntry
  const { data: mediaData, error: mediaErr } = await supabase
    .from('media_log')
    .insert({ user_id: user.id, category: 'film', title: '__debug_movie__', rating: null, note: null, added_date: today })
    .select()
    .single()
  results['sim.insertMediaEntry'] = mediaErr
    ? { code: mediaErr.code, message: mediaErr.message, details: mediaErr.details }
    : 'ok'

  // Clean up debug rows
  if (!logErr) {
    await supabase.from('log_entries').delete().eq('raw_text', '__debug__').eq('user_id', user.id)
  }
  if (!mediaErr && mediaData?.id) {
    await supabase.from('media_log').delete().eq('id', mediaData.id)
  }

  return NextResponse.json({ userId: user.id, results })
}
