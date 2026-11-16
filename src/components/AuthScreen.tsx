'use client'

import { FormEvent, useState } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { LOCALES, Locale } from '@/lib/i18n/translations'
import { ThemeToggle } from './ThemeToggle'

type Mode = 'login' | 'register'

const inputClass = 'w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-colors'

/** Sign-in / create-account screen shown before anything else in the app. */
export function AuthScreen() {
  const { t, locale, setLocale } = useTranslation()
  const { login, register } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const switchMode = (m: Mode) => { setMode(m); setError(null); setPassword(''); setConfirm('') }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (mode === 'register') {
      if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username.trim())) return setError('invalidUsername')
      if (password.length < 8) return setError('weakPassword')
      if (password !== confirm) return setError('passwordMismatch')
    }
    setBusy(true)
    const err = mode === 'login'
      ? await login(username, password)
      : await register(username, password, displayName)
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <header className="max-w-md w-full mx-auto px-4 sm:px-6 pt-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">K</div>
        <span className="font-semibold text-gray-900 dark:text-white text-lg">{t('nav.brand')}</span>
        <div className="ml-auto flex items-center gap-1">
          <select
            value={locale}
            onChange={e => setLocale(e.target.value as Locale)}
            aria-label={t('settings.language')}
            className="text-sm bg-transparent text-gray-500 dark:text-gray-400 rounded-lg px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
          >
            {LOCALES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center">
        <div className="max-w-md w-full mx-auto px-4 sm:px-6 py-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            {mode === 'login' ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
          </p>

          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 mb-6" role="tablist">
            {(['login', 'register'] as Mode[]).map(m => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === m ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {m === 'login' ? t('auth.loginTab') : t('auth.registerTab')}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="auth-username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('auth.username')}</label>
              <input id="auth-username" className={inputClass} value={username} onChange={e => setUsername(e.target.value)}
                autoComplete="username" autoCapitalize="none" spellCheck={false} required />
              {mode === 'register' && <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{t('auth.usernameHint')}</p>}
            </div>

            {mode === 'register' && (
              <div>
                <label htmlFor="auth-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('auth.displayName')} <span className="text-gray-400 dark:text-gray-500 font-normal">({t('auth.optional')})</span>
                </label>
                <input id="auth-name" className={inputClass} value={displayName} onChange={e => setDisplayName(e.target.value)} autoComplete="nickname" />
              </div>
            )}

            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('auth.password')}</label>
              <div className="relative">
                <input id="auth-password" type={showPassword ? 'text' : 'password'} className={`${inputClass} pr-16`} value={password}
                  onChange={e => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  {showPassword ? t('auth.hide') : t('auth.show')}
                </button>
              </div>
              {mode === 'register' && <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{t('auth.passwordHint')}</p>}
            </div>

            {mode === 'register' && (
              <div>
                <label htmlFor="auth-confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('auth.confirmPassword')}</label>
                <input id="auth-confirm" type={showPassword ? 'text' : 'password'} className={inputClass} value={confirm}
                  onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required />
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {t(`auth.errors.${error}`) === `auth.errors.${error}` ? t('auth.errors.server') : t(`auth.errors.${error}`)}
              </p>
            )}

            <button type="submit" disabled={busy || !username || !password}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/25 disabled:opacity-40 disabled:cursor-not-allowed">
              {busy ? t('auth.working') : mode === 'login' ? t('auth.loginButton') : t('auth.registerButton')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
            <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              className="font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300">
              {mode === 'login' ? t('auth.registerTab') : t('auth.loginTab')}
            </button>
          </p>
        </div>
      </main>
    </div>
  )
}
