'use client'

import { ReactNode, useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { LOCALES } from '@/lib/i18n/translations'
import { useTheme, ThemeMode } from '@/lib/theme/ThemeContext'
import { useAuth } from '@/lib/auth/AuthContext'
import { useUnits } from '@/lib/units'
import { CoachSettings, CoachSliders, DEFAULT_COACH_SETTINGS, loadCoachSettings, saveCoachSettings } from '@/lib/coach'
import { PageHeader } from '@/components/PageHeader'
import { DisclaimerSummary } from '@/components/DisclaimerSummary'

function Section({ id, n, title, hint, children }: { id?: string; n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <section id={id} className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800 p-5 scroll-mt-24">
      <div className="flex items-start gap-3 mb-4">
        <span className="w-8 h-8 shrink-0 rounded-full bg-sage-300 text-olive-800 font-display text-lg flex items-center justify-center">{n}</span>
        <div>
          <h2 className="text-xl text-olive-800 dark:text-gray-50 leading-8">{title}</h2>
          {hint && <p className="text-sm text-gray-500 dark:text-gray-400">{hint}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{label}</span>
      <div role="group" aria-label={label} className="flex rounded-full bg-gray-100 dark:bg-gray-800 p-1">
        {options.map(o => (
          <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-bold transition-colors ${value === o.value ? 'bg-olive-800 text-white dark:bg-sage-300 dark:text-gray-900' : 'text-gray-500'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function PersonaSlider({ left, right, value, onChange }: { left: string; right: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="flex justify-between text-xs font-bold text-gray-500 mb-1"><span>{left}</span><span>{right}</span></span>
      <input type="range" min={0} max={100} step={5} value={value} onChange={e => onChange(Number(e.target.value))}
        aria-label={`${left} – ${right}`} className="w-full accent-olive-600 dark:accent-sage-300" />
    </label>
  )
}

export default function SettingsPage() {
  const { t, locale, setLocale } = useTranslation()
  const { mode, setMode } = useTheme()
  const { user, logout } = useAuth()
  const [units, setUnits] = useUnits()
  const [coach, setCoach] = useState<CoachSettings>(DEFAULT_COACH_SETTINGS)
  const [showDisclaimer, setShowDisclaimer] = useState(false)

  useEffect(() => { setCoach(loadCoachSettings()) }, [])

  const setSlider = (key: keyof CoachSliders, v: number) => {
    const next = { ...coach, sliders: { ...coach.sliders, [key]: v } }
    setCoach(next)
    saveCoachSettings(next)
  }

  return (
    <div className="min-h-screen">
      <PageHeader title={t('settingsPage.title')} back={{ href: '/profile', label: t('tabs.me') }} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-5 space-y-3">
        <Section n={1} title={t('settingsPage.units')} hint={t('settingsPage.unitsHint')}>
          <Segmented label={t('settingsPage.weightUnit')} value={units.weight}
            options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]}
            onChange={v => setUnits({ ...units, weight: v })} />
          <Segmented label={t('settingsPage.lengthUnit')} value={units.length}
            options={[{ value: 'cm', label: 'cm' }, { value: 'in', label: 'in' }]}
            onChange={v => setUnits({ ...units, length: v })} />
          <Segmented label={t('settingsPage.energyUnit')} value={units.energy}
            options={[{ value: 'kcal', label: 'kcal' }]}
            onChange={v => setUnits({ ...units, energy: v })} />
        </Section>

        <Section n={2} title={t('settingsPage.theme')}>
          <Segmented<ThemeMode> label={t('settingsPage.theme')} value={mode}
            options={[
              { value: 'dark', label: t('settingsPage.themeDark') },
              { value: 'light', label: t('settingsPage.themeLight') },
              { value: 'system', label: t('settingsPage.themeSystem') },
            ]}
            onChange={setMode} />
          <div>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">{t('settingsPage.language')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LOCALES.map(l => (
                <button key={l.value} type="button" onClick={() => setLocale(l.value)} aria-pressed={locale === l.value}
                  className={`px-3 py-2 rounded-xl text-sm border transition-colors ${
                    locale === l.value
                      ? 'border-olive-600 dark:border-sage-300 bg-sage-300/30 dark:bg-sage-300/10 text-olive-800 dark:text-white font-bold'
                      : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300'
                  }`}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section n={3} title={t('settingsPage.profileBio')} hint={t('settingsPage.profileBioText')}>
          <Link href="/profile" className="inline-flex px-4 py-2.5 rounded-full bg-olive-800 dark:bg-sage-300 text-white dark:text-gray-900 text-sm font-bold">
            {t('nav.profile')} →
          </Link>
        </Section>

        <Section id="coach" n={4} title={t('settingsPage.coachPersonas')}>
          <PersonaSlider left={t('settingsPage.strict')} right={t('settingsPage.gentle')} value={coach.sliders.gentle} onChange={v => setSlider('gentle', v)} />
          <PersonaSlider left={t('settingsPage.harsh')} right={t('settingsPage.encouraging')} value={coach.sliders.encourage} onChange={v => setSlider('encourage', v)} />
          <PersonaSlider left={t('settingsPage.detailed')} right={t('settingsPage.minimal')} value={coach.sliders.brevity} onChange={v => setSlider('brevity', v)} />
        </Section>

        <Section n={5} title={t('settingsPage.account')} hint={t('settingsPage.oneProfile')}>
          {user && (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t('settingsPage.signedInAs')} <b className="text-olive-800 dark:text-white">{user.displayName}</b>
              {user.displayName !== user.username && <span className="text-gray-400"> @{user.username}</span>}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowDisclaimer(s => !s)}
              className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-200">
              {t('settingsPage.disclaimer')}
            </button>
            <Link href="/guide" className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-200">
              {t('settingsPage.guide')}
            </Link>
            {user && (
              <button type="button" onClick={() => void logout()}
                className="px-4 py-2 rounded-full border border-red-500/30 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10">
                {t('settingsPage.logout')}
              </button>
            )}
          </div>
          {showDisclaimer && <div className="pt-2"><DisclaimerSummary /></div>}
        </Section>

        <Section n={6} title={t('settingsPage.help')}>
          <p className="text-sm text-gray-600 dark:text-gray-300">{t('settingsPage.helpText')}</p>
        </Section>
      </main>
    </div>
  )
}
