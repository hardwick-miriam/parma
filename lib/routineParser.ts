import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface RoutineExercise {
  name: string
  sets?: number
  reps?: number
  notes?: string
}

export interface RoutineSession {
  day: string        // 'Monday' | 'Tuesday' | ... | 'Any'
  label?: string     // e.g. "Push", "Legs A"
  exercises: RoutineExercise[]
}

export interface ParsedRoutine {
  name: string
  sessions: RoutineSession[]
}

const PARSE_TOOL: Anthropic.Tool = {
  name: 'parse_workout_routine',
  description: 'Extract a structured workout routine from free text or a PDF dump',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'A short name for this routine, e.g. "Push/Pull/Legs" or "5-day split"' },
      sessions: {
        type: 'array',
        description: 'One entry per training day or session. If no specific days are given, use "Any".',
        items: {
          type: 'object',
          properties: {
            day: {
              type: 'string',
              description: 'Day of the week (Monday–Sunday) or "Any" if unspecified',
              enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Any'],
            },
            label: { type: 'string', description: 'Session label if present, e.g. "Push", "Chest day", "Upper A"' },
            exercises: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Exercise name, normalised (e.g. "bench press", "incline dumbbell press")' },
                  sets: { type: 'number', description: 'Number of sets, if stated' },
                  reps: { type: 'number', description: 'Reps per set (use the top end if a range is given, e.g. "8-12" → 12)' },
                  notes: { type: 'string', description: 'Any weight, tempo, or other notes' },
                },
                required: ['name'],
                additionalProperties: false,
              },
            },
          },
          required: ['day', 'exercises'],
          additionalProperties: false,
        },
      },
    },
    required: ['name', 'sessions'],
    additionalProperties: false,
  },
}

export async function parseRoutineText(text: string): Promise<ParsedRoutine> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    tool_choice: { type: 'tool', name: 'parse_workout_routine' },
    tools: [PARSE_TOOL],
    system: 'You are a fitness coach assistant. Extract structured workout routine data from the supplied text. Normalise exercise names to lowercase canonical form. If sets/reps are missing, omit the field rather than guessing.',
    messages: [{ role: 'user', content: text }],
  })

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
  )
  if (!toolUse) throw new Error('Claude did not return a tool_use block')
  return toolUse.input as ParsedRoutine
}

// Match a WHOOP workout to a routine session by weekday + sport fallback
export function matchRoutineSession(
  sessions: RoutineSession[],
  whoopDate: string,         // YYYY-MM-DD
  sportName?: string,        // from WHOOP sport_name
): RoutineSession | null {
  if (!sessions.length) return null
  const weekday = new Date(whoopDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long' })
  // Exact day match
  const dayMatch = sessions.find(s => s.day === weekday)
  if (dayMatch) return dayMatch
  // "Any" sessions — pick by sport/label hint
  const anySession = sessions.find(s => s.day === 'Any')
  if (anySession) return anySession
  // Fallback: first session (for single-day routines)
  if (sessions.length === 1) return sessions[0]
  return null
}
