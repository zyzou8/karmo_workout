'use client'

import { PageHeader } from '@/components/PageHeader'
import { useEffect, useState } from 'react'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { BodySummaryView } from '@/components/BodySummaryView'
import { ShareDialog } from '@/components/ShareDialog'
import { BodySummary, buildBodySummary } from '@/lib/bodySummary'

export default function OverviewPage() {
  const { t, locale } = useTranslation()
  const [summary, setSummary] = useState<BodySummary | null>(null)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    setSummary(buildBodySummary())
  }, [])

  const rangeFmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageHeader title={t('overview.title')} back={{ href: '/insight', label: t('tabs.insight') }} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('overview.title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('overview.subtitle')}
              {summary && ` · ${rangeFmt.format(new Date(summary.fromISO))} – ${rangeFmt.format(new Date(summary.toISO))}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSharing(true)}
            disabled={!summary}
            className="shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/25 disabled:opacity-40"
          >
            ↗ {t('overview.shareButton')}
          </button>
        </div>

        {summary && <BodySummaryView summary={summary} mode="owner" />}
      </main>

      {sharing && summary && <ShareDialog summary={summary} onClose={() => setSharing(false)} />}
    </div>
  )
}
