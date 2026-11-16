'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { BodySummary, MUSCLE_GROUPS, MuscleGroup, muscleLoadLevel, musclesForExercise } from '@/lib/bodySummary'
import { BodyModel, BodyPin, BodyView, LOAD_COLORS } from './BodyModel'
import { ActivityRings, Ring } from './ActivityRings'
import { TrendChart } from './TrendChart'

const LEVEL_KEYS = ['rest', 'light', 'moderate', 'optimal', 'high'] as const

const RING_COLORS = { training: '#fa114f', minutes: '#92e82a', fuel: '#1eeaef' }

const PIN_COLORS = {
  form: '#3b82f6',
  body: '#8b5cf6',
  fuel: '#f97316',
  training: '#10b981',
  muscle: '#f43f5e',
}

interface Props {
  summary: BodySummary
  /** Shared snapshots hide empty sections and links back into the app. */
  mode: 'owner' | 'shared'
}

export function BodySummaryView({ summary, mode }: Props) {
  const { t } = useTranslation()
  const [view, setView] = useState<BodyView>('front')
  const [selected, setSelected] = useState<MuscleGroup | null>(null)
  const muscleLabel = (m: MuscleGroup) => t(`overview.muscles.${m}`)
  const { training, form, body, fuel } = summary
  const owner = mode === 'owner'

  const rings: (Ring & { label: string; text: string })[] = [
    {
      value: training.daysTrained, goal: training.daysGoal, color: RING_COLORS.training,
      label: t('overview.rings.training'),
      text: `${training.daysTrained}/${training.daysGoal}`,
    },
    {
      value: training.minutes, goal: training.minutesGoal, color: RING_COLORS.minutes,
      label: t('overview.rings.minutes'),
      text: `${training.minutes}/${training.minutesGoal}`,
    },
  ]
  if (fuel?.targetCalories) {
    rings.push({
      value: fuel.avgCalories, goal: fuel.targetCalories, color: RING_COLORS.fuel,
      label: t('overview.rings.fuel'),
      text: `${fuel.avgCalories}/${fuel.targetCalories}`,
    })
  }

  const pins: BodyPin[] = [
    { n: 1, x: 100, y: 24, color: PIN_COLORS.form, label: t('overview.form') },
    { n: 2, x: 80, y: 90, color: PIN_COLORS.body, label: t('overview.body') },
    { n: 3, x: 100, y: 142, color: PIN_COLORS.fuel, label: t('overview.fuel') },
    { n: 4, x: 147, y: 112, color: PIN_COLORS.training, label: t('overview.training') },
    { n: 5, x: 84, y: 252, color: PIN_COLORS.muscle, label: t('overview.muscleLoad') },
  ].filter(pin =>
    owner || (pin.n === 1 ? form : pin.n === 2 ? body : pin.n === 3 ? fuel : true),
  )

  const loadedMuscles = MUSCLE_GROUPS
    .map(m => ({ m, sets: summary.muscles[m] ?? 0 }))
    .filter(x => x.sets > 0)
    .sort((a, b) => b.sets - a.sets)
  const maxSets = Math.max(20, ...loadedMuscles.map(x => x.sets))

  const showForm = owner || form
  const showBody = owner || body
  const showFuel = owner || fuel

  const formCard = showForm && (
    <PinCard n={1} color={PIN_COLORS.form} title={t('overview.form')}>
      {form ? (
        <>
          <BigStat value={form.avg.toFixed(1)} unit="/ 10" caption={`${t('overview.formAvg')} · ${form.count} ${t('overview.formScored')}`} />
          {form.best && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('overview.best')}: <span className="text-gray-900 dark:text-white font-medium">{form.best.name}</span> · {form.best.score}/10
            </p>
          )}
        </>
      ) : (
        <Empty text={t('overview.formEmpty')} href="/motion" />
      )}
    </PinCard>
  )

  const bodyCard = showBody && (
    <PinCard n={2} color={PIN_COLORS.body} title={t('overview.body')}>
      {body?.weightKg != null ? (
        <>
          <div className="flex items-end gap-4">
            <BigStat value={body.weightKg.toFixed(1)} unit="kg" caption={t('overview.weight')} />
            {body.bodyFatPct != null && <BigStat value={body.bodyFatPct.toFixed(1)} unit="%" caption={t('overview.bodyFat')} />}
          </div>
          {body.deltaKg != null && body.deltaKg !== 0 && (
            <p className={`mt-1 text-xs font-medium ${body.deltaKg < 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
              {body.deltaKg > 0 ? '▲' : '▼'} {Math.abs(body.deltaKg).toFixed(1)} kg {t('overview.sinceLast')}
            </p>
          )}
          {body.weights.length >= 2 && (
            <div className="mt-2 -mx-1">
              <TrendChart values={body.weights} gradientId={`weight-${mode}`} colorFrom="#8b5cf6" colorTo="#c084fc" />
            </div>
          )}
        </>
      ) : (
        <Empty text={t('overview.bodyEmpty')} href="/profile" />
      )}
    </PinCard>
  )

  const fuelCard = showFuel && (
    <PinCard n={3} color={PIN_COLORS.fuel} title={t('overview.fuel')}>
      {fuel ? (
        <>
          <BigStat
            value={String(fuel.avgCalories)}
            unit={t('overview.kcal')}
            caption={`${t('overview.avgPerDay')}${fuel.targetCalories ? ` · ${t('overview.target')} ${fuel.targetCalories}` : ''} · ${fuel.daysLogged}/7 ${t('overview.daysLogged')}`}
          />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Macro label={t('overview.protein')} grams={fuel.avgProtein} target={fuel.targetProtein} color="bg-rose-500" />
            <Macro label={t('overview.carbs')} grams={fuel.avgCarbs} color="bg-amber-500" />
            <Macro label={t('overview.fat')} grams={fuel.avgFat} color="bg-sky-500" />
          </div>
        </>
      ) : (
        <Empty text={t('overview.fuelEmpty')} href="/nutrition" />
      )}
    </PinCard>
  )

  const trainingCard = (
    <PinCard n={4} color={PIN_COLORS.training} title={t('overview.training')}>
      {training.sessions > 0 ? (
        <>
          <div className="flex items-end gap-4">
            <BigStat value={String(training.sessions)} caption={t('overview.sessions')} />
            {training.minutes > 0 && <BigStat value={String(training.minutes)} caption={t('overview.minutesShort')} />}
            {training.calories > 0 && <BigStat value={String(training.calories)} caption={t('overview.kcal')} />}
          </div>
          <p className="mt-3 mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">{t('overview.topExercises')}</p>
          <ul className="space-y-1">
            {training.topExercises.map(ex => (
              <li key={ex.name} className="flex justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300 truncate pr-2">{ex.name}</span>
                <span className="text-gray-400 dark:text-gray-500 tabular-nums shrink-0">{ex.sets} {t('overview.sets')}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <Empty text={t('overview.trainingEmpty')} href={owner ? '/motion' : undefined} />
      )}
    </PinCard>
  )

  const muscleCard = (
    <PinCard n={5} color={PIN_COLORS.muscle} title={t('overview.muscleLoad')}>
      {loadedMuscles.length ? (
        <ul className="space-y-2">
          {loadedMuscles.slice(0, 7).map(({ m, sets }) => (
            <li key={m}>
              <button type="button" onClick={() => setSelected(m)} className="w-full text-left">
                <div className="flex justify-between text-sm mb-1">
                  <span className={selected === m ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-700 dark:text-gray-300'}>{muscleLabel(m)}</span>
                  <span className="text-gray-400 dark:text-gray-500 tabular-nums">{sets}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(sets / maxSets) * 100}%`, background: LOAD_COLORS[muscleLoadLevel(sets)] }} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('overview.trainingEmpty')}</p>
      )}
    </PinCard>
  )

  const selectedSets = selected ? summary.muscles[selected] ?? 0 : 0
  const selectedExercises = selected
    ? training.topExercises.filter(ex => (musclesForExercise(ex.name)[selected] ?? 0) > 0)
    : []

  return (
    <div className="space-y-6">
      {/* Rings */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm shadow-gray-200/60 dark:shadow-none p-5 flex items-center gap-6 flex-wrap">
        <ActivityRings rings={rings} size={120} />
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 min-w-[12rem]">
          {rings.map(r => (
            <div key={r.label}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: r.color }}>{r.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{r.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,20rem)_1fr] items-start">
        <div className="space-y-4 order-2 lg:order-1">
          {formCard}
          {bodyCard}
        </div>

        {/* Body model */}
        <div className="order-1 lg:order-2 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm shadow-gray-200/60 dark:shadow-none p-4">
          <div className="flex justify-center mb-2">
            <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5 text-xs font-medium">
              {(['front', 'back'] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`px-3 py-1 rounded-md transition-colors ${view === v ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  {t(`overview.${v}`)}
                </button>
              ))}
            </div>
          </div>
          <BodyModel
            view={view}
            muscles={summary.muscles}
            muscleLabel={muscleLabel}
            selected={selected}
            onSelect={m => setSelected(prev => (prev === m ? null : m))}
            pins={pins}
            className="w-full max-w-[16rem] mx-auto h-auto"
          />
          <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1">
            {LEVEL_KEYS.map((key, level) => (
              <span key={key} className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: level ? LOAD_COLORS[level] : 'var(--body-muscle)' }} />
                {t(`overview.levels.${key}`)}
              </span>
            ))}
          </div>
          <div className="mt-3 rounded-xl bg-gray-50 dark:bg-gray-950/60 border border-gray-100 dark:border-gray-800 px-3 py-2.5 min-h-[4.5rem]">
            {selected ? (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{muscleLabel(selected)}</span>
                  <span className="text-xs font-semibold" style={{ color: LOAD_COLORS[muscleLoadLevel(selectedSets)] || undefined }}>
                    {t(`overview.levels.${LEVEL_KEYS[muscleLoadLevel(selectedSets)]}`)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{selectedSets} {t('overview.setsThisWeek')}</p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                  {selectedExercises.length
                    ? `${t('overview.fromTopExercises')}: ${selectedExercises.map(e => e.name).join(', ')}`
                    : t('overview.noExercisesForMuscle')}
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('overview.tapMuscle')}<br />{t('overview.muscleLoadHint')}</p>
            )}
          </div>
        </div>

        <div className="space-y-4 order-3">
          {fuelCard}
          {trainingCard}
          {muscleCard}
        </div>
      </div>
    </div>
  )
}

function PinCard({ n, color, title, children }: { n: number; color: string; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm shadow-gray-200/60 dark:shadow-none p-4">
      <h3 className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <span className="w-5 h-5 rounded-full text-[11px] text-white flex items-center justify-center" style={{ background: color }}>{n}</span>
        {title}
      </h3>
      {children}
    </section>
  )
}

function BigStat({ value, unit, caption }: { value: string; unit?: string; caption: string }) {
  return (
    <div>
      <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums leading-none">
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-gray-400 dark:text-gray-500">{unit}</span>}
      </p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{caption}</p>
    </div>
  )
}

function Macro({ label, grams, target, color }: { label: string; grams: number; target?: number; color: string }) {
  const pct = target ? Math.min(100, (grams / target) * 100) : 100
  return (
    <div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
        {grams}g{target ? <span className="text-gray-400 dark:text-gray-500 font-normal"> / {target}</span> : null}
      </p>
      <div className="mt-1 h-1 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%`, opacity: target ? 1 : 0.5 }} />
      </div>
    </div>
  )
}

function Empty({ text, href }: { text: string; href?: string }) {
  return href ? (
    <Link href={href} className="block text-sm text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
      {text} →
    </Link>
  ) : (
    <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>
  )
}
