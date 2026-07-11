import type { SupabaseClient } from '@supabase/supabase-js'
import { getLocalDate } from '@/lib/date'
import {
  upsertDailyStats,
  upsertHealthStatus,
  insertWorkout,
  insertLogEntry,
  getActiveInjuries,
  createInjury,
  insertInjuryCheckin,
  resolveInjuryById,
} from '@/lib/db/queries'
import { insertMounjaroDose, upsertMounjaroEffects } from '@/lib/db/mounjaro'
import { insertMediaEntry } from '@/lib/db/media'
import { insertFoodItems } from '@/lib/db/food'
import { insertBodyMeasurement, toCm } from '@/lib/db/bodyMeasurements'
import { upsertLearningItem } from '@/lib/db/learningItems'
import { findAccountOrDebtByName, createFinanceAccount, updateFinanceAccount, updateFinanceDebt } from '@/lib/db/finances'
import { getOrCreateTodaySession, insertSet } from '@/lib/db/workoutSets'
import type { ParsedLog } from '@/lib/ai/types'
import type { Injury } from '@/lib/db/queries'

function matchInjury(activeInjuries: Injury[], target: string): Injury | undefined {
  const t = target.toLowerCase().trim()
  if (!t) return undefined

  // 1. Exact body_part match
  const exact = activeInjuries.find((inj) => inj.body_part?.toLowerCase() === t)
  if (exact) return exact

  // 2. body_part contained in target or vice-versa (only when body_part is set)
  const bpPartial = activeInjuries.find(
    (inj) =>
      inj.body_part &&
      (inj.body_part.toLowerCase().includes(t) || t.includes(inj.body_part.toLowerCase()))
  )
  if (bpPartial) return bpPartial

  // 3. description contains target word
  const descContains = activeInjuries.find((inj) =>
    inj.description.toLowerCase().includes(t)
  )
  if (descContains) return descContains

  // 4. Any word in target (>3 chars) appears in description
  const targetWords = t.split(/\s+/).filter((w) => w.length > 3)
  const wordMatch = activeInjuries.find((inj) =>
    targetWords.some((w) => inj.description.toLowerCase().includes(w))
  )
  return wordMatch
}

// Applies a validated ParsedLog to the database. Shared by app/actions.ts's
// saveLog (cookie-scoped client, normal dashboard logging) and
// /api/shortcuts/log (service-role client, token-authenticated Apple
// Shortcuts logging) so both entry points get identical field coverage —
// previously the Shortcuts route only handled about a third of the fields
// saveLog did (M17), silently dropping media/countries/world clocks/
// muscle soreness/injury updates when logged that way.
export async function applyParsedLog(
  userId: string,
  rawText: string,
  parsed: ParsedLog,
  supabase: SupabaseClient
): Promise<{ error?: string; entryId?: string }> {
  try {
    const logDate = parsed.log_date ?? undefined

    const [, entryId] = await Promise.all([
      upsertDailyStats(userId, {
        calories: parsed.calories,
        protein_g: parsed.protein_g,
        carbs_g: parsed.carbs_g,
        fat_g: parsed.fat_g,
        fibre_g: parsed.fibre_g,
        sugar_g: parsed.sugar_g,
        salt_g: parsed.salt_g,
        steps: parsed.steps,
        water_ml: parsed.water_ml,
        mood: parsed.mood,
        sleep_hours: parsed.sleep_hours,
        weight_kg: parsed.weight_kg,
        supplements: parsed.supplements,
        habits_done: parsed.habits_done,
        notes: parsed.notes,
      }, logDate, supabase),
      insertLogEntry(userId, rawText, parsed, logDate, supabase),
    ])

    if (parsed.foods?.length) {
      // F1: itemised breakdown alongside the aggregate total daily_stats
      // already received above — not a replacement for it.
      await insertFoodItems(userId, logDate ?? getLocalDate(), parsed.foods, entryId, supabase)
    }

    if (parsed.workouts?.length) {
      await Promise.all(parsed.workouts.map((w) => insertWorkout(userId, w, logDate, supabase)))
    }

    if (parsed.sick !== undefined) {
      await upsertHealthStatus(userId, {
        sick: parsed.sick,
        sick_estimated_days: parsed.sick_estimated_days,
      }, logDate, supabase)
    }

    if (parsed.injury_checkin) {
      const { body_part, feeling_pct, activity, notes } = parsed.injury_checkin
      const activeInjuries = await getActiveInjuries(userId, supabase)

      let matched = body_part
        ? matchInjury(activeInjuries, body_part)
        : activeInjuries[0]

      if (!matched) {
        // No existing injury found — create one from the check-in body part
        matched = await createInjury(userId, body_part ?? 'injury', body_part ?? null, null, supabase)
      }

      await insertInjuryCheckin(matched.id, userId, feeling_pct, activity ?? null, notes ?? null, logDate, supabase)
    }

    if (parsed.injured === true && !parsed.injury_checkin) {
      await upsertHealthStatus(userId, {
        injured: true,
        injury_description: parsed.injury_description,
        injury_estimated_days: parsed.injury_estimated_days,
      }, logDate, supabase)
      const activeInjuries = await getActiveInjuries(userId, supabase)
      const desc = parsed.injury_description ?? 'Injury'
      // Only create a new injury record if there isn't already one that matches
      const alreadyExists = matchInjury(activeInjuries, desc) != null
      if (!alreadyExists) {
        await createInjury(
          userId,
          desc,
          parsed.injury_body_part ?? null,  // now stores body_part explicitly
          parsed.injury_estimated_days ?? null,
          supabase
        )
      }
    }

    if (parsed.media?.length) {
      await Promise.all(parsed.media.map((m) => insertMediaEntry(userId, m, supabase)))
    }

    if (parsed.countries_visited?.length) {
      const newCodes = parsed.countries_visited.map((c) => c.toUpperCase())
      const { data: existing, error: countriesReadErr } = await supabase
        .from('user_preferences')
        .select('visited_countries')
        .eq('user_id', userId)
        .maybeSingle()
      if (countriesReadErr) throw new Error(`Failed to read visited countries: ${countriesReadErr.message}`)
      const current: string[] = (existing?.visited_countries as string[]) ?? []
      const merged = [...new Set([...current, ...newCodes])]
      const { error: countriesWriteErr } = await supabase
        .from('user_preferences')
        .upsert({ user_id: userId, visited_countries: merged, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      if (countriesWriteErr) throw new Error(`Failed to save visited countries: ${countriesWriteErr.message}`)
    }

    if (parsed.world_clock_cities?.length) {
      const { data: existingPrefs, error: clocksReadErr } = await supabase
        .from('user_preferences')
        .select('world_clocks')
        .eq('user_id', userId)
        .maybeSingle()
      if (clocksReadErr) throw new Error(`Failed to read world clocks: ${clocksReadErr.message}`)
      type CityConfig = { name: string; country: string; lat: number; lon: number; timezone: string }
      const currentClocks: CityConfig[] = (existingPrefs?.world_clocks as CityConfig[]) ?? []
      const added: CityConfig[] = []
      for (const cityName of parsed.world_clock_cities) {
        if (currentClocks.some((c) => c.name.toLowerCase() === cityName.toLowerCase())) continue
        try {
          const geoRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`,
          )
          const geoData = await geoRes.json()
          const r = geoData.results?.[0]
          if (!r) continue
          added.push({ name: r.name, country: r.country ?? '', lat: r.latitude, lon: r.longitude, timezone: r.timezone })
        } catch { /* skip unresolvable cities — geocoding failure, not a DB error */ }
      }
      if (added.length) {
        const merged = [...currentClocks, ...added]
        const { error: clocksWriteErr } = await supabase
          .from('user_preferences')
          .upsert({ user_id: userId, world_clocks: merged, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
        if (clocksWriteErr) throw new Error(`Failed to save world clocks: ${clocksWriteErr.message}`)
      }
    }

    if (parsed.mounjaro_dose_mg != null) {
      await insertMounjaroDose(userId, parsed.mounjaro_dose_mg, parsed.mounjaro_feeling ?? null, null, logDate, supabase)
    }

    if (parsed.mounjaro_side_effects) {
      await upsertMounjaroEffects(userId, parsed.mounjaro_side_effects, undefined, logDate, supabase)
    }

    if (parsed.body_measurements?.length) {
      for (const m of parsed.body_measurements) {
        await insertBodyMeasurement(userId, logDate ?? getLocalDate(), m.site, toCm(m.value, m.unit), m.note, supabase)
      }
    }

    if (parsed.learning_items?.length) {
      for (const item of parsed.learning_items) {
        await upsertLearningItem(userId, item, supabase)
      }
    }

    if (parsed.finance_updates?.length) {
      for (const upd of parsed.finance_updates) {
        if (upd.balance == null && upd.delta == null) continue // nothing actionable
        const match = await findAccountOrDebtByName(userId, upd.account_name, supabase)
        if (match) {
          const newBalance = upd.balance != null ? upd.balance : Number(match.row.balance) + (upd.delta ?? 0)
          if (match.kind === 'account') {
            await updateFinanceAccount(userId, match.row.id, { balance: newBalance }, supabase)
          } else {
            await updateFinanceDebt(userId, match.row.id, { balance: Math.max(0, newBalance) }, supabase)
          }
        } else if (upd.balance != null) {
          // No existing account/debt matches — a delta with nothing to apply
          // it to is meaningless, but a stated absolute balance is enough to
          // create a new cash account for it.
          await createFinanceAccount(userId, upd.account_name, 'cash', upd.balance, supabase)
        }
      }
    }

    if (parsed.logged_sets?.length) {
      // Routed through the exact same insertSet() the tap-first LiveLogger
      // uses — PR detection, the exercises[] append that feeds the muscle
      // map/training load, all identical regardless of entry path. PR
      // confetti itself stays a tap-path UI flourish (there's no natural
      // client-side moment to fire it from a background NLP save) — the
      // underlying personal_records data updates correctly either way.
      const sessionId = await getOrCreateTodaySession(userId, supabase, logDate)
      for (const s of parsed.logged_sets) {
        await insertSet(userId, sessionId, s.exercise, s.weight_kg, s.reps, !!s.is_warmup, supabase)
      }
    }

    if (parsed.muscle_soreness?.length) {
      const rows = parsed.muscle_soreness.map(s => ({
        user_id: userId,
        muscle_id: s.muscle_id,
        intensity: Math.min(10, Math.max(1, Math.round(s.intensity))),
        source: 'log',
      }))
      const { error: soreErr } = await supabase.from('muscle_soreness').insert(rows)
      if (soreErr) {
        console.error('applyParsedLog muscle_soreness insert error:', soreErr.code, soreErr.message)
        // Surface migration-missing errors as a visible warning rather than silently dropping
        if (soreErr.code === 'PGRST205' || soreErr.code === '42P01') {
          throw new Error(`muscle_soreness table missing — run migration 013 in the Supabase SQL editor. Details: ${soreErr.message}`)
        }
        throw new Error(`Failed to save muscle soreness: ${soreErr.message}`)
      }
      for (const row of rows) {
        const { data: ex, error: fetchErr } = await supabase
          .from('muscle_soreness_multipliers')
          .select('multiplier, reports')
          .eq('user_id', userId)
          .eq('muscle_id', row.muscle_id)
          .maybeSingle()
        if (fetchErr) {
          console.error('applyParsedLog multiplier fetch error:', fetchErr.message)
          continue
        }
        const nm = row.intensity / 5
        if (ex) {
          const { error: updErr } = await supabase
            .from('muscle_soreness_multipliers')
            .update({ multiplier: ex.multiplier * 0.6 + nm * 0.4, reports: ex.reports + 1, updated_at: new Date().toISOString() })
            .eq('user_id', userId).eq('muscle_id', row.muscle_id)
          if (updErr) console.error('applyParsedLog multiplier update error:', updErr.message)
        } else {
          const { error: insErr } = await supabase
            .from('muscle_soreness_multipliers')
            .insert({ user_id: userId, muscle_id: row.muscle_id, multiplier: nm, reports: 1 })
          if (insErr) console.error('applyParsedLog multiplier insert error:', insErr.message)
        }
      }
    }

    if (parsed.injury_resolved) {
      const { body_part } = parsed.injury_resolved
      const activeInjuries = await getActiveInjuries(userId, supabase)

      // If no active injuries, nothing to resolve
      if (activeInjuries.length === 0) {
        // No-op — injury may have already been resolved
      } else if (!body_part && activeInjuries.length > 1) {
        // Ambiguous — multiple active injuries, can't tell which one
        return {
          error: `You have ${activeInjuries.length} active injuries (${activeInjuries.map((i) => i.description).join(', ')}). Please say which one is healed, or use the "Mark as healed" button on the injury card.`,
        }
      } else {
        const matched = body_part
          ? (matchInjury(activeInjuries, body_part) ?? activeInjuries[0])
          : activeInjuries[0]

        await resolveInjuryById(userId, matched.id)
        const remaining = await getActiveInjuries(userId, supabase)
        if (remaining.length === 0) {
          await upsertHealthStatus(userId, { injured: false }, undefined, supabase)
        }
      }
    }

    return { entryId }
  } catch (err) {
    // PostgrestError is a plain object {code, message, details, hint}, not an Error instance
    const pg = err as Record<string, unknown>
    const msg =
      typeof pg?.message === 'string' ? `${pg.message}${pg.code ? ` (${pg.code})` : ''}` :
      err instanceof Error ? err.message :
      'Failed to save log'
    console.error('applyParsedLog error:', JSON.stringify(err))
    return { error: msg }
  }
}
