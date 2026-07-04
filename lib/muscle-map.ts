// Maps exercise keyword patterns to muscle group IDs
export const EXERCISE_MUSCLES: Array<{ pattern: RegExp; muscles: string[] }> = [
  { pattern: /squat|leg press|lunge|hack squat/i,          muscles: ['quads', 'glutes'] },
  { pattern: /deadlift|rdl|romanian/i,                      muscles: ['hamstrings', 'glutes', 'lower_back'] },
  { pattern: /hip thrust|glute bridge/i,                    muscles: ['glutes'] },
  { pattern: /hamstring|leg curl/i,                         muscles: ['hamstrings'] },
  { pattern: /bench|chest press|push.?up|fly|dumbbell press/i, muscles: ['chest', 'triceps', 'front_delt'] },
  { pattern: /row|lat pull|pull.?down|pull.?up|chin.?up/i, muscles: ['lats', 'upper_back', 'biceps'] },
  { pattern: /overhead press|ohp|shoulder press|arnold/i,  muscles: ['front_delt', 'side_delt', 'triceps'] },
  { pattern: /lateral raise/i,                             muscles: ['side_delt'] },
  { pattern: /rear delt|face pull|reverse fly/i,           muscles: ['rear_delt'] },
  { pattern: /bicep curl|curl|hammer curl/i,               muscles: ['biceps'] },
  { pattern: /tricep|dip|skull crusher|close.?grip/i,     muscles: ['triceps'] },
  { pattern: /plank|crunch|ab |sit.?up|cable crunch/i,    muscles: ['core'] },
  { pattern: /calf raise|calf/i,                           muscles: ['calves'] },
  { pattern: /shrug|trap|upright row/i,                    muscles: ['traps'] },
  { pattern: /run|jog|sprint|bike|cycle|cycling/i,        muscles: ['quads', 'hamstrings', 'calves'] },
  { pattern: /swim/i,                                      muscles: ['lats', 'chest', 'front_delt'] },
  { pattern: /yoga|stretch/i,                              muscles: ['core'] },
]

export function getWorkedMuscles(exercises: string[]): string[] {
  const set = new Set<string>()
  for (const ex of exercises) {
    for (const { pattern, muscles } of EXERCISE_MUSCLES) {
      if (pattern.test(ex)) muscles.forEach((m) => set.add(m))
    }
  }
  return [...set]
}

// Body map muscle group metadata
export const MUSCLE_GROUPS = [
  // FRONT
  { id: 'chest',      label: 'Chest',       side: 'front' },
  { id: 'front_delt', label: 'Shoulders',   side: 'front' },
  { id: 'side_delt',  label: 'Side Delt',   side: 'front' },
  { id: 'biceps',     label: 'Biceps',      side: 'front' },
  { id: 'core',       label: 'Core',        side: 'front' },
  { id: 'quads',      label: 'Quads',       side: 'front' },
  { id: 'calves',     label: 'Calves',      side: 'front' },
  // BACK
  { id: 'traps',      label: 'Traps',       side: 'back' },
  { id: 'upper_back', label: 'Upper Back',  side: 'back' },
  { id: 'lats',       label: 'Lats',        side: 'back' },
  { id: 'rear_delt',  label: 'Rear Delt',   side: 'back' },
  { id: 'triceps',    label: 'Triceps',     side: 'back' },
  { id: 'lower_back', label: 'Lower Back',  side: 'back' },
  { id: 'glutes',     label: 'Glutes',      side: 'back' },
  { id: 'hamstrings', label: 'Hamstrings',  side: 'back' },
]
