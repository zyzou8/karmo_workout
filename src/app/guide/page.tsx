'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { useAuth } from '@/lib/auth/AuthContext'
import { hasCompletedOnboarding, markOnboardingComplete } from '@/lib/auth/userSync'
import { hasSavedProfile } from '@/lib/profile'

interface GuideStep {
  icon: string
  gradient: string
  title: string
  body: string
  items: string[]
  href?: string
}

/** First-time user guide: a short walk-through of each part of the app. Reopenable from Settings. */
export default function GuidePage() {
  const { t, tList } = useTranslation()
  const { user } = useAuth()
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [firstRun, setFirstRun] = useState(false)

  useEffect(() => { setFirstRun(!hasCompletedOnboarding()) }, [])

  const steps: GuideStep[] = [
    {
      icon: '👋', gradient: 'from-violet-500 to-purple-600',
      title: t('guide.welcomeTitle').replace('{name}', user?.displayName || ''),
      body: t('guide.welcomeBody'),
      items: tList('guide.welcomeItems'),
    },
    {
      icon: '🎯', gradient: 'from-blue-500 to-cyan-500', href: '/motion',
      title: t('home.motionTitle'), body: t('home.motionDescription'), items: tList('guide.motionTips'),
    },
    {
      icon: '💪', gradient: 'from-emerald-500 to-teal-500', href: '/body',
      title: t('home.bodyTitle'), body: t('home.bodyDescription'), items: tList('guide.bodyTips'),
    },
    {
      icon: '🥗', gradient: 'from-orange-500 to-amber-500', href: '/nutrition',
      title: t('home.nutritionTitle'), body: t('home.nutritionDescription'), items: tList('guide.nutritionTips'),
    },
    {
      icon: '🫀', gradient: 'from-pink-500 to-rose-500', href: '/overview',
      title: t('guide.progressTitle'), body: t('guide.progressBody'), items: tList('guide.progressTips'),
    },
    {
      icon: '🔒', gradient: 'from-slate-500 to-gray-600',
      title: t('guide.accountTitle'), body: t('guide.accountBody'), items: tList('guide.accountTips'),
    },
  ]

  const step = steps[index]
  const isLast = index === steps.length - 1

  const finish = () => {
    markOnboardingComplete()
    router.push(hasSavedProfile() ? '/' : '/profile')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="border-b border-gray-200/80 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">K</div>
            <span className="font-semibold text-gray-900 dark:text-white text-lg">{t('guide.title')}</span>
          </div>
          <button type="button" onClick={finish} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            {firstRun ? t('guide.skip') : t('guide.close')}
          </button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-8" aria-label={`${index + 1} / ${steps.length}`}>
          {steps.map((_, i) => (
            <button key={i} type="button" onClick={() => setIndex(i)} aria-label={`${i + 1}`}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i <= index ? 'bg-violet-500' : 'bg-gray-200 dark:bg-gray-800'}`} />
          ))}
        </div>

        <div key={index} className="rounded-2xl bg-white dark:bg-gray-900 shadow-sm shadow-gray-200/60 dark:shadow-none border border-gray-100 dark:border-gray-800 p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center text-3xl shadow-lg`}>{step.icon}</div>
            <span className="text-xs text-gray-400 dark:text-gray-500">{index + 1} / {steps.length}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">{step.title}</h1>
          <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-6">{step.body}</p>
          <ul className="space-y-3">
            {step.items.map(item => (
              <li key={item} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                <span className={`mt-1.5 w-1.5 h-1.5 shrink-0 rounded-full bg-gradient-to-r ${step.gradient}`} />
                {item}
              </li>
            ))}
          </ul>
          {step.href && !firstRun && (
            <Link href={step.href} className="inline-block mt-6 text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300">
              {t('guide.tryIt')} →
            </Link>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          {index > 0 && (
            <button type="button" onClick={() => setIndex(i => i - 1)}
              className="px-5 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              {t('disclaimer.backButton')}
            </button>
          )}
          <button type="button" onClick={isLast ? finish : () => setIndex(i => i + 1)}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/25">
            {isLast ? (firstRun && !hasSavedProfile() ? t('guide.setUpProfile') : t('guide.done')) : t('guide.next')}
          </button>
        </div>
      </main>
    </div>
  )
}
