'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { PageHeader } from '@/components/PageHeader'
import {
  BODY_PART_SLUGS, BodyPartSlug, WorkoutEntry,
  bestWeightKg, loadWorkoutLog, saveWorkoutLog,
} from '@/lib/workoutLog'
import { UnitPrefs, displayToKg, kgToDisplay, useUnits, weightLabel } from '@/lib/units'

interface SetRow { reps: string; weight: string }

const emptyRow = (): SetRow => ({ reps: '', weight: '' })

/** Setline-style workout log: fast sets / reps / weight, history stays with the exercise. */
export default function WorkoutLogPage() {
  const { t, locale } = useTranslation()
  const [units] = useUnits()
  const [unit, setUnit] = useState<UnitPrefs['weight']>('lb')
  const [log, setLog] = useState<WorkoutEntry[]>([])
  const [bodyPart, setBodyPart] = useState<BodyPartSlug>('chest')
  const [exercise, setExercise] = useState('Bench Press')
  const [rows, setRows] = useState<SetRow[]>([emptyRow(), emptyRow(), emptyRow()])
  const [remarks, setRemarks] = useState('')
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => { setLog(loadWorkoutLog()) }, [])
  useEffect(() => { setUnit(units.weight) }, [units.weight])

  const switchUnit = (next: UnitPrefs['weight']) => {
    if (next === unit) return
    // Convert what's typed so the numbers keep their meaning.
    setRows(rs => rs.map(r => {
      const n = parseFloat(r.weight)
      return Number.isFinite(n) ? { ...r, weight: String(kgToDisplay(displayToKg(n, unit), next)) } : r
    }))
    setUnit(next)
  }

  const recentExercises = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const e of [...log].sort((a, b) => b.dateISO.localeCompare(a.dateISO))) {
      const key = e.exercise.trim().toLowerCase()
      if (e.source === 'motion' || seen.has(key)) continue
      seen.add(key)
      out.push(e.exercise)
      if (out.length >= 6) break
    }
    return out
  }, [log])

  const previousBestKg = useMemo(() => bestWeightKg(log, exercise), [log, exercise])
  const history = useMemo(() => {
    const name = exercise.trim().toLowerCase()
    return log
      .filter(e => e.exercise.trim().toLowerCase() === name && e.source !== 'motion')
      .sort((a, b) => b.dateISO.localeCompare(a.dateISO))
      .slice(0, 8)
  }, [log, exercise])

  const updateRow = (i: number, patch: Partial<SetRow>) => setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const save = () => {
    const sets = rows
      .map(r => ({ reps: parseInt(r.reps, 10), weight: parseFloat(r.weight) }))
      .filter(s => Number.isFinite(s.reps) && s.reps > 0)
      .map(s => ({ reps: s.reps, weightKg: Number.isFinite(s.weight) ? Math.round(displayToKg(s.weight, unit) * 100) / 100 : 0 }))
    if (!exercise.trim() || sets.length === 0) {
      setMessage({ kind: 'error', text: t('log.needExercise') })
      return
    }
    const entry: WorkoutEntry = {
      id: crypto.randomUUID(),
      dateISO: new Date().toISOString(),
      exercise: exercise.trim(),
      source: 'manual',
      bodyPart,
      setDetails: sets,
      sets: sets.length,
      reps: Math.max(...sets.map(s => s.reps)),
      weightKg: Math.max(...sets.map(s => s.weightKg)) || undefined,
      note: remarks.trim() || undefined,
    }
    const next = [entry, ...log]
    saveWorkoutLog(next)
    setLog(next)
    setRows([emptyRow(), emptyRow(), emptyRow()])
    setRemarks('')
    setMessage({ kind: 'ok', text: t('log.saved') })
  }

  const dateFmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })
  const field = 'w-full h-14 rounded-2xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 px-3 text-center text-lg font-bold text-gray-900 dark:text-white tabular-nums focus:outline-none focus:border-olive-500 dark:focus:border-sage-300'

  return (
    <div className="min-h-screen">
      <PageHeader title={t('log.title')} back={{ href: '/train', label: t('tabs.train') }} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Body part */}
        <section>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 px-1">{t('log.bodyPart')}</p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
            {BODY_PART_SLUGS.map(bp => (
              <button key={bp} type="button" onClick={() => setBodyPart(bp)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold border transition-colors ${
                  bodyPart === bp
                    ? 'bg-olive-800 border-olive-800 text-white dark:bg-sage-300 dark:border-sage-300 dark:text-gray-900'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300'
                }`}>
                {t(`log.bodyParts.${bp}`)}
              </button>
            ))}
          </div>
        </section>

        {/* Exercise + sets card */}
        <section className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800 p-4 sm:p-5">
          <div className="flex items-end gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <label htmlFor="log-exercise" className="text-xs font-bold uppercase tracking-wider text-gray-500 px-1">{t('log.exercise')}</label>
              <input id="log-exercise" list="log-recent" value={exercise} onChange={e => setExercise(e.target.value)}
                placeholder={t('log.exercisePlaceholder')}
                className="mt-1 w-full font-display text-2xl bg-transparent border-b border-gray-200 dark:border-gray-800 py-1 px-1 text-olive-800 dark:text-gray-50 focus:outline-none focus:border-olive-500" />
              <datalist id="log-recent">{recentExercises.map(n => <option key={n} value={n} />)}</datalist>
            </div>
            {/* kg / lb toggle */}
            <div role="group" aria-label={t('settingsPage.weightUnit')} className="flex rounded-full bg-gray-100 dark:bg-gray-800 p-1 shrink-0">
              {(['kg', 'lb'] as const).map(u => (
                <button key={u} type="button" onClick={() => switchUnit(u)} aria-pressed={unit === u}
                  className={`px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${unit === u ? 'bg-olive-800 text-white dark:bg-sage-300 dark:text-gray-900' : 'text-gray-500'}`}>
                  {u}
                </button>
              ))}
            </div>
          </div>

          {recentExercises.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-4">
              {recentExercises.map(n => (
                <button key={n} type="button" onClick={() => setExercise(n)}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-sage-300/40 dark:bg-sage-300/10 text-olive-700 dark:text-sage-300">{n}</button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-[3rem_1fr_1fr_2.5rem] gap-2 items-center text-xs font-bold uppercase tracking-wider text-gray-500 px-1 mb-2">
            <span>{t('log.set')}</span><span className="text-center">{t('log.reps')}</span><span className="text-center">{t('log.weight')} ({weightLabel(unit)})</span><span />
          </div>
          <div className="space-y-2">
            {rows.map((r, i) => {
              const w = parseFloat(r.weight)
              const isBest = Number.isFinite(w) && previousBestKg > 0 && displayToKg(w, unit) > previousBestKg + 0.01 && parseInt(r.reps, 10) > 0
              return (
                <div key={i}>
                  <div className="grid grid-cols-[3rem_1fr_1fr_2.5rem] gap-2 items-center">
                    <span className="w-10 h-10 rounded-full bg-sage-300/50 dark:bg-sage-300/15 text-olive-800 dark:text-sage-300 font-display text-lg flex items-center justify-center">{i + 1}</span>
                    <input aria-label={`${t('log.set')} ${i + 1} ${t('log.reps')}`} inputMode="numeric" placeholder="—" value={r.reps}
                      onChange={e => updateRow(i, { reps: e.target.value.replace(/[^0-9]/g, '') })} className={field} />
                    <input aria-label={`${t('log.set')} ${i + 1} ${t('log.weight')}`} inputMode="decimal" placeholder="—" value={r.weight}
                      onChange={e => updateRow(i, { weight: e.target.value.replace(/[^0-9.]/g, '') })} className={field} />
                    <button type="button" aria-label={t('log.removeSet')} disabled={rows.length === 1}
                      onClick={() => setRows(rs => rs.filter((_, idx) => idx !== i))}
                      className="w-10 h-10 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-500/10 disabled:opacity-30">×</button>
                  </div>
                  {isBest && (
                    <p className="ml-14 mt-1 text-xs font-bold text-olive-600 dark:text-sage-300" title={t('log.personalBestHint')}>🌿 {t('log.personalBest')}</p>
                  )}
                </div>
              )
            })}
          </div>
          <button type="button" onClick={() => setRows(rs => [...rs, { reps: rs[rs.length - 1]?.reps || '', weight: rs[rs.length - 1]?.weight || '' }])}
            className="mt-3 w-full h-12 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-olive-700 dark:text-sage-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-800/50">
            {t('log.addSet')}
          </button>

          <label htmlFor="log-remarks" className="block mt-4 text-xs font-bold uppercase tracking-wider text-gray-500 px-1">{t('log.remarks')}</label>
          <input id="log-remarks" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder={t('log.remarksPlaceholder')}
            className="mt-1 w-full h-12 rounded-2xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 px-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-olive-500" />

          {message && (
            <p role="status" className={`mt-3 text-sm font-bold ${message.kind === 'ok' ? 'text-olive-600 dark:text-sage-300' : 'text-red-600 dark:text-red-400'}`}>{message.text}</p>
          )}
          <button type="button" onClick={save}
            className="mt-4 w-full h-14 rounded-2xl bg-olive-800 dark:bg-sage-300 text-white dark:text-gray-900 font-bold text-base hover:opacity-90 transition-opacity">
            {t('log.save')}
          </button>
          <p className="mt-2 text-[11px] text-gray-400 text-center">{t('log.unitsNote')} · {t('log.personalBestHint')}</p>
        </section>

        {/* History on this exercise */}
        <section className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800 p-4 sm:p-5">
          <h2 className="text-lg text-olive-800 dark:text-gray-50 mb-2">{t('log.history')}</h2>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('log.historyEmpty')}</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {history.map(h => (
                <li key={h.id} className="py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-gray-700 dark:text-gray-200">{dateFmt.format(new Date(h.dateISO))}</span>
                    <span className="text-xs text-gray-500">{t('log.setsSummary').replace('{sets}', String(h.setDetails?.length ?? h.sets ?? 0))}</span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 tabular-nums mt-0.5">
                    {h.setDetails?.length
                      ? h.setDetails.map(s => `${s.reps} × ${kgToDisplay(s.weightKg, unit)}`).join('  ·  ')
                      : `${h.sets ?? '?'} × ${h.reps ?? '?'}${h.weightKg ? ` @ ${kgToDisplay(h.weightKg, unit)}` : ''}`}
                    {' '}{weightLabel(unit)}
                  </p>
                  {h.note && <p className="text-xs text-gray-400 mt-0.5 italic">{h.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
