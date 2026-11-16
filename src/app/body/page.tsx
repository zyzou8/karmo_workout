'use client'

import { PageHeader } from '@/components/PageHeader'
import { useState, useEffect, ChangeEvent } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { CollapsibleAIResponse } from '@/components/CollapsibleAIResponse'
import { DICTIONARIES } from '@/lib/i18n/translations'
import { streamAnalysis, StreamError } from '@/lib/api'
import { extractTag, stripTag, NUTRITION_TARGET_KEY } from '@/lib/nutrition'
import {
  FITNESS_LEVEL_SLUGS, GOAL_SLUGS, EQUIPMENT_SLUGS, GENDER_SLUGS,
  FitnessLevelSlug, GoalSlug, EquipmentSlug, GenderSlug, loadProfile,
} from '@/lib/profile'

const DAYS = ['2', '3', '4', '5', '6']

type MediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

export default function BodyPage() {
  const { t, locale } = useTranslation()
  const [age, setAge] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [gender, setGender] = useState<GenderSlug>('notSpecified')
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevelSlug>('beginner')
  const [goal, setGoal] = useState<GoalSlug>('loseWeight')
  const [daysPerWeek, setDaysPerWeek] = useState('3')
  const [equipment, setEquipment] = useState<EquipmentSlug>('none')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [plan, setPlan] = useState('')
  const [targetSaved, setTargetSaved] = useState(false)
  const [prefilledFromProfile, setPrefilledFromProfile] = useState(false)

  useEffect(() => {
    const p = loadProfile()
    if (p.age || p.heightCm || p.weightKg) {
      setAge(p.age)
      setHeightCm(p.heightCm)
      setWeightKg(p.weightKg)
      setGender(p.gender)
      setFitnessLevel(p.fitnessLevel)
      setGoal(p.goal)
      setDaysPerWeek(p.daysPerWeek)
      setEquipment(p.equipment)
      setPrefilledFromProfile(true)
    }
  }, [])

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validTypes: MediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type as MediaType)) {
      alert(t('body.invalidFileType'))
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setPlan('')
  }

  const mapStreamError = (err: unknown): string => {
    if (err instanceof StreamError) {
      if (err.kind === 'network') return t('errors.network')
      if (err.kind === 'timeout') return t('errors.timeout')
      return err.message || t('errors.generic')
    }
    return err instanceof Error ? err.message : t('errors.generic')
  }

  const generatePlan = async () => {
    setIsGenerating(true)
    setPlan('')
    setTargetSaved(false)

    try {
      const formData = new FormData()
      if (imageFile) formData.append('image', imageFile)
      formData.append('age', age)
      formData.append('heightCm', heightCm)
      formData.append('weightKg', weightKg)
      formData.append('gender', DICTIONARIES.en.body[
        gender === 'notSpecified' ? 'genderNotSpecified'
          : gender === 'male' ? 'genderMale'
          : gender === 'female' ? 'genderFemale'
          : 'genderNonBinary'
      ])
      formData.append('fitnessLevel', DICTIONARIES.en.body.fitnessLevels[fitnessLevel])
      formData.append('goals', DICTIONARIES.en.body.goals[goal])
      formData.append('daysPerWeek', daysPerWeek)
      formData.append('equipment', DICTIONARIES.en.body.equipment[equipment])
      formData.append('locale', locale)

      const fullPlan = await streamAnalysis('/api/analyze-body', formData, setPlan)

      const target = extractTag<{ calories?: number; protein?: number; carbs?: number; fat?: number }>(fullPlan, 'TARGET_DATA')
      if (target) {
        try {
          localStorage.setItem(NUTRITION_TARGET_KEY, JSON.stringify({ ...target, updatedAt: Date.now() }))
          setTargetSaved(true)
        } catch {}
      }
      setPlan(stripTag(fullPlan, 'TARGET_DATA'))
    } catch (err) {
      setPlan('Error: ' + mapStreamError(err))
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageHeader title={t('body.headerTitle')} back={{ href: '/insight', label: t('tabs.insight') }} />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('body.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('body.subtitle')}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form Panel */}
          <div className="space-y-4">
            {/* Optional photo */}
            <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm shadow-gray-200/60 dark:shadow-none p-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('body.photoLabel')} <span className="text-gray-500 font-normal">{t('body.optional')}</span></p>
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Body" className="w-full h-48 object-cover rounded-lg" />
                  <button
                    onClick={() => { setImageFile(null); setImagePreview(null) }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white dark:bg-gray-900/80 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="block border border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-500 rounded-lg cursor-pointer transition-colors">
                  <div className="h-24 flex flex-col items-center justify-center gap-1 text-gray-500">
                    <span className="text-2xl">📸</span>
                    <span className="text-xs">{t('body.uploadPhoto')}</span>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-2">{t('body.photoHelp')}</p>
            </div>

            {/* Measurements */}
            <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm shadow-gray-200/60 dark:shadow-none p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('body.measurementsTitle')}</p>
                <Link href="/profile" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                  {t('profile.editInProfile')}
                </Link>
              </div>
              {prefilledFromProfile && (
                <p className="text-xs text-gray-500">{t('profile.loadedFromProfileHint')}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('body.age')}</label>
                  <input
                    type="number"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    placeholder="25"
                    min="10"
                    max="100"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('body.gender')}</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value as GenderSlug)}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="notSpecified">{t('body.genderNotSpecified')}</option>
                    <option value="male">{t('body.genderMale')}</option>
                    <option value="female">{t('body.genderFemale')}</option>
                    <option value="nonBinary">{t('body.genderNonBinary')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('body.height')}</label>
                  <input
                    type="number"
                    value={heightCm}
                    onChange={e => setHeightCm(e.target.value)}
                    placeholder="175"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('body.weight')}</label>
                  <input
                    type="number"
                    value={weightKg}
                    onChange={e => setWeightKg(e.target.value)}
                    placeholder="70"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Training preferences */}
            <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm shadow-gray-200/60 dark:shadow-none p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('body.trainingPrefsTitle')}</p>

              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('body.fitnessLevel')}</label>
                <select
                  value={fitnessLevel}
                  onChange={e => setFitnessLevel(e.target.value as FitnessLevelSlug)}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  {FITNESS_LEVEL_SLUGS.map(slug => (
                    <option key={slug} value={slug}>{t(`body.fitnessLevels.${slug}`)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('body.primaryGoal')}</label>
                <select
                  value={goal}
                  onChange={e => setGoal(e.target.value as GoalSlug)}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  {GOAL_SLUGS.map(slug => (
                    <option key={slug} value={slug}>{t(`body.goals.${slug}`)}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('body.daysPerWeek')}</label>
                  <select
                    value={daysPerWeek}
                    onChange={e => setDaysPerWeek(e.target.value)}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    {DAYS.map(d => <option key={d} value={d}>{d} {t('body.daysSuffix')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('body.equipmentLabel')}</label>
                  <select
                    value={equipment}
                    onChange={e => setEquipment(e.target.value as EquipmentSlug)}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    {EQUIPMENT_SLUGS.map(slug => (
                      <option key={slug} value={slug}>{t(`body.equipment.${slug}`)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={generatePlan}
              disabled={isGenerating}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-all shadow-lg shadow-emerald-500/20"
            >
              {isGenerating ? t('body.generating') : t('body.generateButton')}
            </button>
          </div>

          {/* Results Panel */}
          <div>
            <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm shadow-gray-200/60 dark:shadow-none min-h-96 sticky top-20">
              {!plan && !isGenerating && (
                <div className="flex flex-col items-center justify-center h-96 text-gray-400 dark:text-gray-600">
                  <div className="text-5xl mb-3">📋</div>
                  <p className="text-sm text-center px-8">{t('body.resultsPlaceholder')}</p>
                </div>
              )}

              {isGenerating && !plan && (
                <div className="flex flex-col items-center justify-center h-96 gap-3">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('body.buildingPlan')}</p>
                </div>
              )}

              {plan && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{t('body.planTitle')}</h3>
                    {isGenerating && (
                      <div className="flex items-center gap-2 text-xs text-emerald-400">
                        <div className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                        {t('body.writing')}
                      </div>
                    )}
                  </div>
                  {targetSaved && !isGenerating && (
                    <div className="mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-300">
                      {t('body.targetSavedHint')}
                    </div>
                  )}
                  <CollapsibleAIResponse
                    text={plan}
                    className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed streaming-text overflow-y-auto max-h-[calc(100vh-16rem)]"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
