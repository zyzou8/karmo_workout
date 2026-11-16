'use client'

import { useTranslation } from '@/lib/i18n/LanguageContext'
import { JointAngle, Severity, VideoCorrection, VideoPhase } from '@/lib/videoAnalysis'

const SEVERITY_STYLE: Record<Severity, { ring: string; badge: string; marker: string; hex: string }> = {
  low: { ring: 'border-sky-400', badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-300', marker: 'bg-sky-400', hex: '#38bdf8' },
  medium: { ring: 'border-amber-400', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-300', marker: 'bg-amber-400', hex: '#fbbf24' },
  high: { ring: 'border-red-500', badge: 'bg-red-500/10 text-red-600 dark:text-red-300', marker: 'bg-red-500', hex: '#ef4444' },
}

const PHASE_COLORS = ['bg-blue-500/70', 'bg-cyan-500/70', 'bg-indigo-500/70', 'bg-teal-500/70', 'bg-violet-500/70', 'bg-sky-500/70']

const fmt = (s: number) => `${s.toFixed(1)}s`

function scoreColor(score: number) {
  if (score >= 8) return '#647849'
  if (score >= 5) return '#f59e0b'
  return '#ef4444'
}

/** Score → coarse band. Honest AI: show a band, not a fake precise score. */
export function scoreBand(score: number): 'bandSolid' | 'bandMixed' | 'bandWork' {
  if (score >= 8) return 'bandSolid'
  if (score >= 5) return 'bandMixed'
  return 'bandWork'
}

/** Ring gauge showing the confidence band for the 0–10 form score (no precise number as the headline). */
export function ScoreGauge({ score }: { score: number }) {
  const { t } = useTranslation()
  const r = 42
  const c = 2 * Math.PI * r
  const color = scoreColor(score)
  const band = t(`honest.${scoreBand(score)}`)
  // Draw a soft band (±1 point) rather than a single precise arc end.
  const lo = Math.max(0, score - 1) / 10
  const hi = Math.min(10, score + 1) / 10
  return (
    <div className="relative w-28 h-28 shrink-0" role="img" aria-label={`${t('honest.confidenceBand')}: ${band}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-gray-200 dark:stroke-gray-800" />
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" stroke={color} strokeOpacity={0.35} strokeLinecap="round"
          strokeDasharray={`${hi * c} ${c}`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" stroke={color} strokeLinecap="round"
          strokeDasharray={`${lo * c} ${c}`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
        <span className="font-display text-sm leading-tight text-gray-900 dark:text-white">{band}</span>
      </div>
    </div>
  )
}

/** The clip as a bar: phases as coloured segments, issues as markers, plus a playhead. Click to seek. */
export function ClipTimeline({ duration, phases, corrections, current, onSeek }: {
  duration: number; phases: VideoPhase[]; corrections: VideoCorrection[]; current: number; onSeek: (t: number) => void
}) {
  const { t } = useTranslation()
  const pct = (s: number) => `${Math.min(100, Math.max(0, (s / duration) * 100))}%`
  return (
    <div>
      <div
        className="relative h-9 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden cursor-pointer"
        onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect()
          onSeek(((e.clientX - rect.left) / rect.width) * duration)
        }}
        role="slider" aria-label={t('videoAnalysis.timeline')} aria-valuemin={0} aria-valuemax={duration} aria-valuenow={current} tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'ArrowRight') onSeek(Math.min(duration, current + 0.25))
          if (e.key === 'ArrowLeft') onSeek(Math.max(0, current - 0.25))
        }}
      >
        {phases.map((p, i) => (
          <div key={i} className={`absolute top-0 bottom-0 ${PHASE_COLORS[i % PHASE_COLORS.length]} border-r border-white/40 dark:border-gray-900/40 flex items-center px-1.5 overflow-hidden`}
            style={{ left: pct(p.startSec), width: pct(p.endSec - p.startSec) }} title={`${p.name} (${fmt(p.startSec)}–${fmt(p.endSec)})`}>
            <span className="text-[10px] font-medium text-white truncate">{p.name}</span>
          </div>
        ))}
        <div className="absolute top-0 bottom-0 w-0.5 bg-gray-900 dark:bg-white pointer-events-none" style={{ left: pct(current) }} />
      </div>
      {/* Issue markers under the bar */}
      <div className="relative h-5 mt-1">
        {corrections.map((c, i) => (
          <button key={i} type="button" onClick={() => onSeek(c.timestampSec)} title={`${c.issue} @ ${fmt(c.timestampSec)}`}
            className={`absolute -translate-x-1/2 top-0 w-4 h-4 rounded-full ${SEVERITY_STYLE[c.severity].marker} text-[9px] font-bold text-white flex items-center justify-center shadow`}
            style={{ left: pct(c.timestampSec) }}>
            {i + 1}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
        <span>0s</span><span>{fmt(duration)}</span>
      </div>
    </div>
  )
}

/** One still per phase, so the user sees the movement broken into steps. */
export function PhaseStrip({ phases, frames, onSeek }: { phases: VideoPhase[]; frames: (string | undefined)[]; onSeek: (t: number) => void }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, phases.length)}, minmax(0, 1fr))` }}>
      {phases.map((p, i) => (
        <button key={i} type="button" onClick={() => onSeek((p.startSec + p.endSec) / 2)} className="text-left group">
          <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
            {frames[i] && <img src={frames[i]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />}
            <span className={`absolute top-1 left-1 text-[10px] font-bold text-white px-1.5 py-0.5 rounded ${PHASE_COLORS[i % PHASE_COLORS.length]}`}>{i + 1}</span>
          </div>
          <p className="mt-1 text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{p.name}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">{p.description}</p>
        </button>
      ))}
    </div>
  )
}

/** A frame from the user's own video with the problem area circled, and the fix underneath. */
export function KeyFrameCard({ index, correction, frame, onSeek }: { index: number; correction: VideoCorrection; frame?: string; onSeek: (t: number) => void }) {
  const { t } = useTranslation()
  const s = SEVERITY_STYLE[correction.severity]
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
      <div className="relative bg-black">
        {frame ? <img src={frame} alt={correction.issue} className="w-full max-h-72 object-contain" /> : <div className="aspect-video" />}
        {frame && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="relative w-full h-full">
              <span className={`absolute w-14 h-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] ${s.ring} animate-pulse`}
                style={{ left: `${correction.focusX * 100}%`, top: `${correction.focusY * 100}%`, boxShadow: '0 0 0 2px rgba(0,0,0,0.35)' }} />
              <span className="absolute -translate-x-1/2 text-[11px] font-semibold text-white bg-black/70 rounded px-1.5 py-0.5 whitespace-nowrap"
                style={{ left: `${correction.focusX * 100}%`, top: `calc(${correction.focusY * 100}% + 32px)` }}>
                {correction.bodyPart}
              </span>
            </div>
          </div>
        )}
        <span className={`absolute top-2 left-2 w-6 h-6 rounded-full ${s.marker} text-white text-xs font-bold flex items-center justify-center`}>{index + 1}</span>
        <button type="button" onClick={() => onSeek(correction.timestampSec)}
          className="absolute top-2 right-2 text-[11px] font-medium text-white bg-black/60 hover:bg-black/80 rounded-full px-2 py-0.5">
          ▶ {fmt(correction.timestampSec)}
        </button>
      </div>
      <div className="p-3 space-y-2">
        <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${s.badge}`}>
          {t(`videoAnalysis.severity.${correction.severity}`)}
        </span>
        <p className="text-sm text-gray-800 dark:text-gray-200 flex gap-2"><span className="text-red-500 font-bold">✗</span>{correction.issue}</p>
        <p className="text-sm text-gray-800 dark:text-gray-200 flex gap-2"><span className="text-emerald-500 font-bold">✓</span>{correction.fix}</p>
      </div>
    </div>
  )
}

/** Protractor-style figure: target range as a green wedge, the user's angle as a ray. */
export function AngleDiagram({ angle, frame, onSeek }: { angle: JointAngle; frame?: string; onSeek: (t: number) => void }) {
  const { t } = useTranslation()
  const inRange = angle.observedDeg >= angle.targetMinDeg && angle.observedDeg <= angle.targetMaxDeg
  const cx = 70, cy = 78, R = 58
  const pt = (deg: number, r = R) => {
    const rad = (deg * Math.PI) / 180
    return [cx + r * Math.cos(rad), cy - r * Math.sin(rad)] as const
  }
  const [tx1, ty1] = pt(angle.targetMinDeg)
  const [tx2, ty2] = pt(angle.targetMaxDeg)
  const [ox, oy] = pt(angle.observedDeg)
  const [ax, ay] = pt(angle.observedDeg, 22)
  const [lx, ly] = pt(angle.observedDeg / 2, 32)
  const large = angle.targetMaxDeg - angle.targetMinDeg > 180 ? 1 : 0
  const obsColor = inRange ? '#10b981' : '#f59e0b'
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 flex gap-3">
      {frame && (
        <button type="button" onClick={() => onSeek(angle.timestampSec)} className="w-24 shrink-0 rounded-lg overflow-hidden bg-black">
          <img src={frame} alt={angle.joint} className="w-full h-full object-cover" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{angle.joint}</p>
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 140 92" className="w-36 h-24 shrink-0" role="img"
            aria-label={`${angle.joint}: ${Math.round(angle.observedDeg)}°, ${t('videoAnalysis.target')} ${Math.round(angle.targetMinDeg)}–${Math.round(angle.targetMaxDeg)}°`}>
            {/* protractor */}
            <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`} fill="none" className="stroke-gray-200 dark:stroke-gray-700" strokeWidth="1.5" />
            {/* target wedge */}
            <path d={`M ${cx} ${cy} L ${tx1} ${ty1} A ${R} ${R} 0 ${large} 0 ${tx2} ${ty2} Z`} fill="#10b981" fillOpacity="0.18" stroke="#10b981" strokeOpacity="0.5" />
            {/* base segment */}
            <line x1={cx} y1={cy} x2={cx + R} y2={cy} className="stroke-gray-400 dark:stroke-gray-500" strokeWidth="3" strokeLinecap="round" />
            {/* observed segment + arc */}
            <line x1={cx} y1={cy} x2={ox} y2={oy} stroke={obsColor} strokeWidth="3.5" strokeLinecap="round" />
            <path d={`M ${cx + 22} ${cy} A 22 22 0 0 0 ${ax} ${ay}`} fill="none" stroke={obsColor} strokeWidth="1.5" />
            <circle cx={cx} cy={cy} r="4" className="fill-gray-700 dark:fill-gray-200" />
            <text x={lx} y={ly} fontSize="10" fontWeight="700" fill={obsColor} textAnchor="middle">{Math.round(angle.observedDeg)}°</text>
          </svg>
          <div className="text-xs space-y-1">
            <p><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1 align-middle" style={{ background: obsColor }} />{t('videoAnalysis.yours')}: <b>{Math.round(angle.observedDeg)}°</b></p>
            <p><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1 align-middle bg-emerald-500/40" />{t('videoAnalysis.target')}: <b>{Math.round(angle.targetMinDeg)}–{Math.round(angle.targetMaxDeg)}°</b></p>
            <p className={inRange ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
              {inRange ? t('videoAnalysis.inRange') : t('videoAnalysis.outOfRange')}
            </p>
          </div>
        </div>
        {angle.note && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{angle.note}</p>}
      </div>
    </div>
  )
}
