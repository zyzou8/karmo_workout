'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { LOCALES } from '@/lib/i18n/translations'
import { useTheme } from '@/lib/theme/ThemeContext'
import { loadDisclaimerAcceptance } from '@/lib/disclaimer'
import { DisclaimerSummary } from './DisclaimerSummary'
import { useAuth } from '@/lib/auth/AuthContext'
import Link from 'next/link'

export function SettingsMenu() {
  const { locale, setLocale, t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={t('settings.label')}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        ⚙️
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm shadow-gray-200/60 dark:shadow-none shadow-xl py-1.5 z-50">
          {user && (
            <>
              <div className="px-3 py-2">
                <p className="text-xs text-gray-500">{t('auth.signedInAs')}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.displayName}</p>
                {user.displayName !== user.username && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">@{user.username}</p>}
              </div>
              <div className="my-1 border-t border-gray-200 dark:border-gray-800" />
            </>
          )}
          <p className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">{t('settings.appearance')}</p>
          <div className="px-3 pb-2 flex items-center gap-1.5">
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                theme === 'light' ? 'bg-violet-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              ☀️ {t('settings.light')}
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                theme === 'dark' ? 'bg-violet-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              🌙 {t('settings.dark')}
            </button>
          </div>
          <div className="my-1 border-t border-gray-200 dark:border-gray-800" />
          <p className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">{t('settings.language')}</p>
          {LOCALES.map(l => (
            <button
              key={l.value}
              onClick={() => { setLocale(l.value); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                locale === l.value ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {l.label}
              {locale === l.value && <span className="text-violet-400">✓</span>}
            </button>
          ))}
          <div className="my-1 border-t border-gray-200 dark:border-gray-800" />
          <button
            onClick={() => { setShowDisclaimer(true); setOpen(false) }}
            className="w-full text-left px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            📄 {t('settings.viewDisclaimer')}
          </button>
          <Link
            href="/guide"
            onClick={() => setOpen(false)}
            className="block w-full text-left px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            🧭 {t('settings.userGuide')}
          </Link>
          {user && (
            <>
              <div className="my-1 border-t border-gray-200 dark:border-gray-800" />
              <button
                onClick={() => { setOpen(false); void logout() }}
                className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                ↪ {t('auth.logout')}
              </button>
            </>
          )}
        </div>
      )}
      {showDisclaimer && <DisclaimerModal onClose={() => setShowDisclaimer(false)} />}
    </div>
  )
}

function DisclaimerModal({ onClose }: { onClose: () => void }) {
  const { t, locale } = useTranslation()
  const acceptance = loadDisclaimerAcceptance()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-6 text-left"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{t('disclaimer.title')}</h2>
        {acceptance && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            {t('disclaimer.acceptedOn')}: {new Date(acceptance.acceptedAtISO).toLocaleDateString(locale)}
            {acceptance.signedName && <> · {t('disclaimer.signedBy')}: {acceptance.signedName}</>}
          </p>
        )}
        <DisclaimerSummary />
        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          {t('disclaimer.closeButton')}
        </button>
      </div>
    </div>
  )
}
