import type { AIProvider, ParsedLog } from '../types'

export class OpenAICompatibleProvider implements AIProvider {
  private baseUrl: string
  private apiKey: string
  private model: string

  constructor() {
    this.baseUrl = process.env.OPENAI_COMPATIBLE_BASE_URL ?? ''
    this.apiKey = process.env.OPENAI_COMPATIBLE_API_KEY ?? ''
    this.model = process.env.OPENAI_COMPATIBLE_MODEL ?? 'llama3'
  }

  async parseLog(text: string): Promise<ParsedLog> {
    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a health data extraction assistant. Parse the user\'s log entry and return a JSON object with any of these keys present in the text: calories (number), protein_g (number), steps (number), workouts (array of {description, duration_minutes?, feeling?, exercises?}), mood (string), water_ml (number), sleep_hours (number), supplements (string[]), notes (string). Omit keys not mentioned.',
          },
          { role: 'user', content: text },
        ],
      }),
    })

    if (!res.ok) throw new Error(`OpenAI-compatible API error: ${res.status}`)

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('Empty response from OpenAI-compatible provider')

    return JSON.parse(content) as ParsedLog
  }
}
