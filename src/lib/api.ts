export type StreamErrorKind = 'network' | 'timeout' | 'http'

export class StreamError extends Error {
  kind: StreamErrorKind
  constructor(kind: StreamErrorKind, message: string) {
    super(message)
    this.kind = kind
  }
}

const DEFAULT_TIMEOUT_MS = 55000

export async function streamAnalysis(
  url: string,
  formData: FormData,
  onChunk: (fullText: string) => void,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    let res: Response
    try {
      res = await fetch(url, { method: 'POST', body: formData, signal: controller.signal })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new StreamError('timeout', 'Request timed out')
      }
      throw new StreamError('network', err instanceof Error ? err.message : 'Network error')
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new StreamError('http', text || `Request failed (${res.status})`)
    }
    if (!res.body) {
      throw new StreamError('http', 'No response stream')
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let fullText = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      fullText += decoder.decode(value, { stream: true })
      onChunk(fullText)
    }
    return fullText
  } finally {
    clearTimeout(timer)
  }
}
