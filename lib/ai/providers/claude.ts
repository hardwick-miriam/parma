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
      mood: { type: 'string', enum: ['great', 'good', 'okay', 'low', 'bad'] },
      water_ml: { type: 'number', description: 'Water intake in millilitres' },
      sleep_hours: { type: 'number', description: 'Hours of sleep last night' },
      supplements: { type: 'array', items: { type: 'string' } },
      notes: { type: 'string', description: 'Anything that does not fit another field' },
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
        'You are a health data extraction assistant. Parse the user\'s natural-language log entry and extract every health and habit metric you can identify. Omit fields when the information is not present — do not guess.',
      messages: [{ role: 'user', content: text }],
    })

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )

    if (!toolUse) throw new Error('Claude did not return a tool_use block')

    return toolUse.input as ParsedLog
  }
}
