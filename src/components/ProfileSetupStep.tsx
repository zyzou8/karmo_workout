'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import {
  EQUIPMENT_SLUGS, FITNESS_LEVEL_SLUGS, GOAL_SLUGS,
  EquipmentSlug, FitnessLevelSlug, GenderSlug, GoalSlug, UserProfile,
  loadProfile, saveProfile,
} from '@/lib/profile'
import { cmToDisplay, displayToCm, displayToKg, kgToDisplay, useUnits } from '@/lib/units'

const DAYS = ['2', '3', '4', '5', '6']

const fieldClass = 'w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-violet-500 transition-colors'
const labelClass = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'

/** Required first-run step: the user fills in their profile before entering the app. */
export function ProfileSetupStep({ onSaved }: { onSaved: () => void }) {
  const { t } = useTranslation()
  const [p, setP] = useState<UserProfile>(() => loadProfile())
  const [error, setError] = useState<string | null>(null)
  const [units, setUnits] = useUnits()
  // Height/weight are typed in the chosen display units and stored as cm/kg.
  const [heightIn, setHeightIn] = useState('')
  const [weightIn, setWeightIn] = useState('')

  useEffect(() => {
    const h = parseFloat(p.heightCm), w = parseFloat(p.weightKg)
    setHeightIn(Number.isFinite(h) ? String(cmToDisplay(h, units.length)) : '')
    setWeightIn(Number.isFinite(w) ? String(kgToDisplay(w, units.weight)) : '')
    // Re-derive only when the unit changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units.length, units.weight])

  const onHeight = (v: string) => {
    setHeightIn(v)
    const n = parseFloat(v)
    set('heightCm', Number.isFinite(n) ? String(Math.round(displayToCm(n, units.length) * 10) / 10) : '')
  }
  const onWeight = (v: string) => {
    setWeightIn(v)
    const n = parseFloat(v)
    set('weightKg', Number.isFinite(n) ? String(Math.round(displayToKg(n, units.weight) * 10) / 10) : '')
  }
  const unitToggle = (kind: 'length' | 'weight') => {
    const opts = kind === 'length' ? (['in', 'cm'] as const) : (['lb', 'kg'] as const)
    return (
      <span className="inline-flex ml-2 rounded-full bg-gray-100 dark:bg-gray-800 p-0.5 align-middle">
        {opts.map(o => (
          <button key={o} type="button" onClick={() => setUnits({ ...units, [kind]: o })}
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${units[kind] === o ? 'bg-olive-800 text-white dark:bg-sage-300 dark:text-gray-900' : 'text-gray-500'}`}>
            {o}
          </button>
        ))}
      </span>
    )
  }

  const set = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => setP(prev => ({ ...prev, [key]: value }))

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const age = Number(p.age), height = Number(p.heightCm), weight = Number(p.weightKg)
    if (!p.age || !Number.isFinite(age) || age < 18 || age > 100) return setError(t('profileSetup.errorAge'))
    if (!p.heightCm || !(height >= 100 && height <= 250)) return setError(t('profileSetup.errorHeight'))
    if (!p.weightKg || !(weight >= 30 && weight <= 300)) return setError(t('profileSetup.errorWeight'))
    saveProfile(p)
    onSaved()
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('profileSetup.title')}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('profileSetup.subtitle')}</p>
      <p className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full bg-sage-300/40 dark:bg-sage-300/10 text-olive-700 dark:text-sage-300 text-xs font-bold">
        <span className="font-display text-sm">60s</span> {t('onboarding.sixtySeconds')}
      </p>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ps-height" className={labelClass}>{t('body.height').replace(/\s*[（(]\s*cm\s*[)）]/i, '')} *{unitToggle('length')}</label>
            <input id="ps-height" type="number" inputMode="decimal" placeholder={units.length === 'in' ? '69' : '175'}
              value={heightIn} onChange={e => onHeight(e.target.value)} className={fieldClass} required />
          </div>
          <div>
            <label htmlFor="ps-weight" className={labelClass}>{t('body.weight').replace(/\s*[（(]\s*kg\s*[)）]/i, '')} *{unitToggle('weight')}</label>
            <input id="ps-weight" type="number" inputMode="decimal" placeholder={units.weight === 'lb' ? '155' : '70'}
              value={weightIn} onChange={e => onWeight(e.target.value)} className={fieldClass} required />
          </div>
        </div>

        <div>
          <label htmlFor="ps-goal" className={labelClass}>{t('body.primaryGoal')}</label>
          <select id="ps-goal" value={p.goal} onChange={e => set('goal', e.target.value as GoalSlug)} className={fieldClass}>
            {GOAL_SLUGS.map(slug => <option key={slug} value={slug}>{t(`body.goals.${slug}`)}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="ps-equipment" className={labelClass}>{t('body.equipmentLabel')}</label>
          <select id="ps-equipment" value={p.equipment} onChange={e => set('equipment', e.target.value as EquipmentSlug)} className={fieldClass}>
            {EQUIPMENT_SLUGS.map(slug => <option key={slug} value={slug}>{t(`body.equipment.${slug}`)}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ps-age" className={labelClass}>{t('body.age')} *</label>
            <input id="ps-age" type="number" inputMode="numeric" min="18" max="100" placeholder="25"
              value={p.age} onChange={e => set('age', e.target.value)} className={fieldClass} required />
          </div>
          <div>
            <label htmlFor="ps-gender" className={labelClass}>{t('body.gender')}</label>
            <select id="ps-gender" value={p.gender} onChange={e => set('gender', e.target.value as GenderSlug)} className={fieldClass}>
              <option value="notSpecified">{t('body.genderNotSpecified')}</option>
              <option value="male">{t('body.genderMale')}</option>
              <option value="female">{t('body.genderFemale')}</option>
              <option value="nonBinary">{t('body.genderNonBinary')}</option>
            </select>
          </div>
          <div>
            <label htmlFor="ps-level" className={labelClass}>{t('body.fitnessLevel')}</label>
            <select id="ps-level" value={p.fitnessLevel} onChange={e => set('fitnessLevel', e.target.value as FitnessLevelSlug)} className={fieldClass}>
              {FITNESS_LEVEL_SLUGS.map(slug => <option key={slug} value={slug}>{t(`body.fitnessLevels.${slug}`)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ps-days" className={labelClass}>{t('body.daysPerWeek')}</label>
            <select id="ps-days" value={p.daysPerWeek} onChange={e => set('daysPerWeek', e.target.value)} className={fieldClass}>
              {DAYS.map(d => <option key={d} value={d}>{d} {t('body.daysSuffix')}</option>)}
            </select>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">{t('profileSetup.hint')}</p>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
      )}

      <button type="submit"
        className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/25">
        {t('profileSetup.saveButton')}
      </button>
    </form>
  )
}
