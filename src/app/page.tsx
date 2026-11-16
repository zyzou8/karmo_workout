'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { useAuth } from '@/lib/auth/AuthContext'
import { getActivityByDate, DayActivity } from '@/lib/activity'
import { NUTRITION_LOG_KEY, NutrientData, sumNutrients } from '@/lib/nutrition'
import { RestTimer } from '@/components/RestTimer'
import { TabIcon } from '@/components/AppTabBar'
import { AiLabel } from '@/components/PageHeader'

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Sunday-first week containing today, matching the S M T W T F S strip in the deck. */
function currentWeek(): Date[] {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay())
  return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
}

function todaysNutrients(): Required<NutrientData> {
  try {
    const saved = localStorage.getItem(NUTRITION_LOG_KEY)
    const entries: { dateISO: string; nutrients?: NutrientData }[] = saved ? JSON.parse(saved) : []
    const today = new Date().toDateString()
    return sumNutrients(entries.filter(e => new Date(e.dateISO).toDateString() === today).map(e => e.nutrients || {}))
  } catch {
    return sumNutrients([])
  }
}

export default function Home() {
  const { t, locale } = useTranslation()
  const { user } = useAuth()
  const [activityByDate, setActivityByDate] = useState<Map<string, DayActivity>>(new Map())
  const [today, setToday] = useState<Required<NutrientData>>(sumNutrients([]))
  const [timerOpen, setTimerOpen] = useState(false)
  const [hour, setHour] = useState(12)

  useEffect(() => {
    setActivityByDate(getActivityByDate())
    setToday(todaysNutrients())
    setHour(new Date().getHours())
  }, [])

  const week = currentWeek()
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' })
  const weekActivity = week.map(d => activityByDate.get(d.toDateString()))
  const weekWorkouts = weekActivity.reduce((sum, a) => sum + (a?.workouts.length || 0), 0)
  const weekMeals = weekActivity.reduce((sum, a) => sum + (a?.meals.length || 0), 0)
  const todayActivity = activityByDate.get(new Date().toDateString())
  const todaySets = (todayActivity?.workouts || []).reduce((sum, w) => sum + (w.setDetails?.length || w.sets || 0), 0)

  const greeting = hour < 12 ? t('hub.greetingMorning') : hour < 18 ? t('hub.greetingAfternoon') : t('hub.greetingEvening')
  const name = user?.displayName || ''

  const tools = [
    { key: 'rest', label: t('hub.toolRest'), icon: 'timer' as const, onClick: () => setTimerOpen(true) },
    { key: 'log', label: t('hub.toolLog'), icon: 'plus' as const, href: '/log' },
    { key: 'coach', label: t('hub.toolCoach'), icon: 'coach' as const, href: '/coach' },
    { key: 'meal', label: t('hub.toolMeal'), icon: 'meal' as const, href: '/nutrition' },
  ]

  const features = [
    { href: '/motion', title: t('hub.featureMotion'), text: t('hub.featureMotionText'), icon: 'camera' as const, tone: 'bg-olive-800 text-white dark:bg-sage-300 dark:text-gray-900', badge: t('honest.aiCue') },
    { href: '/body', title: t('hub.featureBody'), text: t('hub.featureBodyText'), icon: 'me' as const, tone: 'bg-sage-300 text-olive-800' },
    { href: '/nutrition', title: t('hub.featureNutrition'), text: t('hub.featureNutritionText'), icon: 'meal' as const, tone: 'bg-sage-300 text-olive-800', badge: t('hub.aiEstimate') },
    { href: '/insight', title: t('hub.featureProgress'), text: t('hub.featureProgressText'), icon: 'insight' as const, tone: 'bg-sage-300 text-olive-800' },
  ]

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-8">
        {/* Greeting */}
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{greeting}{name ? ',' : ''}</p>
            <h1 className="text-[32px] leading-tight text-olive-800 dark:text-gray-50">{name || t('nav.brand')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('hub.subtitle')}</p>
          </div>
          <Link href="/settings" aria-label={t('settingsPage.title')}
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-olive-800 dark:hover:text-white">
            <TabIcon name="settings" />
          </Link>
        </div>

        {/* Week strip */}
        <section className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800 p-4 mb-4">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-lg text-olive-800 dark:text-gray-50">{t('hub.thisWeek')}</h2>
            <Link href="/profile" className="text-xs font-bold text-olive-600 dark:text-sage-300 hover:underline">{t('home.viewFullCalendar')} →</Link>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {week.map((d, i) => {
              const a = weekActivity[i]
              const isToday = d.toDateString() === new Date().toDateString()
              const dots: string[] = []
              if (a?.workouts.length) dots.push('bg-olive-500 dark:bg-sage-300')
              if (a?.meals.length) dots.push('bg-amber-500')
              if (a?.measurement) dots.push('bg-gray-400')
              return (
                <Link key={i} href={`/profile?date=${isoDate(d)}`}
                  className={`rounded-2xl py-2.5 flex flex-col items-center gap-1 transition-colors ${
                    isToday ? 'bg-olive-800 text-white dark:bg-sage-300 dark:text-gray-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}>
                  <span className={`text-[11px] font-bold ${isToday ? 'opacity-80' : 'text-gray-400'}`}>{weekdayFmt.format(d)}</span>
                  <span className={`text-sm font-bold ${isToday ? '' : 'text-gray-700 dark:text-gray-200'}`}>{d.getDate()}</span>
                  <span className="flex items-center gap-0.5 h-1.5">
                    {dots.map((dot, di) => <span key={di} className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-current' : dot}`} />)}
                  </span>
                </Link>
              )
            })}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 px-1">
            {weekWorkouts + weekMeals > 0
              ? t('hub.weekSummary').replace('{workouts}', String(weekWorkouts)).replace('{meals}', String(weekMeals))
              : t('hub.weekEmpty')}
          </p>
        </section>

        {/* Today */}
        <section className="grid grid-cols-3 gap-2 mb-6">
          {[
            { value: Math.round(today.calories), label: t('hub.todayKcal'), ai: true },
            { value: Math.round(today.protein), label: t('hub.todayProtein'), ai: true },
            { value: todaySets, label: t('hub.todaySets'), ai: false },
          ].map(stat => (
            <div key={stat.label} className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800 px-3 py-3">
              <p className="font-display text-2xl text-olive-800 dark:text-gray-50 tabular-nums">{stat.value}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">{stat.label}</p>
              {stat.ai && stat.value > 0 && <p className="text-[10px] font-bold text-olive-600 dark:text-sage-300 mt-1">✦ {t('hub.aiEstimate')}</p>}
            </div>
          ))}
        </section>

        {/* Quick tools */}
        <h2 className="text-lg text-olive-800 dark:text-gray-50 mb-3 px-1">{t('hub.quickTools')}</h2>
        <section className="grid grid-cols-4 gap-2 mb-6">
          {tools.map(tool => {
            const inner = (
              <>
                <span className="w-12 h-12 rounded-full bg-sage-300/60 dark:bg-sage-300/15 text-olive-800 dark:text-sage-300 flex items-center justify-center">
                  <TabIcon name={tool.icon} className="w-6 h-6" />
                </span>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{tool.label}</span>
              </>
            )
            const cls = 'flex flex-col items-center gap-2 py-3 rounded-2xl hover:bg-white dark:hover:bg-gray-900 transition-colors'
            return tool.href
              ? <Link key={tool.key} href={tool.href} className={cls}>{inner}</Link>
              : <button key={tool.key} type="button" onClick={tool.onClick} className={cls}>{inner}</button>
          })}
        </section>

        {/* Feature cards */}
        <section className="grid grid-cols-2 gap-3">
          {features.map((f, i) => (
            <Link key={f.href} href={f.href}
              className={`group rounded-3xl p-4 flex flex-col justify-between min-h-[150px] border transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                i === 0
                  ? 'col-span-2 bg-olive-800 dark:bg-gray-900 border-olive-800 dark:border-gray-800 text-white'
                  : 'bg-white dark:bg-gray-900 border-gray-200/70 dark:border-gray-800'
              }`}>
              <div className="flex items-start justify-between gap-2">
                <span className={`w-10 h-10 rounded-full flex items-center justify-center ${i === 0 ? 'bg-sage-300 text-olive-800' : f.tone}`}>
                  <TabIcon name={f.icon} />
                </span>
                {f.badge && (i === 0
                  ? <span className="px-2 py-0.5 rounded-full bg-white/10 text-sage-300 text-[11px] font-bold">✦ {f.badge}</span>
                  : <AiLabel>{f.badge}</AiLabel>)}
              </div>
              <div className="mt-4">
                <h3 className={`text-xl ${i === 0 ? 'text-white dark:text-gray-50' : 'text-olive-800 dark:text-gray-50'}`}>{f.title}</h3>
                <p className={`text-sm mt-0.5 ${i === 0 ? 'text-sage-200 dark:text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>{f.text}</p>
              </div>
            </Link>
          ))}
          <Link href="/coach"
            className="col-span-2 rounded-3xl p-4 flex items-center gap-3 bg-sage-300/40 dark:bg-sage-300/10 border border-sage-300/60 dark:border-gray-800 hover:shadow-lg transition-all">
            <span className="w-10 h-10 rounded-full bg-olive-800 text-white dark:bg-sage-300 dark:text-gray-900 flex items-center justify-center"><TabIcon name="coach" /></span>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl text-olive-800 dark:text-gray-50">{t('hub.featureCoach')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('hub.featureCoachText')}</p>
            </div>
            <span className="text-olive-800 dark:text-sage-300">→</span>
          </Link>
        </section>
      </div>
      {timerOpen && <RestTimer onClose={() => setTimerOpen(false)} />}
    </div>
  )
}
