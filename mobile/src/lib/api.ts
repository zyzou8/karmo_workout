// Base URL of the existing Next.js backend (the karmo_workout web app),
// which still owns the OpenAI key and the /api/analyze-* routes.
// Set EXPO_PUBLIC_API_URL to your computer's LAN IP, e.g. http://192.168.1.23:3000
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'

export interface PickedImage {
  uri: string
  name: string
  type: string
}

/** Appends a picked image in the shape React Native's FormData/XHR expects. */
export function appendImage(formData: FormData, image: PickedImage) {
  // @ts-expect-error React Native FormData accepts { uri, name, type } for files.
  formData.append('image', { uri: image.uri, name: image.name, type: image.type })
}

/**
 * POSTs formData and streams the plain-text response, calling onChunk as new
 * text arrives. React Native's fetch() does not expose a readable stream
 * body, so this uses XMLHttpRequest's progressive `responseText` growth
 * (the standard RN workaround for consuming a streaming HTTP response).
 */
export function streamPost(
  path: string,
  formData: FormData,
  onChunk: (fullText: string) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    let lastLength = 0

    xhr.open('POST', `${API_BASE_URL}${path}`)

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
        } else {
          reject(new Error(xhr.responseText || `Request failed with status ${xhr.status}`))
        }
      }
    }

    xhr.onerror = () => reject(new Error('Network error — is the API server reachable from your phone?'))
    xhr.send(formData)
  })
}
