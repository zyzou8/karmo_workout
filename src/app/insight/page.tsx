'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { PageHeader, AiLabel } from '@/components/PageHeader'
import { TabIcon } from '@/components/AppTabBar'
import { loadMeasurements, MeasurementEntry } from '@/lib/profile'
import { loadWorkoutLog, entryVolumeKg, WorkoutEntry } from '@/lib/workoutLog'
import { NUTRITION_LOG_KEY, NutrientData } from '@/lib/nutrition'
import { useUnits, kgToDisplay, weightLabel } from '@/lib/units'

type Window = 4 | 12

interface MealEntry { dateISO: string; nutrients?: NutrientData }

function loadMeals(): MealEntry[] {
  try {
    const saved = localStorage.getItem(NUTRITION_LOG_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

const DAY = 86400000

/** Bars, one per bucket, scaled to the largest bucket. */
function Bars({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values, 1)
  return (
    <div className="flex items-end gap-1 h-28" role="img" aria-label={values.map((v, i) => `${labels[i]}: ${Math.round(v)}`).join(', ')}>
      {values.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end" title={`${labels[i]}: ${Math.round(v)}`}>
          <div className={`w-full rounded-t-md ${v > 0 ? 'bg-olive-500 dark:bg-sage-300' : 'bg-gray-100 dark:bg-gray-800'}`}
            style={{ height: `${v > 0 ? Math.max(6, (v / max) * 100) : 4}%` }} />
        </div>
      ))}
    </div>
  )
}

/** Line through the logged weigh-ins. */
function Line({ points }: { points: { x: number; y: number }[] }) {
  const w = 300, h = 110, pad = 10
  const ys = points.map(p => p.y)
  const min = Math.min(...ys), max = Math.max(...ys), range = max - min || 1
  const xs = points.map(p => p.x)
  const x0 = Math.min(...xs), x1 = Math.max(...xs), xr = x1 - x0 || 1
  const pts = points.map(p => [pad + ((p.x - x0) / xr) * (w - pad * 2), pad + (1 - (p.y - min) / range) * (h - pad * 2)])
  const path = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-28" aria-hidden>
      <path d={`${path} L${pts[pts.length - 1][0]},${h} L${pts[0][0]},${h} Z`} className="fill-sage-300/30 dark:fill-sage-300/10" />
      <path d={path} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="stroke-olive-600 dark:stroke-sage-300" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" className="fill-olive-800 dark:fill-sage-200" />)}
    </svg>
  )
}

function Card({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-xl text-olive-800 dark:text-gray-50">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Empty({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 p-4 text-sm text-gray-500 dark:text-gray-400">
      <p>{text}</p>
      <Link href={href} className="inline-block mt-2 font-bold text-olive-600 dark:text-sage-300 hover:underline">{cta} →</Link>
    </div>
  )
}

export default function InsightPage() {
  const { t, locale } = useTranslation()
  const [units] = useUnits()
  const [weeks, setWeeks] = useState<Window>(4)
  const [measurements, setMeasurements] = useState<MeasurementEntry[]>([])
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([])
  const [meals, setMeals] = useState<MealEntry[]>([])

  useEffect(() => {
    setMeasurements(loadMeasurements())
    setWorkouts(loadWorkoutLog())
    setMeals(loadMeals())
  }, [])

  const since = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime() - (weeks * 7 - 1) * DAY
  }, [weeks])

  const weightPoints = useMemo(() => measurements
    .filter(m => m.weightKg != null && new Date(m.dateISO).getTime() >= since)
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
    .map(m => ({ x: new Date(m.dateISO).getTime(), y: kgToDisplay(m.weightKg as number, units.weight) })), [measurements, since, units.weight])

  // Weekly buckets, oldest first.
  const weekStarts = useMemo(() => Array.from({ length: weeks }, (_, i) => since + i * 7 * DAY), [since, weeks])
  const bucket = (iso: string) => Math.floor((new Date(iso).getTime() - since) / (7 * DAY))

  const volumeByWeek = useMemo(() => {
    const out = Array(weeks).fill(0) as number[]
    for (const w of workouts) {
      const b = bucket(w.dateISO)
      if (b >= 0 && b < weeks) out[b] += kgToDisplay(entryVolumeKg(w), units.weight)
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workouts, since, weeks, units.weight])

  const kcal = useMemo(() => {
    const out = Array(weeks).fill(0) as number[]
    const days = new Set<string>()
    let total = 0
    for (const m of meals) {
      const b = bucket(m.dateISO)
      const c = m.nutrients?.calories || 0
      if (b >= 0 && b < weeks && c > 0) {
        out[b] += c
        total += c
        days.add(new Date(m.dateISO).toDateString())
      }
    }
    return { byWeek: out, avgPerDay: days.size ? Math.round(total / days.size) : 0 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meals, since, weeks])

  const labelFmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })
  const weekLabels = weekStarts.map(s => labelFmt.format(new Date(s)))
  const hasVolume = volumeByWeek.some(v => v > 0)
  const hasKcal = kcal.byWeek.some(v => v > 0)
  const wl = weightLabel(units.weight)

  const toggle = (
    <div role="group" className="flex rounded-full bg-gray-100 dark:bg-gray-800 p-1">
      {([4, 12] as const).map(w => (
        <button key={w} type="button" aria-pressed={weeks === w} onClick={() => setWeeks(w)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${weeks === w ? 'bg-olive-800 text-white dark:bg-sage-300 dark:text-gray-900' : 'text-gray-500'}`}>
          {w === 4 ? t('insight.weeks4') : t('insight.weeks12')}
        </button>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen">
      <PageHeader title={t('insight.title')} subtitle={t('insight.subtitle')} actions={toggle} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-5 space-y-3">
        <Card title={t('insight.weight')} aside={weightPoints.length > 0 && (
          <span className="text-sm text-gray-500 tabular-nums">
            {t('insight.latest')} <b className="text-olive-800 dark:text-gray-50">{weightPoints[weightPoints.length - 1].y} {wl}</b>
            {weightPoints.length > 1 && <> · {t('insight.change')} {(weightPoints[weightPoints.length - 1].y - weightPoints[0].y >= 0 ? '+' : '')}{Math.round((weightPoints[weightPoints.length - 1].y - weightPoints[0].y) * 10) / 10}</>}
          </span>
        )}>
          {weightPoints.length >= 2 ? <Line points={weightPoints} />
            : <Empty text={t('insight.weightEmpty')} href="/profile" cta={t('tabs.me')} />}
        </Card>

        <Card title={t('insight.volume')} aside={hasVolume && <span className="text-xs text-gray-500">{wl} · {t('insight.perWeek')}</span>}>
          {hasVolume ? (
            <>
              <Bars values={volumeByWeek} labels={weekLabels} />
              <div className="flex justify-between text-[11px] text-gray-400 mt-1"><span>{weekLabels[0]}</span><span>{weekLabels[weekLabels.length - 1]}</span></div>
            </>
          ) : <Empty text={t('insight.volumeEmpty')} href="/log" cta={t('train.workoutLogCta')} />}
        </Card>

        <Card title={t('insight.kcal')} aside={hasKcal && <AiLabel>{t('insight.estimate')}</AiLabel>}>
          {hasKcal ? (
            <>
              <Bars values={kcal.byWeek} labels={weekLabels} />
              <div className="flex justify-between text-[11px] text-gray-400 mt-1"><span>{weekLabels[0]}</span><span>{weekLabels[weekLabels.length - 1]}</span></div>
              <p className="mt-3 text-sm text-gray-500"><b className="font-display text-xl text-olive-800 dark:text-gray-50">{kcal.avgPerDay}</b> kcal {t('insight.perDayAvg')}</p>
            </>
          ) : <Empty text={t('insight.kcalEmpty')} href="/nutrition" cta={t('hub.toolMeal')} />}
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {[
            { href: '/body', title: t('insight.bodyCard'), text: t('insight.bodyCardText'), icon: 'me' as const },
            { href: '/nutrition', title: t('insight.nutritionCard'), text: t('insight.nutritionCardText'), icon: 'meal' as const },
            { href: '/overview', title: t('insight.overviewCard'), text: t('insight.overviewCardText'), icon: 'insight' as const },
          ].map(c => (
            <Link key={c.href} href={c.href} className="rounded-3xl p-4 bg-sage-300/30 dark:bg-gray-900 border border-sage-300/50 dark:border-gray-800 hover:shadow-lg transition-shadow flex sm:block items-center gap-3">
              <span className="w-9 h-9 shrink-0 rounded-full bg-olive-800 text-white dark:bg-sage-300 dark:text-gray-900 flex items-center justify-center sm:mb-3"><TabIcon name={c.icon} className="w-4 h-4" /></span>
              <div>
                <h3 className="text-lg text-olive-800 dark:text-gray-50">{c.title}</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">{c.text}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
