import Fuse from 'fuse.js'
import rawExercises from './data/exercises.json'
import aliases from './data/exercise-aliases.json'
import muscleZoneMap from './data/muscle-zone-map.json'
import type { MuscleId } from './muscles'

export interface ExerciseRecord {
  name: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  equipment: string
  level: string
  force: string
  mechanic: string
}

export interface ExerciseLookupResult {
  name: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  equipment: string
  level: string
  bodyZones: {
    primary: MuscleId[]
    secondary: MuscleId[]
  }
}

const exercises = rawExercises as ExerciseRecord[]
const aliasMap = aliases as Record<string, string>
const zoneMap = muscleZoneMap as Record<string, string[]>

// Build fuse index over all exercise names
const fuse = new Fuse(exercises, {
  keys: ['name'],
  threshold: 0.4,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
})

function muscleNamesToZones(muscles: string[]): MuscleId[] {
  const zones = new Set<string>()
  for (const m of muscles) {
    const mapped = zoneMap[m.toLowerCase()]
    if (mapped) mapped.forEach((z) => zones.add(z))
  }
  return Array.from(zones) as MuscleId[]
}

function resolveAlias(name: string): string {
  const lower = name.toLowerCase().trim()
  return aliasMap[lower] ?? aliasMap[name.trim()] ?? name
}

function lookupExact(name: string): ExerciseRecord | null {
  const lower = name.toLowerCase()
  return exercises.find((e) => e.name.toLowerCase() === lower) ?? null
}

function lookupFuzzy(name: string): ExerciseRecord | null {
  const results = fuse.search(name, { limit: 1 })
  if (!results.length) return null
  const best = results[0]
  if ((best.score ?? 1) > 0.45) return null
  return best.item
}

/** Multi-result fuzzy search over the 873-exercise catalog, for the live logger's exercise picker. */
export function searchExercises(query: string, limit = 20): ExerciseRecord[] {
  if (!query.trim()) return []
  return fuse.search(query, { limit }).map((r) => r.item)
}

/**
 * Main lookup: name → { primaryMuscles, secondaryMuscles, bodyZones }
 * Returns null when no match found (logged for alias additions).
 */
export function lookupExercise(name: string): ExerciseLookupResult | null {
  const resolved = resolveAlias(name)
  const record = lookupExact(resolved) ?? lookupFuzzy(resolved) ?? lookupFuzzy(name)

  if (!record) {
    console.warn(`[exerciseDb] no match for "${name}" (alias resolved to "${resolved}") — add alias`)
    return null
  }

  return {
    name: record.name,
    primaryMuscles: record.primaryMuscles,
    secondaryMuscles: record.secondaryMuscles,
    equipment: record.equipment,
    level: record.level,
    bodyZones: {
      primary: muscleNamesToZones(record.primaryMuscles),
      secondary: muscleNamesToZones(record.secondaryMuscles),
    },
  }
}

/** Aggregate muscle loads from a list of exercise names (primary=1.0, secondary=0.5) */
export function aggregateExerciseLoads(exerciseNames: string[]): Map<MuscleId, number> {
  const loads = new Map<MuscleId, number>()

  for (const name of exerciseNames) {
    const result = lookupExercise(name)
    if (!result) continue

    for (const zone of result.bodyZones.primary) {
      loads.set(zone, Math.min(1, (loads.get(zone) ?? 0) + 1.0))
    }
    for (const zone of result.bodyZones.secondary) {
      loads.set(zone, Math.min(1, (loads.get(zone) ?? 0) + 0.5))
    }
  }

  // Normalise — cap at 1.0, but retain relative magnitudes within [0,1]
  const max = Math.max(...loads.values(), 1)
  if (max > 1) {
    for (const [k, v] of loads) loads.set(k, v / max)
  }

  return loads
}
