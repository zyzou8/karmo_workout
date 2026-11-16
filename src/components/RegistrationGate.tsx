'use client'

import { ReactNode, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { LOCALES } from '@/lib/i18n/translations'
import { loadDisclaimerAcceptance, saveDisclaimerAcceptance } from '@/lib/disclaimer'
import { hasSavedProfile } from '@/lib/profile'
import { useAuth } from '@/lib/auth/AuthContext'
import { hasCompletedOnboarding } from '@/lib/auth/userSync'
import { DisclaimerSummary } from './DisclaimerSummary'
import { AuthScreen } from './AuthScreen'
import { ProfileSetupStep } from './ProfileSetupStep'

type Step = 'checking' | 'language' | 'disclaimer' | 'profile' | 'done'

/**
 * App entry gate: sign in (or create an account), load that account's data, then on first run
 * pick a language, accept the disclaimer summary and walk through the user guide.
 */
export function RegistrationGate({ children }: { children: ReactNode }) {
  const { t, locale, setLocale } = useTranslation()
  const { status, retry } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [step, setStep] = useState<Step>('checking')
  const [isAdult, setIsAdult] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [signature, setSignature] = useState('')

  // People opening a shared snapshot link are viewers, not registering users.
  const isShareView = pathname === '/share'

  useEffect(() => {
    if (isShareView) setStep('done')
    else if (status === 'ready') {
      // Every account must sign the acknowledgement and fill in a profile before using the app.
      setStep(!loadDisclaimerAcceptance() ? 'language' : !hasSavedProfile() ? 'profile' : 'done')
    }
  }, [isShareView, status])

  useEffect(() => {
    if (step === 'language' || step === 'disclaimer' || step === 'profile') {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [step])

  const accept = () => {
    saveDisclaimerAcceptance(signature.trim())
    if (!hasSavedProfile()) setStep('profile')
    else finishSetup()
  }

  const finishSetup = () => {
    setStep('done')
    if (!hasCompletedOnboarding()) router.push('/guide')
  }

  if (!isShareView) {
    if (status === 'signedOut') return <AuthScreen />
    if (status === 'error') {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center bg-gray-50 dark:bg-gray-950">
          <p className="text-gray-600 dark:text-gray-300">{t('auth.errors.loadFailed')}</p>
          <button type="button" onClick={retry}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold">
            {t('auth.retry')}
          </button>
        </div>
      )
    }
    // Hold the app until the account's data is in place, so pages read the right user's data on mount.
    if (status !== 'ready' || step === 'checking') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950" aria-busy="true">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      )
    }
  }

  return (
    <>
      {children}
      {(step === 'language' || step === 'disclaimer' || step === 'profile') && (
        <div className="fixed inset-0 z-[100] bg-gray-50 dark:bg-gray-950 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="max-w-xl mx-auto px-4 sm:px-6 py-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">K</div>
              <span className="font-semibold text-gray-900 dark:text-white text-lg">{t('nav.brand')}</span>
              <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">{step === 'language' ? '1' : step === 'disclaimer' ? '2' : '3'} / 3</span>
            </div>

            {step === 'profile' ? (
              <ProfileSetupStep onSaved={finishSetup} />
            ) : step === 'language' ? (
              <>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('disclaimer.welcomeTitle')}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('disclaimer.welcomeSubtitle')}</p>
                <div className="grid grid-cols-2 gap-2 mb-8">
                  {LOCALES.map(l => (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => setLocale(l.value)}
                      className={`px-4 py-3 rounded-xl border text-sm font-medium text-left flex items-center justify-between transition-colors ${
                        locale === l.value
                          ? 'border-violet-500 bg-violet-500/10 text-gray-900 dark:text-white'
                          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      {l.label}
                      {locale === l.value && <span className="text-violet-500">✓</span>}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setStep('disclaimer')}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold hover:from-violet-600 hover:to-purple-700 transition-all"
                >
                  {t('disclaimer.continueButton')}
                </button>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('disclaimer.title')}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('disclaimer.subtitle')}</p>
                <DisclaimerSummary />
                <div className="mt-6 space-y-3">
                  <label className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={isAdult} onChange={e => setIsAdult(e.target.checked)} className="mt-0.5 w-4 h-4 accent-violet-500" />
                    {t('disclaimer.ageCheckbox')}
                  </label>
                  <label className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 accent-violet-500" />
                    {t('disclaimer.agreeCheckbox')}
                  </label>
                </div>
                <div className="mt-5">
                  <label htmlFor="disclaimer-signature" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('disclaimer.signatureLabel')}
                  </label>
                  <input
                    id="disclaimer-signature"
                    value={signature}
                    onChange={e => setSignature(e.target.value)}
                    placeholder={t('disclaimer.signaturePlaceholder')}
                    autoComplete="name"
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-lg italic placeholder:not-italic placeholder:text-base placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
                    style={{ fontFamily: 'cursive' }}
                  />
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    {t('disclaimer.signatureHint')} · {new Date().toLocaleDateString(locale)}
                  </p>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('language')}
                    className="px-5 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t('disclaimer.backButton')}
                  </button>
                  <button
                    type="button"
                    onClick={accept}
                    disabled={!isAdult || !agreed || signature.trim().length < 2}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold hover:from-violet-600 hover:to-purple-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t('disclaimer.agreeButton')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
