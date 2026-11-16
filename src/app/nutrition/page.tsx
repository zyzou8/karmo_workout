'use client'

import { PageHeader, AiLabel } from '@/components/PageHeader'
import { useState, ChangeEvent, useEffect, useMemo } from 'react'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { CollapsibleAIResponse } from '@/components/CollapsibleAIResponse'
import { DICTIONARIES } from '@/lib/i18n/translations'
import { streamAnalysis, StreamError } from '@/lib/api'
import { extractTag, stripTag, sumNutrients, NutrientData, NUTRITION_LOG_KEY, NUTRITION_TARGET_KEY } from '@/lib/nutrition'

const MEAL_TYPE_SLUGS = ['breakfast', 'lunch', 'dinner', 'snack', 'preWorkout', 'postWorkout'] as const
const GOAL_SLUGS = ['generalHealth', 'weightLoss', 'muscleBuilding', 'enduranceTraining', 'maintenance'] as const

type MealTypeSlug = typeof MEAL_TYPE_SLUGS[number]
type GoalSlug = typeof GOAL_SLUGS[number]
type MediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

interface LogEntry {
  id: string
  title: string
  mealType: MealTypeSlug
  description: string
  timestamp: string
  dateISO: string
  analysis: string
  nutrients?: NutrientData
}

const MAX_LOG_ENTRIES = 200

function dayKey(iso: string): string {
  return new Date(iso).toDateString()
}

function progressColor(actual: number, target: number): string {
  if (!target) return 'bg-gray-300 dark:bg-gray-600'
  const ratio = actual / target
  if (ratio > 1.1) return 'bg-red-500'
  if (ratio >= 0.85) return 'bg-emerald-500'
  return 'bg-amber-500'
}

export default function NutritionPage() {
  const { t, locale } = useTranslation()
  const [description, setDescription] = useState('')
  const [mealType, setMealType] = useState<MealTypeSlug>('breakfast')
  const [goal, setGoal] = useState<GoalSlug>('generalHealth')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState('')
  const [log, setLog] = useState<LogEntry[]>([])
  const [activeLogId, setActiveLogId] = useState<string | null>(null)
  const [target, setTarget] = useState<NutrientData | null>(null)

  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [titleDraft, setTitleDraft] = useState('')
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<{ title: string; mealType: MealTypeSlug; description: string }>({
    title: '', mealType: 'breakfast', description: '',
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NUTRITION_LOG_KEY)
      if (saved) setLog(JSON.parse(saved))
    } catch {
      console.warn('karmo: failed to parse saved nutrition log, resetting')
    }
    try {
      const savedTarget = localStorage.getItem(NUTRITION_TARGET_KEY)
      if (savedTarget) setTarget(JSON.parse(savedTarget))
    } catch {}
  }, [])

  const saveLog = (entries: LogEntry[]) => {
    const capped = entries.slice(0, MAX_LOG_ENTRIES)
    setLog(capped)
    try {
      localStorage.setItem(NUTRITION_LOG_KEY, JSON.stringify(capped))
    } catch {}
  }

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validTypes: MediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type as MediaType)) {
      alert(t('nutrition.invalidFileType'))
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setAnalysis('')
  }

  const mapStreamError = (err: unknown): string => {
    if (err instanceof StreamError) {
      if (err.kind === 'network') return t('errors.network')
      if (err.kind === 'timeout') return t('errors.timeout')
      return err.message || t('errors.generic')
    }
    return err instanceof Error ? err.message : t('errors.generic')
  }

  const analyzeNutrition = async () => {
    if (!description.trim() && !imageFile) {
      alert(t('nutrition.needInput'))
      return
    }

    setIsAnalyzing(true)
    setAnalysis('')

    try {
      const formData = new FormData()
      formData.append('description', description)
      formData.append('mealType', DICTIONARIES.en.nutrition.mealTypes[mealType])
      formData.append('goal', DICTIONARIES.en.nutrition.goals[goal])
      if (imageFile) formData.append('image', imageFile)
      formData.append('locale', locale)

      const fullAnalysis = await streamAnalysis('/api/analyze-nutrition', formData, setAnalysis)

      const nutrients = extractTag<NutrientData>(fullAnalysis, 'NUTRIENT_DATA') || undefined
      const cleanAnalysis = stripTag(fullAnalysis, 'NUTRIENT_DATA')
      setAnalysis(cleanAnalysis)

      const now = new Date()
      const fallbackDescription = description || t('nutrition.uploadPhotoText')
      const entry: LogEntry = {
        id: now.getTime().toString(),
        title: `${t(`nutrition.mealTypes.${mealType}`)} — ${fallbackDescription.slice(0, 40)}`,
        mealType,
        description: fallbackDescription,
        timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dateISO: now.toISOString(),
        analysis: cleanAnalysis,
        nutrients,
      }
      saveLog([entry, ...log])
      setActiveLogId(entry.id)

      setDescription('')
      setImageFile(null)
      setImagePreview(null)
    } catch (err) {
      setAnalysis('Error: ' + mapStreamError(err))
    } finally {
      setIsAnalyzing(false)
    }
  }

  const startEditTitle = (entry: LogEntry) => {
    setEditingTitleId(entry.id)
    setTitleDraft(entry.title)
  }
  const saveTitle = (id: string) => {
    saveLog(log.map(e => (e.id === id ? { ...e, title: titleDraft.trim() || e.title } : e)))
    setEditingTitleId(null)
  }

  const startEdit = (entry: LogEntry) => {
    setEditingEntryId(entry.id)
    setEditDraft({ title: entry.title, mealType: entry.mealType, description: entry.description })
  }
  const saveEdit = () => {
    if (!editingEntryId) return
    saveLog(log.map(e => (e.id === editingEntryId
      ? { ...e, title: editDraft.title.trim() || e.title, mealType: editDraft.mealType, description: editDraft.description }
      : e)))
    setEditingEntryId(null)
  }

  const deleteEntry = (id: string) => {
    if (!confirm(t('nutrition.deleteConfirm'))) return
    saveLog(log.filter(e => e.id !== id))
    if (activeLogId === id) {
      setActiveLogId(null)
      setAnalysis('')
    }
  }

  const todayKeyValue = new Date().toDateString()
  const todayEntries = useMemo(() => log.filter(e => dayKey(e.dateISO) === todayKeyValue), [log, todayKeyValue])
  const todayTotals = useMemo(() => sumNutrients(todayEntries.map(e => e.nutrients || {})), [todayEntries])

  const groupedByDay = useMemo(() => {
    const map = new Map<string, LogEntry[]>()
    for (const entry of log) {
      const key = dayKey(entry.dateISO)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(entry)
    }
    return Array.from(map.entries())
  }, [log])

  const renderEntryRow = (entry: LogEntry) => (
    <div
      key={entry.id}
      className={`rounded-lg text-sm transition-colors ${
        activeLogId === entry.id
          ? 'bg-orange-500/10 border border-orange-500/30'
          : 'bg-gray-100 dark:bg-gray-800 border border-transparent'
      }`}
    >
      {editingEntryId === entry.id ? (
        <div className="p-3 space-y-2">
          <input
            value={editDraft.title}
            onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))}
            placeholder={t('nutrition.editTitlePlaceholder')}
            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-900 dark:text-white text-xs focus:outline-none focus:border-orange-500"
          />
          <select
            value={editDraft.mealType}
            onChange={e => setEditDraft(d => ({ ...d, mealType: e.target.value as MealTypeSlug }))}
            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-900 dark:text-white text-xs focus:outline-none focus:border-orange-500"
          >
            {MEAL_TYPE_SLUGS.map(slug => (
              <option key={slug} value={slug}>{t(`nutrition.mealTypes.${slug}`)}</option>
            ))}
          </select>
          <textarea
            value={editDraft.description}
            onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))}
            rows={2}
            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-900 dark:text-white text-xs resize-none focus:outline-none focus:border-orange-500"
          />
          <div className="flex gap-2">
            <button onClick={saveEdit} className="flex-1 py-1.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium transition-colors">
              {t('nutrition.save')}
            </button>
            <button onClick={() => setEditingEntryId(null)} className="px-3 py-1.5 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs transition-colors">
              {t('nutrition.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div className="px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => { setAnalysis(entry.analysis); setActiveLogId(entry.id) }}
              className="flex-1 text-left min-w-0"
            >
              {editingTitleId === entry.id ? (
                <input
                  autoFocus
                  value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  onBlur={() => saveTitle(entry.id)}
                  onKeyDown={e => { if (e.key === 'Enter') saveTitle(entry.id); if (e.key === 'Escape') setEditingTitleId(null) }}
                  onClick={e => e.stopPropagation()}
                  className="w-full bg-white dark:bg-gray-900 border border-orange-500/50 rounded px-1.5 py-0.5 text-gray-900 dark:text-white text-xs"
                />
              ) : (
                <span className={`font-medium text-xs truncate block ${activeLogId === entry.id ? 'text-orange-300' : 'text-gray-700 dark:text-gray-300'}`}>
                  {entry.title}
                </span>
              )}
              <span className="text-xs text-gray-400 dark:text-gray-600">{entry.timestamp} · {t(`nutrition.mealTypes.${entry.mealType}`)}</span>
            </button>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); startEditTitle(entry) }}
                title={t('nutrition.editTitlePlaceholder')}
                className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-orange-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-xs"
              >
                ✏️
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); startEdit(entry) }}
                title={t('nutrition.edit')}
                className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-xs"
              >
                📝
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id) }}
                title={t('nutrition.delete')}
                className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-red-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-xs"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const nutrientRows: { key: keyof NutrientData; label: string }[] = [
    { key: 'calories', label: t('nutrition.calories') },
    { key: 'protein', label: t('nutrition.protein') },
    { key: 'carbs', label: t('nutrition.carbs') },
    { key: 'fat', label: t('nutrition.fat') },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageHeader title={t('nutrition.headerTitle')} back={{ href: '/insight', label: t('tabs.insight') }} />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('nutrition.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('nutrition.subtitle')}</p>
        </div>

        {/* Today's Nutrition summary */}
        <div className="mb-8 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm shadow-gray-200/60 dark:shadow-none p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('nutrition.todayTitle')}</h2>
            <AiLabel>{t('hub.aiEstimate')}</AiLabel>
          </div>
          {!target && (
            <p className="text-xs text-gray-500 mb-3">{t('nutrition.noTargetHint')}</p>
          )}
          <div className="grid sm:grid-cols-4 gap-4">
            {nutrientRows.map(({ key, label }) => {
              const actual = Math.round(todayTotals[key] || 0)
              const goalVal = target?.[key]
              return (
                <div key={key}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                    <span className="text-xs text-gray-500">
                      {actual}{goalVal ? ` / ${Math.round(goalVal)}` : ''}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${progressColor(actual, goalVal || 0)}`}
                      style={{ width: goalVal ? `${Math.min(100, (actual / goalVal) * 100)}%` : actual > 0 ? '100%' : '0%' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Input Panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* Goal */}
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('nutrition.goalLabel')}</label>
              <select
                value={goal}
                onChange={e => setGoal(e.target.value as GoalSlug)}
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
              >
                {GOAL_SLUGS.map(slug => (
                  <option key={slug} value={slug}>{t(`nutrition.goals.${slug}`)}</option>
                ))}
              </select>
            </div>

            {/* Meal type */}
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('nutrition.mealTypeLabel')}</label>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPE_SLUGS.map(slug => (
                  <button
                    key={slug}
                    onClick={() => setMealType(slug)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      mealType === slug
                        ? 'bg-orange-500 text-white font-medium'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-700'
                    }`}
                  >
                    {t(`nutrition.mealTypes.${slug}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Food description */}
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('nutrition.describeLabel')}</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t('nutrition.describePlaceholder')}
                rows={4}
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors resize-none"
              />
            </div>

            {/* Photo upload */}
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                {t('nutrition.photoLabel')} <span className="text-gray-400 dark:text-gray-600 font-normal">{t('nutrition.optional')}</span>
              </label>
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden">
                  <img src={imagePreview} alt="Food" className="w-full h-40 object-cover" />
                  <button
                    onClick={() => { setImageFile(null); setImagePreview(null) }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white dark:bg-gray-900/80 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="block border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-orange-500 rounded-xl cursor-pointer transition-colors">
                  <div className="h-24 flex flex-col items-center justify-center gap-1 text-gray-500">
                    <span className="text-2xl">🍽️</span>
                    <span className="text-xs">{t('nutrition.uploadPhotoText')}</span>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <button
              onClick={analyzeNutrition}
              disabled={isAnalyzing || (!description.trim() && !imageFile)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-all shadow-lg shadow-orange-500/20"
            >
              {isAnalyzing ? t('nutrition.analyzing') : t('nutrition.analyzeButton')}
            </button>

            {/* Today's meals */}
            {todayEntries.length > 0 && (
              <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm shadow-gray-200/60 dark:shadow-none p-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('nutrition.today')}</h3>
                <div className="space-y-2">
                  {todayEntries.map(renderEntryRow)}
                </div>
                <button
                  onClick={() => { if (confirm(t('nutrition.clearLogConfirm'))) saveLog([]) }}
                  className="mt-3 text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                >
                  {t('nutrition.clearLog')}
                </button>
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-3">
            <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm shadow-gray-200/60 dark:shadow-none min-h-96 sticky top-20">
              {!analysis && !isAnalyzing && (
                <div className="flex flex-col items-center justify-center h-96 text-gray-400 dark:text-gray-600">
                  <div className="text-5xl mb-3">🥗</div>
                  <p className="text-sm text-center px-8">
                    {t('nutrition.resultsPlaceholder')}
                  </p>
                </div>
              )}

              {isAnalyzing && !analysis && (
                <div className="flex flex-col items-center justify-center h-96 gap-3">
                  <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('nutrition.analyzingResults')}</p>
                </div>
              )}

              {analysis && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{t('nutrition.resultsTitle')}</h3>
                      <AiLabel>{t('hub.aiEstimate')}</AiLabel>
                    </div>
                    {isAnalyzing && (
                      <div className="flex items-center gap-2 text-xs text-orange-400">
                        <div className="w-3 h-3 border border-orange-400 border-t-transparent rounded-full animate-spin" />
                        {t('nutrition.analyzing')}
                      </div>
                    )}
                  </div>
                  <CollapsibleAIResponse
                    text={analysis}
                    className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed streaming-text overflow-y-auto max-h-[calc(100vh-14rem)]"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Meal History */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('nutrition.historyTitle')}</h2>
          {groupedByDay.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-600">{t('nutrition.noEntriesYet')}</p>
          ) : (
            <div className="space-y-4">
              {groupedByDay.map(([day, entries]) => {
                const dayTotals = sumNutrients(entries.map(e => e.nutrients || {}))
                const isToday = day === todayKeyValue
                return (
                  <div key={day} className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm shadow-gray-200/60 dark:shadow-none p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{isToday ? t('nutrition.today') : day}</span>
                      <span className="text-xs text-gray-500">
                        {t('nutrition.dayTotal')}: {Math.round(dayTotals.calories)} {t('nutrition.calories').toLowerCase()} · ✦ {t('hub.aiEstimate')}
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {entries.map(renderEntryRow)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
