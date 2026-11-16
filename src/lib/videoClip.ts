/**
 * Browser-side video helpers for the video form analysis: recording, trimming/compressing
 * an upload down to a ≤6 s clip, and grabbing still frames for the result figures.
 */
import { VIDEO_MAX_BYTES, VIDEO_MAX_SECONDS } from './videoAnalysis'

const RECORD_BITRATE = 2_500_000
const MAX_EDGE = 720

/** A container format this browser's MediaRecorder can produce that Gemini also accepts. */
export function pickRecorderMime(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  return candidates.find(m => MediaRecorder.isTypeSupported(m)) || ''
}

export const canRecordVideo = () => typeof MediaRecorder !== 'undefined' && pickRecorderMime() !== ''

function waitFor(el: HTMLMediaElement, event: string, timeoutMs = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(new Error(`timed out waiting for ${event}`)) }, timeoutMs)
    const onEvent = () => { cleanup(); resolve() }
    const onError = () => { cleanup(); reject(new Error('video could not be read')) }
    const cleanup = () => { clearTimeout(timer); el.removeEventListener(event, onEvent); el.removeEventListener('error', onError) }
    el.addEventListener(event, onEvent)
    el.addEventListener('error', onError)
  })
}

/**
 * Load a video element and make its duration known. MediaRecorder WebM files report an
 * Infinity duration until you seek past the end, which also makes later seeks reliable.
 */
async function loadVideo(url: string): Promise<HTMLVideoElement> {
  const v = document.createElement('video')
  v.muted = true
  v.playsInline = true
  v.preload = 'auto'
  v.src = url
  await waitFor(v, 'loadedmetadata')
  if (!Number.isFinite(v.duration)) {
    v.currentTime = 1e7
    await waitFor(v, 'durationchange').catch(() => {})
    v.currentTime = 0
    await waitFor(v, 'seeked').catch(() => {})
  }
  return v
}

export async function getVideoDuration(url: string): Promise<number> {
  const v = await loadVideo(url)
  const d = v.duration
  v.removeAttribute('src')
  v.load()
  return Number.isFinite(d) ? d : 0
}

export interface Clip { blob: Blob; url: string; durationSec: number }

/** Record from a live camera stream for `seconds`, reporting progress 0→1. */
export function recordStream(stream: MediaStream, seconds: number, onProgress: (p: number) => void): Promise<Clip> {
  return new Promise((resolve, reject) => {
    const mimeType = pickRecorderMime()
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: RECORD_BITRATE })
    const chunks: Blob[] = []
    const started = performance.now()
    let raf = 0
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
    recorder.onerror = () => { cancelAnimationFrame(raf); reject(new Error('recording failed')) }
    recorder.onstop = () => {
      cancelAnimationFrame(raf)
      const blob = new Blob(chunks, { type: mimeType.split(';')[0] })
      resolve({ blob, url: URL.createObjectURL(blob), durationSec: Math.min(seconds, (performance.now() - started) / 1000) })
    }
    const tick = () => {
      const p = (performance.now() - started) / (seconds * 1000)
      onProgress(Math.min(1, p))
      if (p >= 1) { if (recorder.state === 'recording') recorder.stop() }
      else raf = requestAnimationFrame(tick)
    }
    recorder.start(250)
    raf = requestAnimationFrame(tick)
  })
}

/**
 * Re-record `durationSec` seconds of a video starting at `startSec`, scaled down to ≤720p.
 * Runs in real time (a 6 s clip takes ~6 s). Used for long or very large uploads.
 */
export async function trimAndCompress(url: string, startSec: number, durationSec: number, onProgress: (p: number) => void): Promise<Clip> {
  const mimeType = pickRecorderMime()
  if (!mimeType) throw new Error('This browser cannot re-encode video')
  const v = await loadVideo(url)
  const scale = Math.min(1, MAX_EDGE / Math.min(v.videoWidth, v.videoHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(v.videoWidth * scale / 2) * 2
  canvas.height = Math.round(v.videoHeight * scale / 2) * 2
  const ctx = canvas.getContext('2d')!
  v.currentTime = startSec
  await waitFor(v, 'seeked')
  ctx.drawImage(v, 0, 0, canvas.width, canvas.height)

  const stream = canvas.captureStream(30)
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: RECORD_BITRATE })
  const chunks: Blob[] = []
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
  const stopped = new Promise<void>(resolve => { recorder.onstop = () => resolve() })

  const end = Math.min(v.duration, startSec + durationSec)
  recorder.start(250)
  await v.play()
  await new Promise<void>(resolve => {
    const draw = () => {
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
      onProgress(Math.min(1, (v.currentTime - startSec) / (end - startSec)))
      if (v.currentTime >= end || v.ended) { v.pause(); resolve() }
      else requestAnimationFrame(draw)
    }
    requestAnimationFrame(draw)
  })
  recorder.stop()
  await stopped
  stream.getTracks().forEach(t => t.stop())
  v.removeAttribute('src')
  v.load()
  const blob = new Blob(chunks, { type: mimeType.split(';')[0] })
  return { blob, url: URL.createObjectURL(blob), durationSec: end - startSec }
}

/** Whether an uploaded file can be sent as-is, or must be trimmed/compressed first. */
export function needsReencode(file: File, durationSec: number): boolean {
  const okType = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'].includes(file.type)
  return !okType || file.size > VIDEO_MAX_BYTES || durationSec > VIDEO_MAX_SECONDS + 0.5
}

/** Grab still frames (as JPEG data URLs) at the given times, in order. */
export async function grabFrames(url: string, times: number[], maxWidth = 640): Promise<string[]> {
  const v = await loadVideo(url)
  const scale = Math.min(1, maxWidth / v.videoWidth)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(v.videoWidth * scale)
  canvas.height = Math.round(v.videoHeight * scale)
  const ctx = canvas.getContext('2d')!
  const out: string[] = []
  const last = Number.isFinite(v.duration) ? Math.max(0, v.duration - 0.05) : Infinity
  for (const t of times) {
    v.currentTime = Math.min(Math.max(0, t), last)
    await waitFor(v, 'seeked').catch(() => {})
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
    out.push(canvas.toDataURL('image/jpeg', 0.82))
  }
  v.removeAttribute('src')
  v.load()
  return out
}
