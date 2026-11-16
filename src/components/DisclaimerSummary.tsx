'use client'

import { useState } from 'react'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { DISCLAIMER_SECTION_KEYS } from '@/lib/disclaimer'

/** Emergency banner plus one expandable row per disclaimer section. */
export function DisclaimerSummary() {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <div className="space-y-3">
      <div role="alert" className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
        🚨 {t('disclaimer.emergency')}
      </div>
      <ul className="divide-y divide-gray-200 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {DISCLAIMER_SECTION_KEYS.map(key => {
          const open = expanded.has(key)
          return (
            <li key={key} className="bg-white dark:bg-gray-900">
              <button
                type="button"
                onClick={() => toggle(key)}
                aria-expanded={open}
                className="w-full text-left px-4 py-3 flex items-start justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <span>
                  <span className="block text-sm font-semibold text-gray-900 dark:text-white">{t(`disclaimer.sections.${key}.title`)}</span>
                  <span className="block text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t(`disclaimer.sections.${key}.summary`)}</span>
                </span>
                <span className="shrink-0 text-xs font-medium text-violet-600 dark:text-violet-400 mt-0.5">
                  {open ? `${t('common.showLess')} ▴` : `${t('common.showMore')} ▾`}
                </span>
              </button>
              {open && (
                <p className="px-4 pb-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {t(`disclaimer.sections.${key}.details`)}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
