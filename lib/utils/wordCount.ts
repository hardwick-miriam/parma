export function getWordCount(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

export function getReadingTime(wordCount: number): string {
  const minutes = Math.ceil(wordCount / 200)
  return minutes === 1 ? '1 min read' : `${minutes} min read`
}

export function extractPlainText(content: object | null): string {
  if (!content) return ''
  try {
    const extract = (node: Record<string, unknown>): string => {
      if (node.type === 'text') return (node.text as string) || ''
      if (node.content && Array.isArray(node.content)) {
        return (node.content as Record<string, unknown>[]).map(extract).join(' ')
      }
      return ''
    }
    return extract(content as Record<string, unknown>)
  } catch {
    return ''
  }
}
