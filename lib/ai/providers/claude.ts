import Anthropic from '@anthropic-ai/sdk'
import { subtractDay } from '@/lib/date'
import { MODULE_BIAS } from '@/lib/moduleContext'
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
        description: 'TOTAL calories consumed across everything mentioned in this message. Whenever ANY food or drink with calories is mentioned, you MUST estimate this using nutritional knowledge — even for vague descriptions. Never omit when food was clearly eaten. When `foods` has multiple items, this MUST equal the sum of their individual calories — it is the total, not a separate estimate.',
      },
      protein_g: {
        type: 'number',
        description: 'TOTAL protein in grams across everything mentioned in this message. Whenever ANY food is mentioned, you MUST estimate this alongside calories — never leave it absent if food was eaten. When `foods` has multiple items, this MUST equal the sum of their individual protein_g — it is the total, not a separate estimate.',
      },
      carbs_g: { type: 'number', description: 'TOTAL carbohydrates in grams across everything mentioned. Same estimation rule as calories/protein_g — sum of `foods` items when present.' },
      fat_g: { type: 'number', description: 'TOTAL fat in grams across everything mentioned. Same estimation rule as calories/protein_g — sum of `foods` items when present.' },
      fibre_g: { type: 'number', description: 'TOTAL dietary fibre in grams across everything mentioned. Same estimation rule as calories/protein_g — sum of `foods` items when present.' },
      sugar_g: { type: 'number', description: 'TOTAL sugar in grams across everything mentioned. Same estimation rule as calories/protein_g — sum of `foods` items when present.' },
      salt_g: { type: 'number', description: 'TOTAL salt in grams across everything mentioned. Same estimation rule as calories/protein_g — sum of `foods` items when present.' },
      foods: {
        type: 'array',
        description:
          'One entry per DISTINCT food/drink or meal mentioned — split them out instead of collapsing everything into one item. ' +
          '"porridge for breakfast, chicken wrap and a monster at lunch, curry for dinner" → FOUR separate items ' +
          '(porridge/breakfast, chicken wrap/lunch, monster energy drink/lunch, curry/dinner), each with its own calorie and protein estimate. ' +
          'A message about a single food/meal should still produce exactly one item here. Use nutritional knowledge per item ' +
          '(ham pizza slice ~400kcal/20g protein, chicken breast ~165kcal/31g protein, eggs ~90kcal/6g protein each, oats ~150kcal/5g protein per serving, energy drink ~110kcal/0g protein). ' +
          'The `calories`/`protein_g` fields above must equal the sum of these items.',
        items: {
          type: 'object',
          properties: {
            description: { type: 'string', description: 'Short name of the food/drink, e.g. "chicken wrap", "porridge", "Monster energy drink"' },
            meal: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'], description: 'Which meal this belongs to, if stated or clearly implied by time of day. Omit if genuinely unclear.' },
            calories: { type: 'number', description: 'Estimated calories for this one item' },
            protein_g: { type: 'number', description: 'Estimated protein in grams for this one item' },
            carbs_g: { type: 'number', description: 'Estimated carbohydrates in grams for this one item' },
            fat_g: { type: 'number', description: 'Estimated fat in grams for this one item' },
            fibre_g: { type: 'number', description: 'Estimated dietary fibre in grams for this one item' },
            sugar_g: { type: 'number', description: 'Estimated sugar in grams for this one item' },
            salt_g: { type: 'number', description: 'Estimated salt in grams for this one item' },
          },
          required: ['description', 'calories', 'protein_g'],
          additionalProperties: false,
        },
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
        description: 'Films/shows watched/watching/to watch, or songs listened to. Do NOT use for books/courses/audiobooks/papers — those always go in `learning_items` instead, never here. E.g. "watched Oppenheimer" → [{...,status:"finished"}]. "want to watch Inception" → [{...,status:"want-to"}].',
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
      muscle_soreness: {
        type: 'array',
        description: 'Muscle soreness reports. Use when the user mentions a muscle or muscle group being sore, tight, aching, cooked, stiff, or fatigued. E.g. "triceps still cooked" → [{muscle_id:"triceps-l",intensity:7},{muscle_id:"triceps-r",intensity:7}]. "my left hamstring is a bit sore" → [{muscle_id:"hamstrings-l",intensity:4}]. Use bilateral IDs (e.g. both -l and -r) unless the user specifies one side.',
        items: {
          type: 'object',
          properties: {
            muscle_id: {
              type: 'string',
              description: 'Muscle group ID. One of: chest-l, chest-r, front-delts-l, front-delts-r, biceps-l, biceps-r, triceps-l, triceps-r, forearms-l, forearms-r, abs-upper, abs-lower, obliques-l, obliques-r, quads-l, quads-r, adductors-l, adductors-r, calves-front-l, calves-front-r, tibialis-l, tibialis-r, traps, rear-delts-l, rear-delts-r, lats-l, lats-r, rhomboids, lower-back, glutes-l, glutes-r, hamstrings-l, hamstrings-r, calves-l, calves-r',
            },
            intensity: {
              type: 'number',
              description: 'Soreness intensity 1-10. "a bit sore" → 3-4, "pretty sore" → 6-7, "very sore/cooked/destroyed" → 8-9, "can barely move it" → 10',
            },
          },
          required: ['muscle_id', 'intensity'],
          additionalProperties: false,
        },
      },
      learning_items: {
        type: 'array',
        description: 'Books, courses, audiobooks, or papers the user is tracking reading/learning progress on. ALWAYS use this (not `media`) for books/courses/audiobooks/papers — `media` is reserved for films/shows/songs only. Use when the user mentions wanting to read/take, starting, making progress on, or finishing one of these. E.g. "started reading Atomic Habits" -> {title:"Atomic Habits",type:"book",status:"in-progress"}. "finished the ML course 9/10" -> {title:"ML course",type:"course",status:"finished",rating:9}. "halfway through Dune" -> {title:"Dune",type:"book",status:"in-progress",progress_pct:50}. "want to read Sapiens" -> {title:"Sapiens",type:"book",status:"want"}.',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            type: { type: 'string', enum: ['book', 'course', 'audiobook', 'paper'] },
            status: { type: 'string', enum: ['want', 'in-progress', 'finished'], description: 'Omit if just a progress update on an already-started item.' },
            progress_pct: { type: 'number', description: '0-100 percent complete, if stated or clearly implied (e.g. "halfway" -> 50, "almost done" -> ~90).' },
            rating: { type: 'number', description: '1-10 rating if given (e.g. "9/10" -> 9, "loved it" with no number -> omit).' },
            notes: { type: 'string' },
          },
          required: ['title', 'type'],
          additionalProperties: false,
        },
      },
      body_measurements: {
        type: 'array',
        description: 'Body-part circumference measurements. Use when the user states a measurement for chest, an arm, waist, hips, a thigh, a calf, neck, or shoulders. Extract the RAW stated value and unit — do not convert yourself. Assume unit "cm" unless inches/" is explicitly mentioned. E.g. "chest 42 inches" -> {site:"chest",value:42,unit:"inch"}, "left arm 15" (no unit stated) -> {site:"left_arm",value:15,unit:"cm"}, "waist 34\\"" -> {site:"waist",value:34,unit:"inch"}.',
        items: {
          type: 'object',
          properties: {
            site: { type: 'string', enum: ['chest', 'left_arm', 'right_arm', 'waist', 'hips', 'left_thigh', 'right_thigh', 'left_calf', 'neck', 'shoulders'] },
            value: { type: 'number' },
            unit: { type: 'string', enum: ['cm', 'inch'], description: 'Only "inch" if the user explicitly said inches or used the " symbol; otherwise "cm".' },
            note: { type: 'string' },
          },
          required: ['site', 'value'],
          additionalProperties: false,
        },
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
  "NUTRITION EXCEPTION — whenever the user mentions eating or drinking anything with nutritional value, you MUST populate calories, protein_g, carbs_g, fat_g, fibre_g, sugar_g, AND salt_g (the TOTALS) using your nutritional knowledge — all seven, not just calories/protein. " +
  "Estimate from what you know (e.g. a 15cm ham pizza slice ≈ 400 kcal, 20 g protein, 40 g carbs, 18 g fat, 2 g fibre, 4 g sugar, 1.8 g salt; a chicken breast ≈ 165 kcal, 31 g protein, 0 g carbs, 4 g fat; scrambled eggs × 2 ≈ 180 kcal, 12 g protein, 1 g carbs, 14 g fat). " +
  "If you estimate because the user didn't state the exact number, add the field name to the estimates array.\n\n" +
  "ITEMISATION (F1) — whenever more than one distinct food, drink, or meal is mentioned in the same message, you MUST split them into separate entries in the `foods` array — one item per food, each tagged with its own meal (breakfast/lunch/dinner/snack) when stated or clearly implied. Do not collapse a whole day's eating into one blob. A message describing only one food should still produce a single `foods` entry. `calories`/`protein_g` above are always the SUM of the `foods` items.\n\n" +
  "UK CONVENTIONS: The user is UK-based. Convert stone and pounds to kg (1 stone = 6.35 kg; '13 stone 4 lbs' = 84.37 kg). " +
  "Recognise UK food terms: 'crisps' = potato chips, 'chips' = thick-cut fries, 'biscuit' = cookie, 'jacket potato' = baked potato, 'full English' ≈ 900 kcal 45 g protein, 'beans on toast' ≈ 300 kcal 15 g protein, 'fish and chips' ≈ 900 kcal 40 g protein. " +
  "Dates may be in DD/MM format — interpret accordingly.\n\n" +
  "For water: convert to ml (1L=1000ml, 1 glass=250ml, 1 pint=568ml). For weight: convert to kg."

export class ClaudeProvider implements AIProvider {
  async parseLog(text: string, context?: ParseContext): Promise<ParsedLog> {
    let system = BASE_SYSTEM

    // Date context — helps the AI resolve relative references like "yesterday", "Tuesday"
    if (context?.today) {
      const tz = context.timezone ?? 'Europe/London'
      const wd = context.weekday ?? ''
      const yesterday = subtractDay(context.today, tz)
      system += `\n\nToday is ${context.today} (${wd}), timezone ${tz}. ` +
        `Use this to resolve relative dates: "yesterday" → ${yesterday}, "this morning/last night" → today, ` +
        `"Tuesday" → most recent Tuesday before today. Set log_date only when the entry is clearly about a past day.`

      // F2: right after local midnight, a message like "had a burger for
      // dinner" almost always describes a meal that happened *before*
      // midnight, not one eaten in the last few minutes of the new day.
      // Without this, such messages defaulted to today purely because
      // there's no explicit date to trigger chrono-node or the general
      // "yesterday" rule above.
      if (context.currentHour != null && context.currentHour >= 0 && context.currentHour < 4) {
        system += `\n\nIt is currently ${context.currentHour}:00 in the very early morning of ${context.today}. ` +
          `If the user describes a meal, food, or workout in the PAST TENSE with no explicit day stated ` +
          `(e.g. "had a burger for dinner", "did legs earlier"), assume it happened yesterday (${yesterday}) and set log_date = "${yesterday}" — ` +
          `it is very unlikely they mean the last few minutes of today. ` +
          `Exceptions: if they say "today", "just now", "this morning", give an explicit date, or describe something clearly happening right now, use ${context.today} instead.`
      }
    }

    // chrono-node pre-resolved a date expression — treat as authoritative ground truth
    if (context?.resolvedDate && context.resolvedDate !== context?.today) {
      system += `\n\nDate pre-resolved by the client: this log entry belongs to ${context.resolvedDate}. ` +
        `Set log_date = "${context.resolvedDate}" unless the entry is clearly about today.`
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

    // Soft module bias — the user submitted this from a specific module's chat
    // bar. Nudge ambiguous interpretation toward it, but never force a wrong
    // read: food mentioned while in Health must still extract as food.
    if (context?.moduleContext) {
      const cfg = MODULE_BIAS[context.moduleContext]
      if (cfg) {
        system += `\n\nThe user submitted this from the ${cfg.label} section of the app, which is usually ${cfg.bias}. ` +
          `If the message is ambiguous, lean toward that interpretation — but if it clearly describes something else entirely, extract that instead (or in addition). This is a soft hint, never a restriction.`
      }
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
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
