'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { BodySummary, ShareSection, encodeShareFragment, scopeSummary } from '@/lib/bodySummary'

const NAME_KEY = 'karmo_share_name'
const SECTIONS: ShareSection[] = ['form', 'body', 'fuel']

export function ShareDialog({ summary, onClose }: { summary: BodySummary; onClose: () => void }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [include, setInclude] = useState<Record<ShareSection, boolean>>({ form: true, body: false, fuel: true })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    try { setName(localStorage.getItem(NAME_KEY) ?? '') } catch {}
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const url = useMemo(() => {
    const fragment = encodeShareFragment(scopeSummary(summary, include, name))
    return `${window.location.origin}/share#${fragment}`
  }, [summary, include, name])

  const rememberName = () => {
    try { localStorage.setItem(NAME_KEY, name.trim()) } catch {}
  }

  const copy = async () => {
    rememberName()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const shareNative = async () => {
    rememberName()
    try {
      await navigator.share({ title: t('share.title'), url })
    } catch {}
  }

  const canShareNative = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const sectionLabel: Record<ShareSection, string> = {
    form: t('overview.form'),
    body: `${t('overview.weight')} / ${t('overview.bodyFat')}`,
    fuel: t('overview.fuel'),
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('share.title')}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('share.subtitle')}</p>

        <label className="block mt-5 text-xs font-medium text-gray-500 dark:text-gray-400">{t('share.nameLabel')}</label>
        <input
          type="text"
          value={name}
          maxLength={40}
          onChange={e => setName(e.target.value)}
          placeholder={t('share.namePlaceholder')}
          className="mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-500"
        />

        <p className="mt-5 text-xs font-medium text-gray-500 dark:text-gray-400">{t('share.include')}</p>
        <div className="mt-2 space-y-2">
          {SECTIONS.map(section => (
            <label key={section} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800/60 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              {sectionLabel[section]}
              <input
                type="checkbox"
                checked={include[section]}
                onChange={e => setInclude(prev => ({ ...prev, [section]: e.target.checked }))}
                className="w-4 h-4 accent-violet-500"
              />
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{t('share.alwaysIncluded')}</p>
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{t('share.privacyNote')}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copy}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold hover:from-violet-600 hover:to-purple-700 transition-all"
          >
            {copied ? t('share.copied') : t('share.copy')}
          </button>
          {canShareNative && (
            <button type="button" onClick={shareNative} className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              {t('share.shareNative')}
            </button>
          )}
          <a href={url} target="_blank" rel="noopener noreferrer" onClick={rememberName} className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            {t('share.preview')} ↗
          </a>
        </div>
        <button type="button" onClick={onClose} className="mt-3 w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          {t('share.close')}
        </button>
      </div>
    </div>
  )
}
