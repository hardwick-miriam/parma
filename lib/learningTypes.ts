// Client-safe types for the reading/learning tracker. Kept separate from
// lib/db/learningItems.ts (which imports lib/supabase/server -> next/headers)
// so client components never pull a server-only module into the bundle.

export const LEARNING_TYPES = ['book', 'course', 'audiobook', 'paper'] as const
export type LearningType = (typeof LEARNING_TYPES)[number]

export const LEARNING_STATUSES = ['want', 'in-progress', 'finished'] as const
export type LearningStatus = (typeof LEARNING_STATUSES)[number]
