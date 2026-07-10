import type { AIProvider } from './types'

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER ?? 'claude'

  if (provider === 'openai-compatible') {
    // M18 (BUGS.md): OpenAICompatibleProvider's prompt only covers ~9 of the
    // ~28 fields ParsedLogSchema validates — it was never updated alongside
    // the schema and would silently drop most logging categories (weight,
    // habits, sick/injury tracking, media, countries, world clocks,
    // Mounjaro, backdating, muscle soreness) if used as-is. Require an
    // explicit second flag so this can't be turned on by accident.
    if (process.env.AI_PROVIDER_ACKNOWLEDGE_INCOMPLETE !== 'true') {
      throw new Error(
        'AI_PROVIDER=openai-compatible is out of sync with ParsedLogSchema (see lib/ai/providers/openai-compatible.ts) ' +
        'and will silently drop most fields if used. Update its prompt to cover every ParsedLogSchema field, then set ' +
        'AI_PROVIDER_ACKNOWLEDGE_INCOMPLETE=true to confirm you have done so.'
      )
    }
    const { OpenAICompatibleProvider } = require('./providers/openai-compatible')
    return new OpenAICompatibleProvider()
  }

  const { ClaudeProvider } = require('./providers/claude')
  return new ClaudeProvider()
}
