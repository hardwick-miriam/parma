// Single source of truth for the chat bar's per-module bias — used both by
// the client (placeholder text) and the server (system prompt bias text).
// A bias only nudges interpretation of ambiguous text; it never restricts
// what can be logged from a given module (food mentioned in Health still
// logs as food).

export const MODULE_BIAS: Record<string, { label: string; bias: string; placeholder: string }> = {
  food: {
    label: 'Food',
    bias: 'a food or meal log',
    placeholder: 'Log a meal… "chicken wrap and a coke" or "log my usual breakfast"',
  },
  health: {
    label: 'Health',
    bias: 'symptoms, sleep, injury, sickness, mood, or weight',
    placeholder: 'How are you feeling? Sleep, symptoms, mood, weight…',
  },
  media: {
    label: 'Media',
    bias: 'a book, film, show, or song update',
    placeholder: '"finished Dune 8/10" or "started reading Project Hail Mary"',
  },
  wardrobe: {
    label: 'Wardrobe',
    bias: 'a clothing item worn',
    placeholder: '"wore the grey hoodie and black cargos"',
  },
  journal: {
    label: 'Journal',
    bias: 'a journal or reflection note',
    placeholder: "What's on your mind today?",
  },
  gym: {
    label: 'Gym',
    bias: 'a workout or exercise set',
    placeholder: '"benched 80kg for 5" or describe your session',
  },
}

export function moduleContextForPath(pathname: string): string | undefined {
  if (pathname.startsWith('/food')) return 'food'
  if (pathname.startsWith('/health')) return 'health'
  if (pathname.startsWith('/media')) return 'media'
  if (pathname.startsWith('/wardrobe')) return 'wardrobe'
  if (pathname.startsWith('/journal')) return 'journal'
  if (pathname.startsWith('/gym')) return 'gym'
  return undefined // Main, Body, Settings, Grid — general, no bias
}
