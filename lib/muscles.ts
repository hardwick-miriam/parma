// Exercise → muscle group mapping for the Body widget

export type MuscleId =
  | 'chest-l' | 'chest-r'
  | 'front-delts-l' | 'front-delts-r'
  | 'biceps-l' | 'biceps-r'
  | 'triceps-l' | 'triceps-r'
  | 'forearms-l' | 'forearms-r'
  | 'abs-upper' | 'abs-lower'
  | 'obliques-l' | 'obliques-r'
  | 'quads-l' | 'quads-r'
  | 'adductors-l' | 'adductors-r'
  | 'calves-front-l' | 'calves-front-r'
  | 'tibialis-l' | 'tibialis-r'
  | 'traps'
  | 'rear-delts-l' | 'rear-delts-r'
  | 'lats-l' | 'lats-r'
  | 'rhomboids'
  | 'lower-back'
  | 'glutes-l' | 'glutes-r'
  | 'hamstrings-l' | 'hamstrings-r'
  | 'calves-l' | 'calves-r'

export type MuscleView = 'front' | 'back'

export const MUSCLE_SIDE: Record<MuscleId, MuscleView> = {
  'chest-l': 'front', 'chest-r': 'front',
  'front-delts-l': 'front', 'front-delts-r': 'front',
  'biceps-l': 'front', 'biceps-r': 'front',
  'triceps-l': 'front', 'triceps-r': 'front',
  'forearms-l': 'front', 'forearms-r': 'front',
  'abs-upper': 'front', 'abs-lower': 'front',
  'obliques-l': 'front', 'obliques-r': 'front',
  'quads-l': 'front', 'quads-r': 'front',
  'adductors-l': 'front', 'adductors-r': 'front',
  'calves-front-l': 'front', 'calves-front-r': 'front',
  'tibialis-l': 'front', 'tibialis-r': 'front',
  'traps': 'back',
  'rear-delts-l': 'back', 'rear-delts-r': 'back',
  'lats-l': 'back', 'lats-r': 'back',
  'rhomboids': 'back',
  'lower-back': 'back',
  'glutes-l': 'back', 'glutes-r': 'back',
  'hamstrings-l': 'back', 'hamstrings-r': 'back',
  'calves-l': 'back', 'calves-r': 'back',
}

export const MUSCLE_LABEL: Record<MuscleId, string> = {
  'chest-l': 'Left Pec', 'chest-r': 'Right Pec',
  'front-delts-l': 'Left Front Delt', 'front-delts-r': 'Right Front Delt',
  'biceps-l': 'Left Bicep', 'biceps-r': 'Right Bicep',
  'triceps-l': 'Left Tricep', 'triceps-r': 'Right Tricep',
  'forearms-l': 'Left Forearm', 'forearms-r': 'Right Forearm',
  'abs-upper': 'Upper Abs', 'abs-lower': 'Lower Abs',
  'obliques-l': 'Left Oblique', 'obliques-r': 'Right Oblique',
  'quads-l': 'Left Quad', 'quads-r': 'Right Quad',
  'adductors-l': 'Left Adductor', 'adductors-r': 'Right Adductor',
  'calves-front-l': 'Left Calf (front)', 'calves-front-r': 'Right Calf (front)',
  'tibialis-l': 'Left Tibialis', 'tibialis-r': 'Right Tibialis',
  'traps': 'Trapezius',
  'rear-delts-l': 'Left Rear Delt', 'rear-delts-r': 'Right Rear Delt',
  'lats-l': 'Left Lat', 'lats-r': 'Right Lat',
  'rhomboids': 'Rhomboids / Mid-Back',
  'lower-back': 'Lower Back',
  'glutes-l': 'Left Glute', 'glutes-r': 'Right Glute',
  'hamstrings-l': 'Left Hamstring', 'hamstrings-r': 'Right Hamstring',
  'calves-l': 'Left Calf', 'calves-r': 'Right Calf',
}

// Group label for the tooltip (bilateral muscles share a canonical name)
export const MUSCLE_GROUP_LABEL: Record<MuscleId, string> = {
  'chest-l': 'Chest', 'chest-r': 'Chest',
  'front-delts-l': 'Front Delts', 'front-delts-r': 'Front Delts',
  'biceps-l': 'Biceps', 'biceps-r': 'Biceps',
  'triceps-l': 'Triceps', 'triceps-r': 'Triceps',
  'forearms-l': 'Forearms', 'forearms-r': 'Forearms',
  'abs-upper': 'Upper Abs', 'abs-lower': 'Lower Abs',
  'obliques-l': 'Obliques', 'obliques-r': 'Obliques',
  'quads-l': 'Quads', 'quads-r': 'Quads',
  'adductors-l': 'Adductors', 'adductors-r': 'Adductors',
  'calves-front-l': 'Calves', 'calves-front-r': 'Calves',
  'tibialis-l': 'Tibialis', 'tibialis-r': 'Tibialis',
  'traps': 'Traps',
  'rear-delts-l': 'Rear Delts', 'rear-delts-r': 'Rear Delts',
  'lats-l': 'Lats', 'lats-r': 'Lats',
  'rhomboids': 'Rhomboids',
  'lower-back': 'Lower Back',
  'glutes-l': 'Glutes', 'glutes-r': 'Glutes',
  'hamstrings-l': 'Hamstrings', 'hamstrings-r': 'Hamstrings',
  'calves-l': 'Calves', 'calves-r': 'Calves',
}

// Primary + secondary movers. Weight 1.0 = primary, 0.5 = secondary
export interface MuscleLoad { muscle: MuscleId; weight: number }

const BOTH_PECS: MuscleLoad[] = [
  { muscle: 'chest-l', weight: 1.0 }, { muscle: 'chest-r', weight: 1.0 },
]
const BOTH_FRONT_DELTS: MuscleLoad[] = [
  { muscle: 'front-delts-l', weight: 0.5 }, { muscle: 'front-delts-r', weight: 0.5 },
]
const BOTH_REAR_DELTS: MuscleLoad[] = [
  { muscle: 'rear-delts-l', weight: 0.5 }, { muscle: 'rear-delts-r', weight: 0.5 },
]
const BOTH_TRIS: MuscleLoad[] = [
  { muscle: 'triceps-l', weight: 1.0 }, { muscle: 'triceps-r', weight: 1.0 },
]
const BOTH_BIS: MuscleLoad[] = [
  { muscle: 'biceps-l', weight: 1.0 }, { muscle: 'biceps-r', weight: 1.0 },
]
const BOTH_LATS: MuscleLoad[] = [
  { muscle: 'lats-l', weight: 1.0 }, { muscle: 'lats-r', weight: 1.0 },
]
const BOTH_QUADS: MuscleLoad[] = [
  { muscle: 'quads-l', weight: 1.0 }, { muscle: 'quads-r', weight: 1.0 },
]
const BOTH_HAMS: MuscleLoad[] = [
  { muscle: 'hamstrings-l', weight: 1.0 }, { muscle: 'hamstrings-r', weight: 1.0 },
]
const BOTH_GLUTES: MuscleLoad[] = [
  { muscle: 'glutes-l', weight: 1.0 }, { muscle: 'glutes-r', weight: 1.0 },
]
const BOTH_CALVES: MuscleLoad[] = [
  { muscle: 'calves-l', weight: 1.0 }, { muscle: 'calves-r', weight: 1.0 },
]
const BOTH_FORE: MuscleLoad[] = [
  { muscle: 'forearms-l', weight: 0.4 }, { muscle: 'forearms-r', weight: 0.4 },
]

// Canonical exercise name → muscle loads
// Keys are lowercase, checked with includes() for fuzzy matching
const EXERCISE_MAP: Array<{ keywords: string[]; muscles: MuscleLoad[] }> = [
  // PUSH — chest
  { keywords: ['bench press', 'bench', 'barbell press'], muscles: [...BOTH_PECS, ...BOTH_FRONT_DELTS, ...BOTH_TRIS] },
  { keywords: ['incline bench', 'incline press', 'incline db', 'incline dumbbell'], muscles: [
    { muscle: 'chest-l', weight: 0.9 }, { muscle: 'chest-r', weight: 0.9 },
    { muscle: 'front-delts-l', weight: 0.7 }, { muscle: 'front-delts-r', weight: 0.7 },
    ...BOTH_TRIS,
  ]},
  { keywords: ['decline bench', 'decline press'], muscles: [
    { muscle: 'chest-l', weight: 1.0 }, { muscle: 'chest-r', weight: 1.0 },
    { muscle: 'triceps-l', weight: 0.5 }, { muscle: 'triceps-r', weight: 0.5 },
  ]},
  { keywords: ['fly', 'cable fly', 'pec deck', 'chest fly', 'dumbbell fly'], muscles: [
    { muscle: 'chest-l', weight: 1.0 }, { muscle: 'chest-r', weight: 1.0 },
    { muscle: 'front-delts-l', weight: 0.3 }, { muscle: 'front-delts-r', weight: 0.3 },
  ]},
  { keywords: ['push up', 'pushup', 'press up'], muscles: [...BOTH_PECS, ...BOTH_FRONT_DELTS, ...BOTH_TRIS] },
  { keywords: ['dip', 'parallel bar'], muscles: [
    { muscle: 'chest-l', weight: 0.6 }, { muscle: 'chest-r', weight: 0.6 },
    { muscle: 'triceps-l', weight: 1.0 }, { muscle: 'triceps-r', weight: 1.0 },
    { muscle: 'front-delts-l', weight: 0.4 }, { muscle: 'front-delts-r', weight: 0.4 },
  ]},

  // PUSH — shoulders
  { keywords: ['overhead press', 'ohp', 'shoulder press', 'military press', 'seated press', 'arnold press'], muscles: [
    { muscle: 'front-delts-l', weight: 1.0 }, { muscle: 'front-delts-r', weight: 1.0 },
    { muscle: 'triceps-l', weight: 0.5 }, { muscle: 'triceps-r', weight: 0.5 },
    { muscle: 'traps', weight: 0.3 },
  ]},
  { keywords: ['lateral raise', 'side raise', 'lateral delt'], muscles: [
    { muscle: 'front-delts-l', weight: 0.5 }, { muscle: 'front-delts-r', weight: 0.5 },
    { muscle: 'rear-delts-l', weight: 0.3 }, { muscle: 'rear-delts-r', weight: 0.3 },
  ]},
  { keywords: ['front raise'], muscles: [
    { muscle: 'front-delts-l', weight: 1.0 }, { muscle: 'front-delts-r', weight: 1.0 },
  ]},
  { keywords: ['face pull', 'rear delt fly', 'reverse fly', 'bent over fly'], muscles: [
    ...BOTH_REAR_DELTS.map(m => ({ ...m, weight: 1.0 })),
    { muscle: 'rhomboids', weight: 0.6 },
    { muscle: 'traps', weight: 0.4 },
  ]},

  // PUSH — triceps
  { keywords: ['skull crusher', 'skullcrusher', 'lying tricep', 'ez bar'], muscles: [
    { muscle: 'triceps-l', weight: 1.0 }, { muscle: 'triceps-r', weight: 1.0 },
  ]},
  { keywords: ['tricep pushdown', 'cable pushdown', 'tricep extension', 'overhead tricep'], muscles: [
    { muscle: 'triceps-l', weight: 1.0 }, { muscle: 'triceps-r', weight: 1.0 },
  ]},

  // PULL — back
  { keywords: ['deadlift'], muscles: [
    ...BOTH_LATS.map(m => ({ ...m, weight: 0.7 })),
    { muscle: 'lower-back', weight: 1.0 },
    ...BOTH_GLUTES.map(m => ({ ...m, weight: 0.8 })),
    ...BOTH_HAMS.map(m => ({ ...m, weight: 0.7 })),
    { muscle: 'traps', weight: 0.6 },
    ...BOTH_FORE,
  ]},
  { keywords: ['pull up', 'pullup', 'chin up', 'chinup'], muscles: [
    ...BOTH_LATS,
    { muscle: 'biceps-l', weight: 0.6 }, { muscle: 'biceps-r', weight: 0.6 },
    { muscle: 'rhomboids', weight: 0.5 },
    ...BOTH_FORE,
  ]},
  { keywords: ['lat pulldown', 'cable pulldown'], muscles: [
    ...BOTH_LATS,
    { muscle: 'biceps-l', weight: 0.5 }, { muscle: 'biceps-r', weight: 0.5 },
    { muscle: 'rhomboids', weight: 0.4 },
  ]},
  { keywords: ['row', 'barbell row', 'cable row', 'seated row', 'machine row', 'bent over row', 'db row', 'dumbbell row'], muscles: [
    ...BOTH_LATS.map(m => ({ ...m, weight: 0.8 })),
    { muscle: 'rhomboids', weight: 1.0 },
    ...BOTH_REAR_DELTS.map(m => ({ ...m, weight: 0.6 })),
    { muscle: 'biceps-l', weight: 0.5 }, { muscle: 'biceps-r', weight: 0.5 },
    { muscle: 'lower-back', weight: 0.4 },
    ...BOTH_FORE,
  ]},
  { keywords: ['shrug', 'trap bar'], muscles: [{ muscle: 'traps', weight: 1.0 }, ...BOTH_FORE] },
  { keywords: ['hyperextension', 'back extension', 'good morning'], muscles: [
    { muscle: 'lower-back', weight: 1.0 },
    ...BOTH_GLUTES.map(m => ({ ...m, weight: 0.5 })),
    ...BOTH_HAMS.map(m => ({ ...m, weight: 0.5 })),
  ]},

  // PULL — biceps
  { keywords: ['curl', 'bicep curl', 'hammer curl', 'preacher curl', 'concentration curl', 'barbell curl', 'cable curl'], muscles: [
    ...BOTH_BIS,
    ...BOTH_FORE,
  ]},

  // LEGS
  { keywords: ['squat', 'back squat', 'front squat', 'goblet squat', 'hack squat', 'smith squat'], muscles: [
    ...BOTH_QUADS,
    ...BOTH_GLUTES.map(m => ({ ...m, weight: 0.8 })),
    ...BOTH_HAMS.map(m => ({ ...m, weight: 0.5 })),
    { muscle: 'lower-back', weight: 0.4 },
  ]},
  { keywords: ['leg press'], muscles: [
    ...BOTH_QUADS,
    ...BOTH_GLUTES.map(m => ({ ...m, weight: 0.6 })),
    ...BOTH_HAMS.map(m => ({ ...m, weight: 0.4 })),
  ]},
  { keywords: ['lunge', 'walking lunge', 'split squat', 'bulgarian split squat', 'reverse lunge'], muscles: [
    ...BOTH_QUADS,
    ...BOTH_GLUTES,
    ...BOTH_HAMS.map(m => ({ ...m, weight: 0.5 })),
  ]},
  { keywords: ['leg extension', 'quad extension'], muscles: [
    ...BOTH_QUADS,
  ]},
  { keywords: ['leg curl', 'hamstring curl', 'lying curl', 'seated leg curl'], muscles: [
    ...BOTH_HAMS,
  ]},
  { keywords: ['romanian deadlift', 'rdl', 'stiff leg'], muscles: [
    ...BOTH_HAMS,
    ...BOTH_GLUTES.map(m => ({ ...m, weight: 0.7 })),
    { muscle: 'lower-back', weight: 0.5 },
  ]},
  { keywords: ['hip thrust', 'glute bridge', 'banded clam'], muscles: [
    ...BOTH_GLUTES,
    ...BOTH_HAMS.map(m => ({ ...m, weight: 0.4 })),
  ]},
  { keywords: ['calf raise', 'calf press', 'standing calf', 'seated calf'], muscles: [
    ...BOTH_CALVES,
    { muscle: 'calves-front-l', weight: 0.3 }, { muscle: 'calves-front-r', weight: 0.3 },
  ]},
  { keywords: ['adductor', 'inner thigh', 'sumo'], muscles: [
    { muscle: 'adductors-l', weight: 1.0 }, { muscle: 'adductors-r', weight: 1.0 },
    ...BOTH_QUADS.map(m => ({ ...m, weight: 0.4 })),
  ]},

  // CORE
  { keywords: ['crunch', 'sit up', 'situp', 'ab crunch', 'cable crunch'], muscles: [
    { muscle: 'abs-upper', weight: 1.0 }, { muscle: 'abs-lower', weight: 0.6 },
  ]},
  { keywords: ['leg raise', 'hanging leg', 'reverse crunch'], muscles: [
    { muscle: 'abs-lower', weight: 1.0 }, { muscle: 'abs-upper', weight: 0.5 },
  ]},
  { keywords: ['plank', 'hollow hold', 'ab wheel', 'rollout'], muscles: [
    { muscle: 'abs-upper', weight: 0.8 }, { muscle: 'abs-lower', weight: 0.8 },
    { muscle: 'obliques-l', weight: 0.4 }, { muscle: 'obliques-r', weight: 0.4 },
  ]},
  { keywords: ['oblique', 'russian twist', 'side bend', 'woodchop'], muscles: [
    { muscle: 'obliques-l', weight: 1.0 }, { muscle: 'obliques-r', weight: 1.0 },
  ]},

  // CARDIO / SPORT (full-body light load)
  { keywords: ['run', 'running', 'jog', 'jogging', 'treadmill'], muscles: [
    ...BOTH_QUADS.map(m => ({ ...m, weight: 0.5 })),
    ...BOTH_HAMS.map(m => ({ ...m, weight: 0.5 })),
    ...BOTH_CALVES.map(m => ({ ...m, weight: 0.5 })),
    ...BOTH_GLUTES.map(m => ({ ...m, weight: 0.4 })),
  ]},
  { keywords: ['cycle', 'cycling', 'bike', 'spin', 'spinning'], muscles: [
    ...BOTH_QUADS,
    ...BOTH_HAMS.map(m => ({ ...m, weight: 0.5 })),
    ...BOTH_CALVES.map(m => ({ ...m, weight: 0.4 })),
  ]},
  { keywords: ['swim', 'swimming'], muscles: [
    ...BOTH_LATS.map(m => ({ ...m, weight: 0.7 })),
    ...BOTH_PECS.map(m => ({ ...m, weight: 0.5 })),
    { muscle: 'front-delts-l', weight: 0.6 }, { muscle: 'front-delts-r', weight: 0.6 },
    { muscle: 'abs-upper', weight: 0.4 }, { muscle: 'abs-lower', weight: 0.4 },
  ]},
  { keywords: ['yoga', 'stretch', 'mobility'], muscles: [] },
]

// Resolve an exercise name to muscle loads using the legacy hand-written map (fallback only)
export function resolveExerciseLegacy(name: string): MuscleLoad[] {
  const lower = name.toLowerCase()
  for (const entry of EXERCISE_MAP) {
    if (entry.keywords.some(k => lower.includes(k))) {
      return entry.muscles
    }
  }
  return []
}

// Kept for backward compat — delegates to exerciseDb with legacy fallback
export function resolveExercise(name: string): MuscleLoad[] {
  return resolveExerciseLegacy(name)
}

// Aggregate muscle loads across multiple exercises/sessions
// Returns map of muscleId → combined load 0-1
export function aggregateMuscleLoads(
  exercises: Array<{ name: string; sets?: number; reps?: number; whoopStrain?: number }>
): Partial<Record<MuscleId, number>> {
  const totals: Partial<Record<MuscleId, number>> = {}
  for (const ex of exercises) {
    const loads = resolveExerciseLegacy(ex.name)
    const scale = ex.whoopStrain ? Math.min(1.5, ex.whoopStrain / 15) : 1.0
    for (const { muscle, weight } of loads) {
      totals[muscle] = Math.min(1, (totals[muscle] ?? 0) + weight * scale * 0.6)
    }
  }
  return totals
}

// Soreness keyword mapping (for NLP soreness intent)
const SORENESS_MAP: Array<{ keywords: string[]; muscles: MuscleId[] }> = [
  { keywords: ['chest', 'pec', 'pecs'], muscles: ['chest-l', 'chest-r'] },
  { keywords: ['tricep', 'triceps'], muscles: ['triceps-l', 'triceps-r'] },
  { keywords: ['bicep', 'biceps'], muscles: ['biceps-l', 'biceps-r'] },
  { keywords: ['shoulder', 'delt', 'delts'], muscles: ['front-delts-l', 'front-delts-r', 'rear-delts-l', 'rear-delts-r'] },
  { keywords: ['back', 'lat', 'lats', 'upper back'], muscles: ['lats-l', 'lats-r', 'rhomboids'] },
  { keywords: ['lower back', 'lumbar'], muscles: ['lower-back'] },
  { keywords: ['trap', 'traps', 'neck', 'upper trap'], muscles: ['traps'] },
  { keywords: ['leg', 'legs', 'quad', 'quads', 'thigh'], muscles: ['quads-l', 'quads-r'] },
  { keywords: ['hamstring', 'hamstrings', 'ham', 'hams'], muscles: ['hamstrings-l', 'hamstrings-r'] },
  { keywords: ['glute', 'glutes', 'bum', 'butt', 'hip'], muscles: ['glutes-l', 'glutes-r'] },
  { keywords: ['calf', 'calves', 'calf muscle'], muscles: ['calves-l', 'calves-r', 'calves-front-l', 'calves-front-r'] },
  { keywords: ['abs', 'stomach', 'core', 'belly'], muscles: ['abs-upper', 'abs-lower', 'obliques-l', 'obliques-r'] },
  { keywords: ['forearm', 'forearms', 'grip'], muscles: ['forearms-l', 'forearms-r'] },
]

export function resolveMuscleSoreness(text: string): MuscleId[] {
  const lower = text.toLowerCase()
  const matched = new Set<MuscleId>()
  for (const entry of SORENESS_MAP) {
    if (entry.keywords.some(k => lower.includes(k))) {
      entry.muscles.forEach(m => matched.add(m))
    }
  }
  return [...matched]
}
