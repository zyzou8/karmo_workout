'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { ThemeToggle } from '@/components/ThemeToggle'
import { SettingsMenu } from '@/components/SettingsMenu'
import { BodySummaryView } from '@/components/BodySummaryView'
import { BodySummary, decodeShareFragment } from '@/lib/bodySummary'

/** Read-only view of a weekly snapshot encoded in the URL fragment by the Overview share dialog. */
export default function SharePage() {
  const { t, locale } = useTranslation()
  const [summary, setSummary] = useState<BodySummary | null | undefined>(undefined)

  useEffect(() => {
    const read = () => setSummary(decodeShareFragment(window.location.hash))
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [])

  const rangeFmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  const initial = summary?.name?.trim().charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="border-b border-gray-200/80 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">K</div>
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('share.sharedVia')}</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <SettingsMenu />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {summary === null && (
          <div className="max-w-md mx-auto text-center py-20">
            <div className="text-4xl mb-3">🔗</div>
            <p className="text-gray-600 dark:text-gray-300">{t('share.invalid')}</p>
            <Link href="/" className="inline-block mt-6 text-sm font-medium text-violet-600 dark:text-violet-400">{t('share.openApp')} →</Link>
          </div>
        )}

        {summary && (
          <>
            <header className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-500 via-violet-500 to-cyan-400 p-[3px]">
                <div className="w-full h-full rounded-full bg-gray-50 dark:bg-gray-950 flex items-center justify-center text-xl font-bold text-gray-900 dark:text-white">
                  {initial || '🏋️'}
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.name ? t('share.weekOf').replace('{name}', summary.name) : t('share.anonymousWeek')}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {rangeFmt.format(new Date(summary.fromISO))} – {rangeFmt.format(new Date(summary.toISO))}
                </p>
              </div>
            </header>

            <BodySummaryView summary={summary} mode="shared" />

            <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
              {t('share.snapshotNote').replace('{date}', dateFmt.format(new Date(summary.toISO)))}
            </p>
          </>
        )}
      </main>
    </div>
  )
}
