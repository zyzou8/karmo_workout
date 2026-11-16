'use client'

import { PageHeader } from '@/components/PageHeader'
import { scoreBand } from '@/components/VideoAnalysisFigures'
import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { CalendarPicker } from '@/components/CalendarPicker'
import { TrendChart } from '@/components/TrendChart'
import { getActivityByDate, DayActivity } from '@/lib/activity'
import {
  FITNESS_LEVEL_SLUGS, GOAL_SLUGS, EQUIPMENT_SLUGS,
  FitnessLevelSlug, GoalSlug, EquipmentSlug, GenderSlug,
  DEFAULT_PROFILE, loadProfile, saveProfile,
  MeasurementEntry, loadMeasurements, saveMeasurements,
} from '@/lib/profile'

const DAYS = ['2', '3', '4', '5', '6']

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function ProfilePage() {
  const { t, locale } = useTranslation()

  const [age, setAge] = useState(DEFAULT_PROFILE.age)
  const [heightCm, setHeightCm] = useState(DEFAULT_PROFILE.heightCm)
  const [weightKg, setWeightKg] = useState(DEFAULT_PROFILE.weightKg)
  const [gender, setGender] = useState<GenderSlug>(DEFAULT_PROFILE.gender)
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevelSlug>(DEFAULT_PROFILE.fitnessLevel)
  const [goal, setGoal] = useState<GoalSlug>(DEFAULT_PROFILE.goal)
  const [daysPerWeek, setDaysPerWeek] = useState(DEFAULT_PROFILE.daysPerWeek)
  const [equipment, setEquipment] = useState<EquipmentSlug>(DEFAULT_PROFILE.equipment)
  const [savedFlash, setSavedFlash] = useState(false)

  const [measurements, setMeasurements] = useState<MeasurementEntry[]>([])
  const [entryDate, setEntryDate] = useState(todayInputValue())
  const [entryWeight, setEntryWeight] = useState('')
  const [entryBodyFat, setEntryBodyFat] = useState('')
  const [entryNote, setEntryNote] = useState('')

  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [activityByDate, setActivityByDate] = useState<Map<string, DayActivity>>(new Map())

  useEffect(() => {
    const p = loadProfile()
    setAge(p.age)
    setHeightCm(p.heightCm)
    setWeightKg(p.weightKg)
    setGender(p.gender)
    setFitnessLevel(p.fitnessLevel)
    setGoal(p.goal)
    setDaysPerWeek(p.daysPerWeek)
    setEquipment(p.equipment)
    setMeasurements(loadMeasurements())
    setActivityByDate(getActivityByDate())

    const dateParam = new URLSearchParams(window.location.search).get('date')
    if (dateParam) {
      const match = dateParam.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (match) {
        const [, y, m, d] = match
        setSelectedDate(new Date(Number(y), Number(m) - 1, Number(d)))
      }
    }
  }, [])

  const getDots = (date: Date): string[] => {
    const activity = activityByDate.get(date.toDateString())
    if (!activity) return []
    const dots: string[] = []
    if (activity.workouts.length > 0) dots.push('bg-emerald-500')
    if (activity.meals.length > 0) dots.push('bg-orange-500')
    if (activity.measurement) dots.push('bg-violet-500')
    return dots
  }

  const selectedActivity = activityByDate.get(selectedDate.toDateString())

  const handleSaveProfile = () => {
    saveProfile({ age, heightCm, weightKg, gender, fitnessLevel, goal, daysPerWeek, equipment })
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2500)
  }

  const handleAddMeasurement = () => {
    const weight = parseFloat(entryWeight)
    if (!entryWeight || Number.isNaN(weight)) return
    const bodyFat = entryBodyFat ? parseFloat(entryBodyFat) : undefined
    const entry: MeasurementEntry = {
      id: Date.now().toString(),
      dateISO: new Date(entryDate || todayInputValue()).toISOString(),
      weightKg: weight,
      bodyFatPct: bodyFat !== undefined && !Number.isNaN(bodyFat) ? bodyFat : undefined,
      note: entryNote.trim() || undefined,
    }
    const next = [entry, ...measurements]
    setMeasurements(next)
    saveMeasurements(next)
    setActivityByDate(getActivityByDate())
    setEntryWeight('')
    setEntryBodyFat('')
    setEntryNote('')
  }

  const deleteMeasurement = (id: string) => {
    if (!confirm(t('profile.deleteEntryConfirm'))) return
    const next = measurements.filter(m => m.id !== id)
    setMeasurements(next)
    saveMeasurements(next)
    setActivityByDate(getActivityByDate())
  }

  const sortedAsc = useMemo(
    () => [...measurements].sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime()),
    [measurements]
  )
  const deltaById = useMemo(() => {
    const map = new Map<string, number>()
    for (let i = 1; i < sortedAsc.length; i++) {
      const prev = sortedAsc[i - 1].weightKg
      const cur = sortedAsc[i].weightKg
      if (prev != null && cur != null) map.set(sortedAsc[i].id, cur - prev)
    }
    return map
  }, [sortedAsc])
  const sortedDesc = useMemo(() => [...sortedAsc].reverse(), [sortedAsc])

  const weightTrendValues = useMemo(
    () => sortedAsc.filter(m => m.weightKg != null).map(m => m.weightKg as number),
    [sortedAsc]
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Nav */}
      <PageHeader title={t('profile.headerTitle')} />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('profile.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('profile.subtitle')}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Profile form */}
          <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm shadow-gray-200/60 dark:shadow-none p-5 space-y-4 h-fit">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.profileSectionTitle')}</p>

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
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('body.gender')}</label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value as GenderSlug)}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
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
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('body.weight')}</label>
                <input
                  type="number"
                  value={weightKg}
                  onChange={e => setWeightKg(e.target.value)}
                  placeholder="70"
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">{t('body.fitnessLevel')}</label>
              <select
                value={fitnessLevel}
                onChange={e => setFitnessLevel(e.target.value as FitnessLevelSlug)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
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
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
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
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                >
                  {DAYS.map(d => <option key={d} value={d}>{d} {t('body.daysSuffix')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('body.equipmentLabel')}</label>
                <select
                  value={equipment}
                  onChange={e => setEquipment(e.target.value as EquipmentSlug)}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                >
                  {EQUIPMENT_SLUGS.map(slug => (
                    <option key={slug} value={slug}>{t(`body.equipment.${slug}`)}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold transition-all shadow-lg shadow-violet-500/20"
            >
              {t('profile.saveButton')}
            </button>
            {savedFlash && (
              <p className="text-xs text-emerald-400 text-center">{t('profile.savedHint')}</p>
            )}
          </div>

          {/* Progress log */}
          <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm shadow-gray-200/60 dark:shadow-none p-5 space-y-4 h-fit">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.measurementLogTitle')}</p>
              <p className="text-xs text-gray-500">{t('profile.measurementLogSubtitle')}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('profile.dateLabel')}</label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={e => setEntryDate(e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('body.weight')}</label>
                <input
                  type="number"
                  value={entryWeight}
                  onChange={e => setEntryWeight(e.target.value)}
                  placeholder="70"
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('profile.bodyFatLabel')}</label>
                <input
                  type="number"
                  value={entryBodyFat}
                  onChange={e => setEntryBodyFat(e.target.value)}
                  placeholder="18"
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('profile.noteLabel')}</label>
                <input
                  type="text"
                  value={entryNote}
                  onChange={e => setEntryNote(e.target.value)}
                  placeholder={t('profile.notePlaceholder')}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>

            <button
              onClick={handleAddMeasurement}
              disabled={!entryWeight}
              className="w-full py-2.5 rounded-lg bg-violet-500/10 border border-violet-500/30 hover:bg-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-violet-300 text-sm font-medium transition-colors"
            >
              {t('profile.logButton')}
            </button>

            {weightTrendValues.length >= 2 && (
              <div className="pt-2">
                <p className="text-xs text-gray-500 mb-2">{t('profile.trendTitle')}</p>
                <TrendChart values={weightTrendValues} gradientId="weightTrendGradient" />
              </div>
            )}

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {sortedDesc.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-600">{t('profile.noMeasurementsYet')}</p>
              ) : (
                sortedDesc.map(entry => {
                  const delta = deltaById.get(entry.id)
                  return (
                    <div key={entry.id} className="flex items-center justify-between gap-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2">
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {entry.weightKg != null ? `${entry.weightKg} kg` : '—'}
                          </span>
                          {delta != null && (
                            <span className={`text-xs ${delta > 0 ? 'text-amber-400' : delta < 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                              {delta > 0 ? '+' : ''}{delta.toFixed(1)} kg {t('profile.sinceLast')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {new Date(entry.dateISO).toLocaleDateString()}
                          {entry.bodyFatPct != null ? ` · ${entry.bodyFatPct}% BF` : ''}
                          {entry.note ? ` · ${entry.note}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteMeasurement(entry.id)}
                        title={t('nutrition.delete')}
                        className="w-6 h-6 shrink-0 flex items-center justify-center rounded text-gray-500 hover:text-red-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-xs"
                      >
                        🗑️
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Activity Calendar */}
        <div className="mt-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm shadow-gray-200/60 dark:shadow-none p-5">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.activityCalendarTitle')}</p>
          <p className="text-xs text-gray-500 mb-4">{t('profile.activityCalendarSubtitle')}</p>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <CalendarPicker locale={locale} selected={selectedDate} onSelect={setSelectedDate} getDots={getDots} />
              <div className="flex items-center gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> {t('profile.legendWorkout')}</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" /> {t('profile.legendMeal')}</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-500" /> {t('profile.legendMeasurement')}</span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }).format(selectedDate)}
              </p>

              {!selectedActivity || (selectedActivity.workouts.length === 0 && selectedActivity.meals.length === 0 && !selectedActivity.measurement) ? (
                <p className="text-xs text-gray-400 dark:text-gray-600">{t('profile.noActivityForDay')}</p>
              ) : (
                <>
                  {selectedActivity.workouts.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1.5">{t('profile.workoutsHeading')}</p>
                      <div className="space-y-1">
                        {selectedActivity.workouts.map(w => (
                          <div key={w.id} className="flex items-center justify-between rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs">
                            <span className="text-gray-700 dark:text-gray-300">{w.exercise}</span>
                            {w.formScore != null && (
                              <span className="text-gray-500">{t('honest.confidenceBand')}: {t(`honest.${scoreBand(w.formScore)}`)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedActivity.meals.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1.5">{t('profile.mealsHeading')}</p>
                      <div className="space-y-1">
                        {selectedActivity.meals.map(m => (
                          <div key={m.id} className="flex items-center justify-between rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs">
                            <span className="text-gray-700 dark:text-gray-300 truncate">{m.title}</span>
                            <span className="text-gray-500 shrink-0 ml-2">{m.timestamp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedActivity.measurement && (
                    <div>
                      <p className="text-xs font-medium text-violet-600 dark:text-violet-400 mb-1.5">{t('profile.measurementHeading')}</p>
                      <div className="rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300">
                        {selectedActivity.measurement.weightKg != null ? `${selectedActivity.measurement.weightKg} kg` : ''}
                        {selectedActivity.measurement.bodyFatPct != null ? ` · ${selectedActivity.measurement.bodyFatPct}% BF` : ''}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
