import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ParsedQuestionSchema, validateOrThrow, type ParsedQuestion } from '@/lib/schemas'
import { getLastDateAtWeight } from '@/lib/db/workoutSets'
import { getFoodLog } from '@/lib/db/food'
import { getHealthStatus } from '@/lib/db/queries'
import { getLocalDate } from '@/lib/date'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const QUESTION_TOOL: Anthropic.Tool = {
  name: 'parse_question',
  description: "Parse a natural-language question about the user's own health/fitness/food/sleep data into a structured query. Never answer the question yourself — only extract what's needed to run a real database query.",
  input_schema: {
    type: 'object',
    properties: {
      intent: {
        type: 'string',
        enum: ['exercise_threshold_date', 'rest_day_count', 'food_on_sick_day', 'metric_extreme', 'general_fallback'],
        description:
          '"exercise_threshold_date" — "when did I last squat 100kg", "last time I benched 80". ' +
          '"rest_day_count" — "how many rest days in March", "how many days off did I have last month". ' +
          '"food_on_sick_day" — "what did I eat the day I felt sick". ' +
          '"metric_extreme" — "highest recovery this month", "best sleep this week", "lowest steps in June". ' +
          '"general_fallback" — anything else this schema cannot represent.',
      },
      exercise: { type: 'string', description: 'Exercise name mentioned, e.g. "squat", "bench press", "deadlift".' },
      weight_kg: { type: 'number', description: 'Weight threshold in kg. Convert from lbs if stated (divide by 2.205).' },
      period_start: { type: 'string', description: 'YYYY-MM-DD start of the date range implied by the question, resolved using the date context given (e.g. "March" -> the most recent March 1st on/before today).' },
      period_end: { type: 'string', description: 'YYYY-MM-DD end of the date range implied by the question.' },
      metric: { type: 'string', enum: ['recovery_score', 'steps', 'sleep_hours', 'calories', 'weight_kg', 'strain', 'hrv'], description: 'Which metric "highest/lowest/best/worst" refers to.' },
      direction: { type: 'string', enum: ['max', 'min'], description: '"highest"/"best" -> max. "lowest"/"worst" -> min.' },
    },
    required: ['intent'],
    additionalProperties: false,
  },
}

export async function parseQuestion(text: string, today: string): Promise<ParsedQuestion> {
  const system =
    `Today is ${today}. Resolve relative date ranges ("this month", "last month", "in March", "this week", "this year") into explicit period_start/period_end YYYY-MM-DD values using today's date as the anchor. ` +
    `If a month name is given with no year, use the most recent occurrence of that month on or before today.`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    tool_choice: { type: 'tool', name: 'parse_question' },
    tools: [QUESTION_TOOL],
    system,
    messages: [{ role: 'user', content: text }],
  })

  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
  if (!toolUse) throw new Error('Claude did not return a tool_use block')
  return validateOrThrow(ParsedQuestionSchema, toolUse.input, 'parsed question')
}

function fmtDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const METRIC_TABLE: Record<NonNullable<ParsedQuestion['metric']>, { table: 'whoop_metrics' | 'daily_stats'; column: string; unit: string }> = {
  recovery_score: { table: 'whoop_metrics', column: 'recovery_score', unit: '%' },
  strain: { table: 'whoop_metrics', column: 'strain', unit: '' },
  hrv: { table: 'whoop_metrics', column: 'hrv_rmssd_milli', unit: 'ms' },
  steps: { table: 'daily_stats', column: 'steps', unit: 'steps' },
  sleep_hours: { table: 'daily_stats', column: 'sleep_hours', unit: 'h' },
  calories: { table: 'daily_stats', column: 'calories', unit: 'kcal' },
  weight_kg: { table: 'daily_stats', column: 'weight_kg', unit: 'kg' },
}

/** Executes the parsed intent as a real, targeted DB query and returns a plain-English answer — never sends raw rows to a model. */
export async function answerQuestion(userId: string, parsed: ParsedQuestion, supabase: SupabaseClient): Promise<string> {
  switch (parsed.intent) {
    case 'exercise_threshold_date': {
      if (!parsed.exercise || parsed.weight_kg == null) {
        return "I couldn't tell which exercise or weight you meant — try naming both, e.g. \"when did I last squat 100kg\"."
      }
      const result = await getLastDateAtWeight(userId, parsed.exercise, parsed.weight_kg, supabase)
      if (!result) return `I don't have a logged set of ${parsed.exercise} at ${parsed.weight_kg}kg or more.`
      return `You last did ${parsed.exercise} at ${result.weight}kg × ${result.reps} on ${fmtDate(result.date)}.`
    }

    case 'rest_day_count': {
      const start = parsed.period_start
      const end = parsed.period_end ?? getLocalDate()
      if (!start) return "I couldn't work out which date range you meant — try naming a month, e.g. \"how many rest days in March\"."
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('date')
        .eq('user_id', userId)
        .gte('date', start)
        .lte('date', end)
      if (error) throw error
      const trainedDates = new Set((data ?? []).map((d) => d.date))
      const totalDays = Math.round((new Date(end + 'T12:00:00Z').getTime() - new Date(start + 'T12:00:00Z').getTime()) / 86400000) + 1
      const restDays = Math.max(0, totalDays - trainedDates.size)
      return `You had ${restDays} rest day${restDays === 1 ? '' : 's'} out of ${totalDays} days (${trainedDates.size} training day${trainedDates.size === 1 ? '' : 's'}) between ${fmtDate(start)} and ${fmtDate(end)}.`
    }

    case 'food_on_sick_day': {
      const health = await getHealthStatus(userId, supabase).catch(() => null)
      if (!health?.sick || !health.sick_since) {
        return "You're not currently marked as sick, and I don't have a history of past sick days to check against."
      }
      const items = await getFoodLog(userId, health.sick_since, supabase)
      if (!items.length) return `You were marked sick from ${fmtDate(health.sick_since)}, but nothing was logged as eaten that day.`
      const list = items.map((i) => i.description).join(', ')
      const totalCal = items.reduce((s, i) => s + i.calories, 0)
      return `On ${fmtDate(health.sick_since)} (when you were marked sick) you logged: ${list} — ${totalCal} kcal total.`
    }

    case 'metric_extreme': {
      if (!parsed.metric) return "I couldn't tell which metric you meant — try naming one, e.g. \"highest recovery this month\"."
      const direction = parsed.direction ?? 'max'
      const start = parsed.period_start ?? getLocalDate().slice(0, 8) + '01'
      const end = parsed.period_end ?? getLocalDate()
      const { table, column, unit } = METRIC_TABLE[parsed.metric]

      const dateCol = table === 'whoop_metrics' ? 'date' : 'date'
      const { data, error } = await supabase
        .from(table)
        .select(`${dateCol}, ${column}`)
        .eq('user_id', userId)
        .gte(dateCol, start)
        .lte(dateCol, end)
        .not(column, 'is', null)
      if (error) throw error

      const rows = (data ?? []) as unknown as Record<string, string | number | null>[]
      if (!rows.length) return `I don't have any ${parsed.metric.replace('_', ' ')} data between ${fmtDate(start)} and ${fmtDate(end)}.`

      const best = rows.reduce((acc, row) => {
        const val = row[column] as number
        const accVal = acc[column] as number
        return direction === 'max' ? (val > accVal ? row : acc) : (val < accVal ? row : acc)
      })
      const label = parsed.metric.replace('_', ' ')
      const val = best[column]
      const valStr = typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(1)) : val
      return `Your ${direction === 'max' ? 'highest' : 'lowest'} ${label} between ${fmtDate(start)} and ${fmtDate(end)} was ${valStr}${unit} on ${fmtDate(String(best[dateCol]))}.`
    }

    case 'general_fallback':
    default:
      return "I don't have a way to answer that specific question yet — try asking about a specific exercise/weight, rest days in a date range, or your highest/lowest recovery, sleep, steps, calories, or weight in a period."
  }
}
