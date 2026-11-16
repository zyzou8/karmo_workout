import { API_BASE_URL } from './api'

export class StreamError extends Error {
  kind: 'network' | 'timeout' | 'http'
  constructor(message: string, kind: 'network' | 'timeout' | 'http') {
    super(message)
    this.kind = kind
  }
}

const DEFAULT_TIMEOUT_MS = 55000

/**
 * POSTs formData and streams the plain-text response, calling onChunk as new
 * text arrives. Same progressive-responseText approach as api.ts's streamPost,
 * plus a timeout and typed errors so screens can show friendly, localized messages.
 */
export function streamAnalysis(
  path: string,
  formData: FormData,
  onChunk: (fullText: string) => void,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    let lastLength = 0

    xhr.open('POST', `${API_BASE_URL}${path}`)
    xhr.timeout = timeoutMs

    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.LOADING || xhr.readyState === XMLHttpRequest.DONE) {
        const full = xhr.responseText
        if (full.length > lastLength) {
          lastLength = full.length
          onChunk(full)
        }
      }
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.responseText)
        } else if (xhr.status > 0) {
          reject(new StreamError(xhr.responseText || `Request failed with status ${xhr.status}`, 'http'))
        }
        // status 0 with DONE and no explicit error/timeout event fired is handled by onerror/ontimeout below.
      }
    }

    xhr.ontimeout = () => reject(new StreamError('Request timed out', 'timeout'))
    xhr.onerror = () => reject(new StreamError('Network error', 'network'))
    xhr.send(formData)
  })
}
