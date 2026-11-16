'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { PageHeader, AiLabel } from '@/components/PageHeader'
import { TabIcon } from '@/components/AppTabBar'
import { loadWorkoutLog, WorkoutEntry } from '@/lib/workoutLog'
import { useUnits, formatWeight } from '@/lib/units'

export default function TrainPage() {
  const { t, locale } = useTranslation()
  const [units] = useUnits()
  const [recent, setRecent] = useState<WorkoutEntry[]>([])

  useEffect(() => {
    setRecent([...loadWorkoutLog()].sort((a, b) => b.dateISO.localeCompare(a.dateISO)).slice(0, 6))
  }, [])

  const dateFmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })

  return (
    <div className="min-h-screen">
      <PageHeader title={t('train.title')} subtitle={t('train.subtitle')} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-5 space-y-3">
        {/* Form camera — the differentiator */}
        <Link href="/motion" className="block rounded-3xl overflow-hidden bg-olive-800 text-white hover:shadow-xl transition-shadow">
          <div className="relative h-40 bg-gradient-to-br from-olive-700 to-olive-950 flex items-center justify-center">
            {/* Sparse skeleton motif */}
            <svg viewBox="0 0 100 120" className="h-32 opacity-80" aria-hidden>
              <g stroke="#B9C9A5" strokeWidth="2.5" strokeLinecap="round" fill="none">
                <path d="M50 22 50 62M50 34 32 50 26 66M50 34 68 50 74 66M50 62 38 88 36 112M50 62 62 88 64 112" />
              </g>
              <g fill="#F9FAF8">
                {[[50, 14], [50, 34], [32, 50], [68, 50], [26, 66], [74, 66], [50, 62], [38, 88], [62, 88], [36, 112], [64, 112]].map(([x, y]) => (
                  <circle key={`${x}-${y}`} cx={x} cy={y} r={x === 50 && y === 14 ? 7 : 3} />
                ))}
              </g>
            </svg>
            <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/25 text-sage-300 text-[11px] font-bold">✦ {t('honest.aiCue')}</span>
          </div>
          <div className="p-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl">{t('train.formCamera')}</h2>
              <p className="text-sm text-sage-200 mt-1">{t('train.formCameraText')}</p>
            </div>
            <span className="shrink-0 px-4 py-2.5 rounded-full bg-sage-300 text-olive-800 text-sm font-bold">{t('train.formCameraCta')}</span>
          </div>
        </Link>

        <div className="grid sm:grid-cols-2 gap-3">
          <Link href="/log" className="rounded-3xl p-5 bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800 hover:shadow-lg transition-shadow">
            <span className="w-10 h-10 rounded-full bg-sage-300 text-olive-800 flex items-center justify-center mb-4"><TabIcon name="train" /></span>
            <h2 className="text-xl text-olive-800 dark:text-gray-50">{t('train.workoutLog')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('train.workoutLogText')}</p>
            <p className="mt-4 text-sm font-bold text-olive-600 dark:text-sage-300">{t('train.workoutLogCta')} →</p>
          </Link>
          <Link href="/motion#plans" className="rounded-3xl p-5 bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800 hover:shadow-lg transition-shadow">
            <span className="w-10 h-10 rounded-full bg-sage-300 text-olive-800 flex items-center justify-center mb-4"><TabIcon name="insight" /></span>
            <h2 className="text-xl text-olive-800 dark:text-gray-50">{t('train.plans')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('train.plansText')}</p>
          </Link>
        </div>

        <section className="rounded-3xl p-5 bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800">
          <h2 className="text-lg text-olive-800 dark:text-gray-50 mb-3">{t('train.recent')}</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('train.recentEmpty')}</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {recent.map(w => (
                <li key={w.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 dark:text-gray-100 truncate">{w.exercise}</p>
                    <p className="text-xs text-gray-500">
                      {dateFmt.format(new Date(w.dateISO))}
                      {w.setDetails?.length ? ` · ${t('log.setsSummary').replace('{sets}', String(w.setDetails.length))}` : w.sets ? ` · ${w.sets}×${w.reps ?? ''}` : ''}
                    </p>
                  </div>
                  {w.source === 'motion'
                    ? <AiLabel>{t('honest.aiCue')}</AiLabel>
                    : w.weightKg ? <span className="text-gray-600 dark:text-gray-300 tabular-nums">{formatWeight(w.weightKg, units.weight)}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
