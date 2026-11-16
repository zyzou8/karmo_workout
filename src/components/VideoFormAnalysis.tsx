'use client'

import { AiLabel } from './PageHeader'
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import {
  VIDEO_MAX_SECONDS, VIDEO_MIN_SECONDS, VideoAnalysisResult, VideoQuota,
} from '@/lib/videoAnalysis'
import {
  canRecordVideo, Clip, getVideoDuration, grabFrames, needsReencode, recordStream, trimAndCompress,
} from '@/lib/videoClip'
import { AngleDiagram, ClipTimeline, KeyFrameCard, PhaseStrip, ScoreGauge } from './VideoAnalysisFigures'

type Mode = 'record' | 'upload'
type Busy = null | 'countdown' | 'recording' | 'preparing' | 'analyzing'

interface UploadSource { file: File; url: string; durationSec: number; startSec: number }

interface Frames { phases: (string | undefined)[]; corrections: (string | undefined)[]; angles: (string | undefined)[] }

const RECORD_SECONDS = VIDEO_MAX_SECONDS
const COUNTDOWN_SECONDS = 3

/** All state for the video form analysis, shared by the input and results panels. */
export function useVideoFormAnalysis({ exerciseEn, locale, onAnalyzed }: {
  exerciseEn: string
  locale: string
  onAnalyzed: (formScore: number) => void
}) {
  const [mode, setModeState] = useState<Mode>('record')
  const [clip, setClip] = useState<Clip | null>(null)
  const [upload, setUpload] = useState<UploadSource | null>(null)
  const [busy, setBusy] = useState<Busy>(null)
  const [progress, setProgress] = useState(0)
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [quota, setQuota] = useState<VideoQuota | null>(null)
  const [result, setResult] = useState<VideoAnalysisResult | null>(null)
  const [frames, setFrames] = useState<Frames | null>(null)
  const [cameraOn, setCameraOn] = useState(false)

  const streamRef = useRef<MediaStream | null>(null)
  const previewRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<HTMLVideoElement>(null)
  const [playhead, setPlayhead] = useState(0)

  const refreshQuota = useCallback(async () => {
    try {
      const res = await fetch('/api/analyze-motion-video', { cache: 'no-store' })
      if (res.ok) setQuota(await res.json())
    } catch {}
  }, [])

  useEffect(() => { void refreshQuota() }, [refreshQuota])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (previewRef.current) previewRef.current.srcObject = null
    setCameraOn(false)
  }, [])

  useEffect(() => stopCamera, [stopCamera])

  const clearResult = () => { setResult(null); setFrames(null); setError(null); setPlayhead(0) }

  const resetAll = useCallback(() => {
    stopCamera()
    setClip(null)
    setUpload(null)
    setBusy(null)
    setProgress(0)
    setResult(null)
    setFrames(null)
    setError(null)
  }, [stopCamera])

  const setMode = (m: Mode) => { resetAll(); setModeState(m) }

  const startCamera = async () => {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) return setError('cameraInsecure')
    if (!canRecordVideo()) return setError('noRecorder')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false,
      })
      streamRef.current = stream
      setCameraOn(true)
      requestAnimationFrame(() => { if (previewRef.current) previewRef.current.srcObject = stream })
    } catch {
      setError('cameraDenied')
    }
  }

  const record = async () => {
    const stream = streamRef.current
    if (!stream) return
    clearResult()
    setBusy('countdown')
    for (let i = COUNTDOWN_SECONDS; i > 0; i--) {
      setCountdown(i)
      await new Promise(r => setTimeout(r, 1000))
    }
    setBusy('recording')
    try {
      const c = await recordStream(stream, RECORD_SECONDS, setProgress)
      setClip(c)
      stopCamera()
    } catch {
      setError('recordFailed')
    } finally {
      setBusy(null)
      setProgress(0)
    }
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    clearResult()
    setClip(null)
    if (!file.type.startsWith('video/')) return setError('notVideo')
    const url = URL.createObjectURL(file)
    try {
      const durationSec = await getVideoDuration(url)
      if (durationSec < VIDEO_MIN_SECONDS) { URL.revokeObjectURL(url); return setError('tooShort') }
      setUpload({ file, url, durationSec, startSec: 0 })
    } catch {
      URL.revokeObjectURL(url)
      setError('unreadable')
    }
  }

  const setUploadStart = (startSec: number) => setUpload(u => (u ? { ...u, startSec } : u))

  /** Turn the current upload into a ≤6 s clip, re-encoding only when needed. */
  const prepareUpload = async (): Promise<Clip | null> => {
    if (!upload) return null
    if (!needsReencode(upload.file, upload.durationSec)) {
      return { blob: upload.file, url: upload.url, durationSec: upload.durationSec }
    }
    setBusy('preparing')
    try {
      const len = Math.min(RECORD_SECONDS, upload.durationSec - upload.startSec)
      return await trimAndCompress(upload.url, upload.startSec, len, setProgress)
    } catch {
      setError('prepareFailed')
      return null
    } finally {
      setProgress(0)
    }
  }

  const analyze = async () => {
    setError(null)
    let c = clip
    if (!c && upload) {
      c = await prepareUpload()
      if (!c) { setBusy(null); return }
      setClip(c)
    }
    if (!c) return
    setBusy('analyzing')
    setResult(null)
    setFrames(null)
    try {
      const fd = new FormData()
      const ext = c.blob.type.includes('webm') ? 'webm' : c.blob.type.includes('quicktime') ? 'mov' : 'mp4'
      fd.append('video', c.blob, `clip.${ext}`)
      fd.append('exercise', exerciseEn)
      fd.append('locale', locale)
      fd.append('durationSec', String(c.durationSec))
      const res = await fetch('/api/analyze-motion-video', { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({}))
      if (json.quota) setQuota(json.quota)
      if (!res.ok) { setError(json.error || 'analysisFailed'); return }
      const r: VideoAnalysisResult = json.result
      setResult(r)
      onAnalyzed(r.formScore)
      // Stills from the user's own clip for each figure.
      const times = [
        ...r.phases.map(p => (p.startSec + p.endSec) / 2),
        ...r.corrections.map(x => x.timestampSec),
        ...r.jointAngles.map(a => a.timestampSec),
      ]
      grabFrames(c.url, times).then(imgs => {
        const np = r.phases.length, nc = r.corrections.length
        setFrames({ phases: imgs.slice(0, np), corrections: imgs.slice(np, np + nc), angles: imgs.slice(np + nc) })
      }).catch(() => {})
    } catch {
      setError('network')
    } finally {
      setBusy(null)
    }
  }

  const seek = (t: number) => {
    const v = playerRef.current
    if (!v) return
    v.pause()
    v.currentTime = t
    setPlayhead(t)
    v.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  return {
    mode, setMode, clip, setClip, upload, setUploadStart, busy, progress, countdown, error, quota, result, frames,
    cameraOn, startCamera, stopCamera, record, onFile, analyze, resetAll, previewRef, playerRef, playhead, setPlayhead, seek,
  }
}

export type VideoFormAnalysisState = ReturnType<typeof useVideoFormAnalysis>

function QuotaBadge({ quota }: { quota: VideoQuota | null }) {
  const { t, locale } = useTranslation()
  if (!quota) return null
  const resets = new Date(quota.resetsAtISO).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' })
  return (
    <div className="flex items-center justify-between rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-4 py-3">
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('videoAnalysis.quotaLabel')}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {t('videoAnalysis.quotaLeft').replace('{remaining}', String(quota.remaining)).replace('{limit}', String(quota.limit))}
        </p>
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: quota.limit }, (_, i) => (
          <span key={i} className={`w-2.5 h-6 rounded-full ${i < quota.used ? 'bg-gray-300 dark:bg-gray-700' : 'bg-blue-500'}`} />
        ))}
      </div>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 text-right">{t('videoAnalysis.resets')}<br />{resets}</p>
    </div>
  )
}

const btnPrimary = 'flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors'
const btnSecondary = 'py-2.5 px-4 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm transition-colors disabled:opacity-50'

/** Left column: record or upload a 5–6 s clip and send it for analysis. */
export function VideoInputPanel({ va }: { va: VideoFormAnalysisState }) {
  const { t } = useTranslation()
  const outOfQuota = va.quota != null && va.quota.remaining <= 0
  const busy = va.busy !== null
  const ready = va.clip || va.upload

  return (
    <div className="space-y-4">
      <QuotaBadge quota={va.quota} />

      <div className="flex bg-white dark:bg-gray-900 rounded-xl p-1 border border-gray-200 dark:border-gray-800">
        {(['record', 'upload'] as Mode[]).map(m => (
          <button key={m} type="button" disabled={busy} onClick={() => va.setMode(m)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${va.mode === m ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
            {m === 'record' ? t('videoAnalysis.modeRecord') : t('videoAnalysis.modeUpload')}
          </button>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        {/* Clip ready (recorded or prepared) */}
        {va.clip ? (
          <video key={va.clip.url} src={va.clip.url} controls playsInline className="w-full aspect-video bg-black" />
        ) : va.mode === 'record' ? (
          <div className="aspect-video bg-gray-50 dark:bg-gray-950 relative">
            {va.cameraOn ? (
              <video ref={va.previewRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-500 px-6 text-center">
                <div className="text-5xl">🎥</div>
                <p className="text-sm">{t('videoAnalysis.recordPlaceholder')}</p>
              </div>
            )}
            {va.busy === 'countdown' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="text-7xl font-bold text-white drop-shadow">{va.countdown}</span>
              </div>
            )}
            {va.busy === 'recording' && (
              <>
                <span className="absolute top-3 left-3 flex items-center gap-1.5 text-xs font-semibold text-white bg-red-600 rounded-full px-2.5 py-1">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> REC {(va.progress * RECORD_SECONDS).toFixed(1)}s / {RECORD_SECONDS}s
                </span>
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/30">
                  <div className="h-full bg-red-500" style={{ width: `${va.progress * 100}%` }} />
                </div>
              </>
            )}
          </div>
        ) : va.upload ? (
          <div>
            <video key={va.upload.url} src={va.upload.url} controls playsInline muted className="w-full aspect-video bg-black" />
            {va.upload.durationSec > RECORD_SECONDS + 0.5 && (
              <div className="px-4 pt-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {t('videoAnalysis.pickWindow')
                    .replace('{start}', va.upload.startSec.toFixed(1))
                    .replace('{end}', Math.min(va.upload.durationSec, va.upload.startSec + RECORD_SECONDS).toFixed(1))}
                </p>
                <div className="relative h-6">
                  <div className="absolute top-2.5 left-0 right-0 h-1 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="absolute top-2.5 h-1 rounded bg-blue-500"
                    style={{ left: `${(va.upload.startSec / va.upload.durationSec) * 100}%`, width: `${(RECORD_SECONDS / va.upload.durationSec) * 100}%` }} />
                  <input type="range" min={0} max={Math.max(0, va.upload.durationSec - RECORD_SECONDS)} step={0.1} value={va.upload.startSec}
                    onChange={e => va.setUploadStart(Number(e.target.value))} disabled={busy}
                    aria-label={t('videoAnalysis.pickWindowLabel')} className="absolute inset-0 w-full opacity-60 accent-blue-600" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <label className="block cursor-pointer">
            <div className="aspect-video flex flex-col items-center justify-center gap-2 text-gray-500 px-6 text-center border-2 border-dashed border-transparent hover:border-blue-500 transition-colors">
              <div className="text-5xl">📁</div>
              <p className="text-sm font-medium">{t('videoAnalysis.uploadPrompt')}</p>
              <p className="text-xs">{t('videoAnalysis.uploadHelp')}</p>
            </div>
            <input type="file" accept="video/mp4,video/quicktime,video/webm,video/*" onChange={va.onFile} className="hidden" />
          </label>
        )}

        {(va.busy === 'preparing' || va.busy === 'analyzing') && (
          <div className="px-4 pt-3">
            <div className="flex items-center gap-2 text-xs text-blue-500">
              <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin" />
              {va.busy === 'preparing' ? t('videoAnalysis.preparing') : t('videoAnalysis.analyzing')}
            </div>
            {va.busy === 'preparing' && (
              <div className="mt-2 h-1 rounded bg-gray-200 dark:bg-gray-800"><div className="h-full rounded bg-blue-500" style={{ width: `${va.progress * 100}%` }} /></div>
            )}
          </div>
        )}

        <div className="p-4 flex gap-3">
          {ready ? (
            <>
              <button type="button" onClick={va.resetAll} disabled={busy} className={btnSecondary}>
                {va.mode === 'record' ? t('videoAnalysis.retake') : t('videoAnalysis.changeVideo')}
              </button>
              <button type="button" onClick={va.analyze} disabled={busy || outOfQuota} className={btnPrimary}>
                {va.busy === 'analyzing' ? t('videoAnalysis.analyzing') : t('videoAnalysis.analyzeButton')}
              </button>
            </>
          ) : va.mode === 'record' ? (
            !va.cameraOn ? (
              <button type="button" onClick={va.startCamera} className={btnPrimary}>{t('motion.startCamera')}</button>
            ) : (
              <>
                <button type="button" onClick={va.record} disabled={busy} className={`${btnPrimary} !bg-red-600 hover:!bg-red-700`}>
                  ● {t('videoAnalysis.recordButton').replace('{seconds}', String(RECORD_SECONDS))}
                </button>
                <button type="button" onClick={va.stopCamera} disabled={busy} className={btnSecondary}>{t('motion.cancel')}</button>
              </>
            )
          ) : null}
        </div>
      </div>

      {va.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {t(`videoAnalysis.errors.${va.error}`) === `videoAnalysis.errors.${va.error}` ? t('videoAnalysis.errors.analysisFailed') : t(`videoAnalysis.errors.${va.error}`)}
        </p>
      )}
      {outOfQuota && !va.error && (
        <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">{t('videoAnalysis.errors.quotaExceeded')}</p>
      )}

      <div className="rounded-xl bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-4">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('motion.tipsTitle')}</p>
        <ul className="text-xs text-gray-500 space-y-1">
          {[1, 2, 3, 4].map(i => <li key={i}>• {t(`videoAnalysis.tip${i}`)}</li>)}
        </ul>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">{title}</h4>
      {children}
    </div>
  )
}

/** Right column: the analysis with figures built from the user's own clip. */
export function VideoResultsPanel({ va }: { va: VideoFormAnalysisState }) {
  const { t } = useTranslation()
  const r = va.result

  if (!r) {
    return (
      <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm shadow-gray-200/60 dark:shadow-none">
        {va.busy === 'analyzing' ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('videoAnalysis.analyzingLong')}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-600 px-6 text-center">
            <div className="text-4xl mb-3">🎬</div>
            <p className="text-sm">{t('videoAnalysis.resultsPlaceholder')}</p>
          </div>
        )}
      </div>
    )
  }

  const duration = va.clip?.durationSec || Math.max(1, ...r.phases.map(p => p.endSec))

  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm shadow-gray-200/60 dark:shadow-none p-5 space-y-6">
      {/* Score + summary */}
      <div className="flex items-center gap-5">
        <ScoreGauge score={r.formScore} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('honest.confidenceBand')}</h3>
            <AiLabel>{t('honest.aiCue')}</AiLabel>
          </div>
          <p className="text-[11px] text-gray-400 mb-1">{t('honest.bandHint')}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">{r.summary}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {r.repCount > 0 && <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300">🔁 {r.repCount} {t('videoAnalysis.reps')}</span>}
            {r.tempo && <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">⏱ {r.tempo}</span>}
          </div>
        </div>
      </div>

      {/* Player + timeline */}
      {va.clip && (
        <div className="space-y-2">
          <video ref={va.playerRef} src={va.clip.url} controls playsInline muted className="w-full rounded-lg bg-black max-h-72"
            onTimeUpdate={e => va.setPlayhead(e.currentTarget.currentTime)} />
          <ClipTimeline duration={duration} phases={r.phases} corrections={r.corrections} current={va.playhead} onSeek={va.seek} />
        </div>
      )}

      {r.phases.length > 0 && (
        <Section title={t('videoAnalysis.phasesTitle')}>
          <PhaseStrip phases={r.phases} frames={va.frames?.phases || []} onSeek={va.seek} />
        </Section>
      )}

      {r.corrections.length > 0 && (
        <Section title={t('videoAnalysis.correctionsTitle')}>
          <div className="grid sm:grid-cols-2 gap-3">
            {r.corrections.map((c, i) => (
              <KeyFrameCard key={i} index={i} correction={c} frame={va.frames?.corrections[i]} onSeek={va.seek} />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">{t('videoAnalysis.markerNote')}</p>
        </Section>
      )}

      {r.jointAngles.length > 0 && (
        <Section title={t('videoAnalysis.anglesTitle')}>
          <div className="space-y-3">
            {r.jointAngles.map((a, i) => <AngleDiagram key={i} angle={a} frame={va.frames?.angles[i]} onSeek={va.seek} />)}
          </div>
        </Section>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {r.strengths.length > 0 && (
          <Section title={t('videoAnalysis.strengthsTitle')}>
            <ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
              {r.strengths.map((s, i) => <li key={i} className="flex gap-2"><span className="text-emerald-500">✓</span>{s}</li>)}
            </ul>
          </Section>
        )}
        {r.safety.length > 0 && (
          <Section title={t('videoAnalysis.safetyTitle')}>
            <ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
              {r.safety.map((s, i) => <li key={i} className="flex gap-2"><span>⚠️</span>{s}</li>)}
            </ul>
          </Section>
        )}
      </div>

      {r.cues.length > 0 && (
        <Section title={t('videoAnalysis.cuesTitle')}>
          <div className="flex flex-wrap gap-2">
            {r.cues.map((c, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 text-sm font-medium text-blue-700 dark:text-blue-300">
                “{c}”
              </span>
            ))}
          </div>
        </Section>
      )}

      <p className="text-[11px] text-gray-400 dark:text-gray-500">{t('disclaimer.aiNotice')}</p>
    </div>
  )
}
