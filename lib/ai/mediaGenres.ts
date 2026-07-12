import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const GENRE_LIST = [
  'crime', 'horror', 'comedy', 'documentary', 'drama', 'thriller', 'action', 'sci-fi',
  'romance', 'reality', 'fantasy', 'mystery', 'biography', 'family', 'animation', 'war',
  'musical', 'sport', 'history', 'adventure',
] as const

export type MediaGenre = typeof GENRE_LIST[number]

const TAG_TOOL: Anthropic.Tool = {
  name: 'tag_media_genres',
  description: 'Assign 1-3 genres to each media item, by index, from the fixed genre list',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            index: { type: 'integer', description: 'The item\'s index from the input list' },
            genres: { type: 'array', items: { type: 'string', enum: [...GENRE_LIST] }, minItems: 1, maxItems: 3 },
          },
          required: ['index', 'genres'],
          additionalProperties: false,
        },
      },
    },
    required: ['items'],
    additionalProperties: false,
  },
}

export interface MediaGenreInput {
  index: number
  title: string
  category: 'film' | 'show' | 'book' | 'song'
}

/** One-time batched genre-tagging pass over existing media_log titles — a single Claude call for the whole
 * list rather than one call per item, per CLAUDE.md's "keep AI usage cheap" rule. Title-only (no plot
 * synopsis lookup), so genre calls are best-effort based on what the model already knows about each title. */
export async function tagMediaGenres(inputItems: MediaGenreInput[]): Promise<Map<number, MediaGenre[]>> {
  const list = inputItems.map((i) => `${i.index}. "${i.title}" (${i.category})`).join('\n')

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    tool_choice: { type: 'tool', name: 'tag_media_genres' },
    tools: [TAG_TOOL],
    messages: [
      {
        role: 'user',
        content: `Assign 1-3 genres to each of these films/shows, based on the title (and your knowledge of the actual title if you recognise it). Use only genres from the allowed list. Every single index must appear exactly once in your response.\n\n${list}`,
      },
    ],
  })

  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
  if (!toolUse) throw new Error('Claude did not return a tool_use block for genre tagging')

  const result = toolUse.input as { items: { index: number; genres: string[] }[] }
  const map = new Map<number, MediaGenre[]>()
  for (const item of result.items) {
    map.set(item.index, item.genres.filter((g): g is MediaGenre => (GENRE_LIST as readonly string[]).includes(g)))
  }
  return map
}
