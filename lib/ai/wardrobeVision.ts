import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// CLAUDE.md rule 5: "no vision APIs except explicitly pre-approved one-offs" —
// this is that one approved exception, used exactly once per new wardrobe item
// (at add-time, not on every view/list render).
const PROPOSE_TOOL: Anthropic.Tool = {
  name: 'propose_wardrobe_item',
  description: 'Propose structured catalog fields for a single clothing item shown in a photo',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Short descriptive name, e.g. "Grey zip-up hoodie"' },
      type: {
        type: 'string',
        enum: ['top', 'bottom', 'dress', 'outerwear', 'footwear', 'accessory', 'underwear', 'activewear', 'other'],
      },
      colours: { type: 'array', items: { type: 'string' }, description: 'Dominant colours, e.g. ["grey","black"]' },
      brand: { type: 'string', description: 'Visible brand/logo, if identifiable — omit if not visible' },
      seasons: {
        type: 'array',
        items: { type: 'string', enum: ['spring', 'summer', 'autumn', 'winter'] },
        description: 'Seasons this item is realistically worn in, based on fabric weight/style',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Short descriptive tags, e.g. "casual", "gym", "formal", "waterproof"',
      },
      needs_review: {
        type: 'array',
        items: { type: 'string', enum: ['name', 'type', 'colours', 'brand', 'seasons', 'tags'] },
        description: 'Field names you are NOT confident about — e.g. brand logo partially obscured/unreadable, colour ambiguous under this lighting, type unclear. Omit fields you are confident about. Empty array if confident about everything.',
      },
    },
    required: ['name', 'type'],
    additionalProperties: false,
  },
}

export interface ProposedWardrobeItem {
  name: string
  type: string
  colours?: string[]
  brand?: string
  seasons?: string[]
  tags?: string[]
  needs_review?: string[]
}

export async function proposeWardrobeItemFromPhoto(
  base64Image: string,
  mediaType: 'image/jpeg' | 'image/png'
): Promise<ProposedWardrobeItem> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 400,
    tool_choice: { type: 'tool', name: 'propose_wardrobe_item' },
    tools: [PROPOSE_TOOL],
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } },
          { type: 'text', text: 'Identify this clothing item and propose catalog fields for it. Flag any field you are genuinely unsure about in needs_review rather than guessing confidently.' },
        ],
      },
    ],
  })

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
  )
  if (!toolUse) throw new Error('Claude did not return a tool_use block for wardrobe photo analysis')
  return toolUse.input as ProposedWardrobeItem
}
