// Client-safe types + pure helpers for the wardrobe feature. Kept separate from
// lib/db/wardrobe.ts (which imports lib/supabase/server → next/headers) so client
// components can import these without pulling a server-only module into the bundle.

export type WardrobeType =
  | 'top' | 'bottom' | 'dress' | 'outerwear' | 'footwear'
  | 'accessory' | 'underwear' | 'activewear' | 'other'

export type WardrobeCondition = 'new' | 'excellent' | 'good' | 'fair' | 'worn'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export interface WardrobeItem {
  id: string
  user_id: string
  photo_path: string | null
  name: string
  type: WardrobeType
  colours: string[]
  brand: string | null
  size: string | null
  seasons: Season[]
  tags: string[]
  condition: WardrobeCondition | null
  price_paid: number | null
  acquired_on: string | null
  notes: string | null
  created_at: string
}

export interface WardrobeItemWithStats extends WardrobeItem {
  photo_url: string | null
  wear_count: number
  last_worn: string | null
  cost_per_wear: number | null
}

export interface NewWardrobeItem {
  photo_path?: string | null
  name: string
  type: WardrobeType
  colours?: string[]
  brand?: string | null
  size?: string | null
  seasons?: Season[]
  tags?: string[]
  condition?: WardrobeCondition | null
  price_paid?: number | null
  acquired_on?: string | null
  notes?: string | null
}

/** Current Europe/London meteorological season, used as the browse-page default filter. */
export function currentSeason(now: Date = new Date()): Season {
  // Meteorological seasons (UK convention): Dec-Feb winter, Mar-May spring, Jun-Aug summer, Sep-Nov autumn
  const month = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', month: 'numeric' }).format(now)
  )
  if (month === 12 || month <= 2) return 'winter'
  if (month <= 5) return 'spring'
  if (month <= 8) return 'summer'
  return 'autumn'
}
