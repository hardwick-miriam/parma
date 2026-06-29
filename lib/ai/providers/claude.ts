import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider, ParsedLog } from '../types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PARSE_TOOL: Anthropic.Tool = {
  name: 'parse_health_log',
  description: 'Extract health and habit data from a natural language log entry',
  input_schema: {
    type: 'object',
    properties: {
      calories: { type: 'number', description: 'Total calories consumed' },
      protein_g: { type: 'number', description: 'Total protein in grams' },
      steps: { type: 'number', description: 'Step count' },
      workouts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            duration_minutes: { type: 'number' },
            feeling: { type: 'string', enum: ['great', 'good', 'okay', 'tired', 'rough'] },
            exercises: { type: 'array', items: { type: 'string' } },
          },
          required: ['description'],
          additionalProperties: false,
        },
      },
      mood: { type: 'string', enum: ['great', 'good', 'okay', 'low', 'bad'], description: 'Overall mood or feeling today' },
      water_ml: { type: 'number', description: 'Water intake in millilitres (1 glass ~250ml, 1 litre = 1000ml, 1 bottle ~500ml)' },
      sleep_hours: { type: 'number', description: 'Hours of sleep last night' },
      supplements: { type: 'array', items: { type: 'string' }, description: 'Supplements, vitamins, or medications taken (e.g. creatine, vitamin D, magnesium)' },
      weight_kg: { type: 'number', description: 'Body weight in kilograms (convert lbs: divide by 2.205)' },
      habits_done: {
        type: 'array',
        items: { type: 'string' },
        description: 'Habits or activities completed today. Use short canonical names like: shower, walk, exercise, meditate, journaling, saw friends, read, healthy meal, stretched, cold shower, no alcohol, no caffeine. Also include any other habits explicitly mentioned.',
      },
      sick: { type: 'boolean', description: 'True if the person is currently sick or ill. False if they explicitly say they have recovered.' },
      sick_estimated_days: { type: 'number', description: 'Estimated number of days the illness will last, if mentioned' },
      injured: { type: 'boolean', description: 'True if the person has a current injury. False if they say the injury is healed.' },
      injury_description: { type: 'string', description: 'Brief description of the injury (e.g. sprained ankle, sore knee)' },
      injury_estimated_days: { type: 'number', description: 'Estimated days until recovery from injury, if mentioned' },
      notes: { type: 'string', description: 'Anything that does not fit another field' },
      injury_checkin: {
        type: 'object',
        description: 'Use ONLY when the person describes how an existing injury feels today — not for reporting a brand-new injury. Extract check-in details.',
        properties: {
          body_part: { type: 'string', description: 'Body part affected, e.g. ankle, knee, shoulder, back' },
          feeling_pct: { type: 'number', description: 'How recovered the injury feels, 0–100 (0=worst ever, 100=fully healed). E.g. "felt 80%" → 80, "much better" → ~75, "still bad" → ~25' },
          activity: { type: 'string', description: 'Any activity done with the injured area, e.g. went for a walk, light jog, stretching' },
          notes: { type: 'string' },
        },
        required: ['feeling_pct'],
        additionalProperties: false,
      },
    },
    additionalProperties: false,
  },
}

export class ClaudeProvider implements AIProvider {
  async parseLog(text: string): Promise<ParsedLog> {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      tool_choice: { type: 'tool', name: 'parse_health_log' },
      tools: [PARSE_TOOL],
      system:
        'You are a health data extraction assistant. Parse the user\'s natural-language log entry and extract every health and habit metric you can identify. Omit fields when the information is not present — do not guess. For water: convert to ml (1L=1000ml, 1 glass=250ml). For weight: convert to kg if given in lbs.',
      messages: [{ role: 'user', content: text }],
    })

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )

    if (!toolUse) throw new Error('Claude did not return a tool_use block')

    return toolUse.input as ParsedLog
  }
}
