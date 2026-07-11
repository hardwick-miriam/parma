// Client-safe types + pure helpers for body measurements. Kept separate from
// lib/db/bodyMeasurements.ts (which imports lib/supabase/server -> next/headers)
// so client components never pull a server-only module into the bundle.

export const MEASUREMENT_SITES = [
  'chest', 'left_arm', 'right_arm', 'waist', 'hips',
  'left_thigh', 'right_thigh', 'left_calf', 'neck', 'shoulders',
] as const

export type MeasurementSite = (typeof MEASUREMENT_SITES)[number]

const INCH_TO_CM = 2.54

/** Converts a stated value+unit to cm — the only unit ever stored. */
export function toCm(value: number, unit: 'cm' | 'inch'): number {
  return unit === 'inch' ? Math.round(value * INCH_TO_CM * 10) / 10 : value
}
