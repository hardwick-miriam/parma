import type { AIProvider } from './types'

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER ?? 'claude'

  if (provider === 'openai-compatible') {
    const { OpenAICompatibleProvider } = require('./providers/openai-compatible')
    return new OpenAICompatibleProvider()
  }

  const { ClaudeProvider } = require('./providers/claude')
  return new ClaudeProvider()
}
