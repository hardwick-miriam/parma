import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider, ParsedLog, ParseContext } from '../types'

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
      injured: { type: 'boolean', description: 'True if the person is reporting a NEW injury they just sustained — not an update on an existing one and not a healed one.' },
      injury_description: { type: 'string', description: 'Full description of a new injury (e.g. "sprained ankle", "pulled hamstring")' },
      injury_body_part: { type: 'string', description: 'The specific body part of a new injury, isolated (e.g. "ankle", "hamstring", "wrist", "knee")' },
      injury_estimated_days: { type: 'number', description: 'Estimated days until recovery from a new injury, if mentioned' },
      notes: { type: 'string', description: 'Anything that does not fit another field' },
      mounjaro_dose_mg: {
        type: 'number',
        description: 'Mounjaro (tirzepatide) dose in mg if the user logged taking their injection. Common doses: 2.5, 5, 7.5, 10, 12.5, 15. E.g. "took my Mounjaro, 5mg" → 5',
      },
      mounjaro_feeling: {
        type: 'string',
        description: 'How the user felt after taking Mounjaro, if mentioned (e.g. "fine", "a bit nauseous", "great")',
      },
      mounjaro_side_effects: {
        type: 'object',
        description: 'Mounjaro side effects if the user describes them in the context of their medication. Use when they mention nausea, appetite, or energy changes in relation to Mounjaro.',
        properties: {
          nausea: { type: 'integer', description: 'Nausea severity 0-10 (0=none, 10=severe)' },
          appetite: { type: 'integer', description: 'Appetite level 0-10 (0=no appetite, 10=completely normal)' },
          energy: { type: 'integer', description: 'Energy level 0-10 (0=exhausted, 10=great)' },
          notes: { type: 'string' },
        },
        additionalProperties: false,
      },
      injury_checkin: {
        type: 'object',
        description: 'Use ONLY when the person gives a progress update on an existing injury — not a new injury and not when it is healed. E.g. "ankle is feeling 70% today after a walk".',
        properties: {
          body_part: { type: 'string', description: 'Body part affected, e.g. ankle, knee, shoulder, back' },
          feeling_pct: { type: 'number', description: 'How recovered the injury feels, 0–100 (0=worst ever, 100=fully healed). E.g. "felt 80%" → 80, "much better" → ~75, "still bad" → ~25' },
          activity: { type: 'string', description: 'Any activity done with the injured area, e.g. went for a walk, light jog, stretching' },
          notes: { type: 'string' },
        },
        required: ['feeling_pct'],
        additionalProperties: false,
      },
      injury_resolved: {
        type: 'object',
        description: 'Use when the person says an injury is fully healed, recovered, better, fixed, gone, or no longer bothering them. Examples: "my ankle\'s fully healed", "shoulder\'s better now", "wrist has recovered", "my sprained ankle is healed". Set body_part to the anatomical part that healed.',
        properties: {
          body_part: { type: 'string', description: 'The body part that has healed (e.g. "ankle", "wrist", "knee", "shoulder")' },
        },
        additionalProperties: false,
      },
    },
    additionalProperties: false,
  },
}

const BASE_SYSTEM =
  "You are a health data extraction assistant. Parse the user's natural-language log entry and extract every health and habit metric you can identify. Omit fields when the information is not present — do not guess. For water: convert to ml (1L=1000ml, 1 glass=250ml). For weight: convert to kg if given in lbs."

export class ClaudeProvider implements AIProvider {
  async parseLog(text: string, context?: ParseContext): Promise<ParsedLog> {
    let system = BASE_SYSTEM

    if (context?.activeInjuries?.length) {
      const list = context.activeInjuries
        .map((inj) => {
          const bp = inj.body_part ? ` (body part: ${inj.body_part})` : ''
          return `- "${inj.description}"${bp}`
        })
        .join('\n')

      system +=
        `\n\nThe user currently has these ACTIVE injuries:\n${list}\n\n` +
        `Injury rules:\n` +
        `• If the user says one of these injuries is healed/resolved/better/recovered/fine, set injury_resolved.body_part to the anatomical body part of the matching injury. ` +
        `Match flexibly — "my sprained ankle is healed" matches "sprained ankle" → body_part "ankle". ` +
        `"ankle's better" matches "sprained ankle" → body_part "ankle".\n` +
        `• If the user gives a recovery percentage or describes how an injury feels today (without saying it's fully healed), use injury_checkin.\n` +
        `• Only use injury_resolved when the injury is FULLY healed, not for partial improvement.`
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      tool_choice: { type: 'tool', name: 'parse_health_log' },
      tools: [PARSE_TOOL],
      system,
      messages: [{ role: 'user', content: text }],
    })

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )

    if (!toolUse) throw new Error('Claude did not return a tool_use block')

    return toolUse.input as ParsedLog
  }
}
