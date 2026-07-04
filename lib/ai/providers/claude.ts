import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider, ParsedLog, ParseContext } from '../types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PARSE_TOOL: Anthropic.Tool = {
  name: 'parse_health_log',
  description: 'Extract health and habit data from a natural language log entry',
  input_schema: {
    type: 'object',
    properties: {
      calories: {
        type: 'number',
        description: 'Total calories consumed. Whenever ANY food or drink with calories is mentioned, you MUST estimate this using nutritional knowledge — even for vague descriptions. Never omit when food was clearly eaten.',
      },
      protein_g: {
        type: 'number',
        description: 'Total protein in grams. Whenever ANY food is mentioned, you MUST estimate this alongside calories — never leave it absent if food was eaten. Use nutritional knowledge: ham pizza slice ~20g, chicken breast ~30g, eggs 6g each, oats ~5g per serving. Best-estimate is always better than 0 or omitting.',
      },
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
      weight_kg: { type: 'number', description: 'Body weight in kilograms. Set this whenever the user states their current weight — e.g. "I weigh 85kg" → 85, "weighed 74.5 this morning" → 74.5, "weighed in at 163 lbs" → convert (divide by 2.205). Never omit when a weight measurement is clearly stated.' },
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
      countries_visited: {
        type: 'array',
        description: 'ISO 3166-1 alpha-3 country codes for countries the person mentions having visited or traveled to. E.g. "I\'ve been to Japan and Italy" → ["JPN","ITA"]. "add France" → ["FRA"]. "visited New York" → [] (city, not country). Map sub-national regions to their sovereign country: England/Scotland/Wales/Northern Ireland → GBR, Catalonia → ESP, Bavaria → DEU, Bali → IDN, Hong Kong/Macau → CHN, Siberia → RUS, Patagonia → ARG. Use the sovereign state ISO code, never invent codes. Only use when visiting/traveling is explicitly mentioned.',
        items: { type: 'string', description: 'ISO alpha-3 code, e.g. FRA, JPN, USA, GBR, ITA, DEU, ESP, AUS, IRL, NLD, BEL, CHE, PRT, GRC, TUR, THA, VNM, KOR, MEX, BRA, ZAF, EGY, MAR' },
      },
      world_clock_cities: {
        type: 'array',
        description: 'City names to add to the world clocks widget. Use when the user says "add [city] to my world clocks", "show me [city] time", "track the time in [city]", "add [city] as a clock". E.g. "add London and Tokyo to my clocks" → ["London","Tokyo"]. Only use when the user explicitly wants to track a city\'s time.',
        items: { type: 'string', description: 'City name in English, e.g. London, Tokyo, New York, Paris, Sydney' },
      },
      notes: { type: 'string', description: 'Anything that does not fit another field — unless it fits media, in which case use media' },
      media: {
        type: 'array',
        description: 'Books read/watching/wanting to read, films/shows watched/watching/to watch, or songs listened to. E.g. "watched Oppenheimer" → [{...,status:"finished"}]. "want to watch Inception" → [{...,status:"want-to"}]. "currently reading Dune" → [{...,status:"in-progress"}]. "finished reading Dune" → [{...,status:"finished"}].',
        items: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: ['book', 'film', 'show', 'song'], description: 'Type of media' },
            title: { type: 'string', description: 'Title of the work' },
            rating: { type: 'number', description: 'Rating on 1-10 scale if mentioned (e.g. "9/10" → 9, "★★★★" → 8)' },
            note: { type: 'string', description: 'Any comment or review note (e.g. "loved it", "slow start but great ending")' },
            status: { type: 'string', enum: ['want-to', 'in-progress', 'finished'], description: '"want-to" when user wants to read/watch; "in-progress" when currently reading/watching; "finished" when completed (default).' },
          },
          required: ['category', 'title'],
          additionalProperties: false,
        },
      },
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
        description: 'Use when the person gives a progress update on an existing injury — not a new injury and not when it is fully healed. Triggers include: any percentage ("feels 90%", "about 70% recovered"), any feeling description about an injured area ("achilles is feeling good", "knee is still a bit sore"), or mentioning activity with an injured body part. When in doubt between check-in and healed, prefer injury_checkin.',
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
      log_date: {
        type: 'string',
        description: 'Set ONLY when the log entry clearly refers to a different day than today. Use YYYY-MM-DD format. Examples: "yesterday I did legs" → yesterday\'s date. "on Tuesday I weighed 85kg" → the date of the most recent Tuesday. "this morning" usually means today. "last night\'s sleep" → today (sleep from last night belongs to today\'s record). Leave absent if the entry is about today.',
      },
      estimates: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of field names where the value was AI-estimated rather than explicitly stated by the user. E.g. if the user said "had a chicken salad" and you estimated 400 calories and 35g protein, include ["calories","protein_g"]. If the user said "ate 450 calories", do NOT include "calories" here. Only include fields that were estimated.',
      },
    },
    additionalProperties: false,
  },
}

const BASE_SYSTEM =
  "You are a health data extraction assistant. Parse the user's natural-language log entry and extract every health and habit metric you can identify.\n\n" +
  "GENERAL RULE: omit fields when the information is genuinely absent — do not invent steps, sleep, mood, weight, or water that weren't mentioned.\n\n" +
  "NUTRITION EXCEPTION — whenever the user mentions eating or drinking anything with nutritional value, you MUST populate BOTH calories AND protein_g using your nutritional knowledge. " +
  "Estimate from what you know (e.g. a 15cm ham pizza slice ≈ 400 kcal, 20 g protein; a chicken breast ≈ 165 kcal, 31 g protein; scrambled eggs × 2 ≈ 180 kcal, 12 g protein). " +
  "If you estimate because the user didn't state the exact number, add the field name to the estimates array.\n\n" +
  "UK CONVENTIONS: The user is UK-based. Convert stone and pounds to kg (1 stone = 6.35 kg; '13 stone 4 lbs' = 84.37 kg). " +
  "Recognise UK food terms: 'crisps' = potato chips, 'chips' = thick-cut fries, 'biscuit' = cookie, 'jacket potato' = baked potato, 'full English' ≈ 900 kcal 45 g protein, 'beans on toast' ≈ 300 kcal 15 g protein, 'fish and chips' ≈ 900 kcal 40 g protein. " +
  "Dates may be in DD/MM format — interpret accordingly.\n\n" +
  "For water: convert to ml (1L=1000ml, 1 glass=250ml, 1 pint=568ml). For weight: convert to kg."

function subtractDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export class ClaudeProvider implements AIProvider {
  async parseLog(text: string, context?: ParseContext): Promise<ParsedLog> {
    let system = BASE_SYSTEM

    // Date context — helps the AI resolve relative references like "yesterday", "Tuesday"
    if (context?.today) {
      const tz = context.timezone ?? 'Europe/London'
      const wd = context.weekday ?? ''
      system += `\n\nToday is ${context.today} (${wd}), timezone ${tz}. ` +
        `Use this to resolve relative dates: "yesterday" → ${subtractDay(context.today)}, "this morning/last night" → today, ` +
        `"Tuesday" → most recent Tuesday before today. Set log_date only when the entry is clearly about a past day.`
    }

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
        `• If the user gives a recovery percentage or describes how an injured area feels today (without saying it's fully healed), use injury_checkin. Be aggressive — "my achilles feels like 90% right now", "knee's a bit better", "shoulder still sore" are ALL check-ins.\n` +
        `• Only use injury_resolved when the injury is FULLY healed, not for partial improvement.\n` +
        `• If the user says nothing about their injuries, set neither injury_checkin nor injury_resolved.`
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
