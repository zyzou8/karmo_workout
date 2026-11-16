'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/lib/i18n/LanguageContext'

const PRESETS = [30, 60, 90, 120]

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** Rest timer quick tool: 30/60/90/120 s presets, ±5 s (App Flow: Real Timer). */
export function RestTimer({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [total, setTotal] = useState(90)
  const [left, setLeft] = useState(90)
  const [running, setRunning] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!running) return
    timer.current = setInterval(() => setLeft(l => Math.max(0, l - 1)), 1000)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [running])

  useEffect(() => {
    if (left === 0 && running) {
      setRunning(false)
      try {
        navigator.vibrate?.(300)
      } catch {}
    }
  }, [left, running])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const pick = (s: number) => { setTotal(s); setLeft(s); setRunning(false) }
  const nudge = (d: number) => { setLeft(l => Math.max(0, l + d)); setTotal(tt => Math.max(5, tt + d)) }

  const pct = total ? left / total : 0
  const r = 54
  const c = 2 * Math.PI * r

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('restTimer.title')}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-gray-50 dark:bg-gray-900 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl text-olive-800 dark:text-gray-50">{t('restTimer.title')}</h2>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">{t('restTimer.close')}</button>
        </div>

        <div className="flex justify-center my-2">
          <div className="relative w-40 h-40">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r={r} fill="none" strokeWidth="8" className="stroke-gray-200 dark:stroke-gray-800" />
              <circle cx="60" cy="60" r={r} fill="none" strokeWidth="8" strokeLinecap="round"
                className="stroke-olive-500 dark:stroke-sage-300 transition-[stroke-dashoffset] duration-1000 ease-linear"
                strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-4xl text-olive-800 dark:text-gray-50 tabular-nums" aria-live="polite">{fmt(left)}</span>
            </div>
          </div>
        </div>
        {left === 0 && <p className="text-center text-sm font-bold text-olive-600 dark:text-sage-300 mb-2">{t('restTimer.done')}</p>}

        <div className="grid grid-cols-4 gap-2 mt-3">
          {PRESETS.map(p => (
            <button key={p} onClick={() => pick(p)}
              className={`py-2.5 rounded-xl text-sm font-bold transition-colors ${total === p && !running ? 'bg-olive-800 text-white dark:bg-sage-300 dark:text-gray-900' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700'}`}>
              {p}s
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2 mt-2">
          <button onClick={() => nudge(-5)} className="py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-200">−5s</button>
          <button onClick={() => setRunning(r => !r)} disabled={left === 0}
            className="col-span-2 py-3 rounded-xl bg-olive-800 dark:bg-sage-300 text-white dark:text-gray-900 font-bold disabled:opacity-40">
            {running ? t('restTimer.pause') : t('restTimer.start')}
          </button>
          <button onClick={() => nudge(5)} className="py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-200">+5s</button>
        </div>
        <button onClick={() => pick(total)} className="mt-2 w-full py-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">{t('restTimer.reset')}</button>
      </div>
    </div>
  )
}
