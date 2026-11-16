import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import TopBar from '../components/TopBar'
import HeaderActions from '../components/HeaderActions'
import ChipGroup from '../components/ChipGroup'
import MarkdownText from '../components/MarkdownText'
import { appendImage, PickedImage } from '../lib/api'
import { streamAnalysis, StreamError } from '../lib/streaming'
import {
  LogEntry, MealTypeSlug, NutrientData, NutritionTarget,
  extractTag, stripTag, sumNutrients,
  loadNutritionLog, saveNutritionLog, loadNutritionTarget,
} from '../lib/nutrition'
import { DICTIONARIES } from '../lib/i18n/translations'
import { useTheme } from '../lib/theme/ThemeContext'
import { useTranslation } from '../lib/i18n/LanguageContext'
import { spacing, radius, fonts } from '../theme'

const MEAL_TYPE_SLUGS: MealTypeSlug[] = ['breakfast', 'lunch', 'dinner', 'snack', 'preWorkout', 'postWorkout']
const GOAL_SLUGS = ['generalHealth', 'weightLoss', 'muscleBuilding', 'enduranceTraining', 'maintenance'] as const
type GoalSlug = typeof GOAL_SLUGS[number]

function dayKey(iso: string): string {
  return new Date(iso).toDateString()
}

export default function NutritionScreen() {
  const { colors } = useTheme()
  const { t, locale } = useTranslation()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [description, setDescription] = useState('')
  const [mealType, setMealType] = useState<MealTypeSlug>('breakfast')
  const [goal, setGoal] = useState<GoalSlug>('generalHealth')
  const [image, setImage] = useState<PickedImage | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState('')
  const [log, setLog] = useState<LogEntry[]>([])
  const [activeLogId, setActiveLogId] = useState<string | null>(null)
  const [target, setTarget] = useState<NutritionTarget | null>(null)

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<{ title: string; mealType: MealTypeSlug; description: string }>({
    title: '', mealType: 'breakfast', description: '',
  })

  useEffect(() => {
    loadNutritionLog().then(setLog)
    loadNutritionTarget().then(setTarget)
  }, [])

  const persistLog = async (entries: LogEntry[]) => {
    setLog(entries)
    await saveNutritionLog(entries)
  }

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    })
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      setImage({ uri: asset.uri, name: asset.fileName || 'meal.jpg', type: asset.mimeType || 'image/jpeg' })
      setAnalysis('')
    }
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
    if (!description.trim() && !image) {
      Alert.alert(t('nutrition.needInput'))
      return
    }

    setIsAnalyzing(true)
    setAnalysis('')

    try {
      const formData = new FormData()
      formData.append('description', description)
      formData.append('mealType', DICTIONARIES.en.nutrition.mealTypes[mealType])
      formData.append('goal', DICTIONARIES.en.nutrition.goals[goal])
      if (image) appendImage(formData, image)
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
      await persistLog([entry, ...log])
      setActiveLogId(entry.id)

      setDescription('')
      setImage(null)
    } catch (err) {
      setAnalysis('Error: ' + mapStreamError(err))
    } finally {
      setIsAnalyzing(false)
    }
  }

  const startEdit = (entry: LogEntry) => {
    setEditingEntryId(entry.id)
    setEditDraft({ title: entry.title, mealType: entry.mealType, description: entry.description })
  }
  const saveEdit = async () => {
    if (!editingEntryId) return
    await persistLog(log.map(e => (e.id === editingEntryId
      ? { ...e, title: editDraft.title.trim() || e.title, mealType: editDraft.mealType, description: editDraft.description }
      : e)))
    setEditingEntryId(null)
  }

  const deleteEntry = (id: string) => {
    Alert.alert(t('nutrition.deleteConfirm'), undefined, [
      { text: t('nutrition.cancel'), style: 'cancel' },
      {
        text: t('nutrition.delete'), style: 'destructive', onPress: async () => {
          await persistLog(log.filter(e => e.id !== id))
          if (activeLogId === id) { setActiveLogId(null); setAnalysis('') }
        },
      },
    ])
  }

  const clearLog = () => {
    Alert.alert(t('nutrition.clearLogConfirm'), undefined, [
      { text: t('nutrition.cancel'), style: 'cancel' },
      { text: t('nutrition.clearLog'), style: 'destructive', onPress: () => persistLog([]) },
    ])
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

  const nutrientRows: { key: keyof NutrientData; label: string }[] = [
    { key: 'calories', label: t('nutrition.calories') },
    { key: 'protein', label: t('nutrition.protein') },
    { key: 'carbs', label: t('nutrition.carbs') },
    { key: 'fat', label: t('nutrition.fat') },
  ]

  const progressColor = (actual: number, goalVal: number) => {
    if (!goalVal) return colors.textFaint
    const ratio = actual / goalVal
    if (ratio > 1.1) return colors.red
    if (ratio >= 0.85) return colors.emerald
    return colors.amber
  }

  const renderEntryRow = (entry: LogEntry) => (
    <View key={entry.id} style={[styles.logEntry, activeLogId === entry.id && styles.logEntryActive]}>
      {editingEntryId === entry.id ? (
        <View style={{ gap: spacing.xs }}>
          <TextInput
            value={editDraft.title}
            onChangeText={v => setEditDraft(d => ({ ...d, title: v }))}
            placeholder={t('nutrition.editTitlePlaceholder')}
            placeholderTextColor={colors.textFaint}
            style={styles.editInput}
          />
          <ChipGroup
            options={MEAL_TYPE_SLUGS.map(s => t(`nutrition.mealTypes.${s}`))}
            value={t(`nutrition.mealTypes.${editDraft.mealType}`)}
            onChange={label => {
              const found = MEAL_TYPE_SLUGS.find(s => t(`nutrition.mealTypes.${s}`) === label)
              if (found) setEditDraft(d => ({ ...d, mealType: found }))
            }}
            accent={colors.orange}
          />
          <TextInput
            value={editDraft.description}
            onChangeText={v => setEditDraft(d => ({ ...d, description: v }))}
            multiline
            style={[styles.editInput, { minHeight: 50 }]}
          />
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <TouchableOpacity style={styles.editSaveBtn} onPress={saveEdit}>
              <Text style={styles.editSaveBtnText}>{t('nutrition.save')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editCancelBtn} onPress={() => setEditingEntryId(null)}>
              <Text style={styles.editCancelBtnText}>{t('nutrition.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity onPress={() => { setAnalysis(entry.analysis); setActiveLogId(entry.id) }}>
          <View style={styles.logEntryHeader}>
            <Text style={styles.logEntryTitle} numberOfLines={1}>{entry.title}</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity onPress={() => startEdit(entry)}>
                <Text style={styles.logEntryIcon}>📝</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteEntry(entry.id)}>
                <Text style={styles.logEntryIcon}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.logEntryMeta}>{entry.timestamp} · {t(`nutrition.mealTypes.${entry.mealType}`)}</Text>
        </TouchableOpacity>
      )}
    </View>
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar icon="🥗" title={t('nutrition.headerTitle')} accent={colors.orange} actions={<HeaderActions />} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.h1}>{t('nutrition.title')}</Text>
          <Text style={styles.sub}>{t('nutrition.subtitle')}</Text>

          {/* Today's nutrition */}
          <View style={styles.section}>
            <View style={styles.estimateRow}>
              <Text style={styles.sectionTitle}>{t('nutrition.todayTitle')}</Text>
              <View style={styles.aiChip}><Text style={styles.aiChipText}>{t('honest.aiEstimate')}</Text></View>
            </View>
            {!target && <Text style={styles.hint}>{t('nutrition.noTargetHint')}</Text>}
            <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
              {nutrientRows.map(({ key, label }) => {
                const actual = Math.round(todayTotals[key] || 0)
                const goalVal = target?.[key]
                const pct = goalVal ? Math.min(100, (actual / goalVal) * 100) : actual > 0 ? 100 : 0
                return (
                  <View key={key}>
                    <View style={styles.barHeaderRow}>
                      <Text style={styles.barLabel}>{label}</Text>
                      <Text style={styles.barValue}>{actual}{goalVal ? ` / ${Math.round(goalVal)}` : ''}</Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: progressColor(actual, goalVal || 0) }]} />
                    </View>
                  </View>
                )
              })}
            </View>
          </View>

          <Text style={styles.fieldLabel}>{t('nutrition.goalLabel')}</Text>
          <ChipGroup
            options={GOAL_SLUGS.map(s => t(`nutrition.goals.${s}`))}
            value={t(`nutrition.goals.${goal}`)}
            onChange={label => {
              const found = GOAL_SLUGS.find(s => t(`nutrition.goals.${s}`) === label)
              if (found) setGoal(found)
            }}
            accent={colors.orange}
          />

          <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]}>{t('nutrition.mealTypeLabel')}</Text>
          <ChipGroup
            options={MEAL_TYPE_SLUGS.map(s => t(`nutrition.mealTypes.${s}`))}
            value={t(`nutrition.mealTypes.${mealType}`)}
            onChange={label => {
              const found = MEAL_TYPE_SLUGS.find(s => t(`nutrition.mealTypes.${s}`) === label)
              if (found) setMealType(found)
            }}
            accent={colors.orange}
          />

          <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]}>{t('nutrition.describeLabel')}</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={t('nutrition.describePlaceholder')}
            placeholderTextColor={colors.textFaint}
            multiline
            numberOfLines={4}
            style={styles.textarea}
          />

          <Text style={styles.fieldLabel}>{t('nutrition.photoLabel')} <Text style={styles.optional}>{t('nutrition.optional')}</Text></Text>
          {image ? (
            <View>
              <Image source={{ uri: image.uri }} style={styles.photo} contentFit="cover" />
              <TouchableOpacity style={styles.removeBadge} onPress={() => setImage(null)}>
                <Text style={styles.removeBadgeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.photoPlaceholder} onPress={pickImage}>
              <Text style={styles.placeholderIcon}>🍽️</Text>
              <Text style={styles.placeholderText}>{t('nutrition.uploadPhotoText')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.analyzeBtn, (isAnalyzing || (!description.trim() && !image)) && styles.btnDisabled]}
            onPress={analyzeNutrition}
            disabled={isAnalyzing || (!description.trim() && !image)}
          >
            <Text style={styles.analyzeBtnText}>{isAnalyzing ? t('nutrition.analyzing') : t('nutrition.analyzeButton')}</Text>
          </TouchableOpacity>

          {/* Results */}
          <View style={styles.resultsCard}>
            {!analysis && !isAnalyzing && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🥗</Text>
                <Text style={styles.emptyText}>{t('nutrition.resultsPlaceholder')}</Text>
              </View>
            )}
            {isAnalyzing && !analysis && (
              <View style={styles.emptyState}>
                <ActivityIndicator color={colors.orange} />
                <Text style={styles.emptyText}>{t('nutrition.analyzingResults')}</Text>
              </View>
            )}
            {analysis && (
              <View style={{ padding: spacing.lg }}>
                <View style={styles.estimateRow}>
                  <Text style={styles.resultsTitle}>{t('nutrition.resultsTitle')}</Text>
                  <View style={styles.aiChip}><Text style={styles.aiChipText}>{t('honest.aiEstimate')}</Text></View>
                </View>
                <MarkdownText text={analysis} accent={colors.orange} />
              </View>
            )}
          </View>

          {/* Meal history */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{t('nutrition.historyTitle')}</Text>
              {log.length > 0 && (
                <TouchableOpacity onPress={clearLog}>
                  <Text style={styles.clearLogText}>{t('nutrition.clearLog')}</Text>
                </TouchableOpacity>
              )}
            </View>
            {groupedByDay.length === 0 ? (
              <Text style={styles.hint}>{t('nutrition.noEntriesYet')}</Text>
            ) : (
              groupedByDay.map(([day, entries]) => {
                const dayTotals = sumNutrients(entries.map(e => e.nutrients || {}))
                const isToday = day === todayKeyValue
                return (
                  <View key={day} style={{ marginTop: spacing.sm }}>
                    <View style={styles.dayHeaderRow}>
                      <Text style={styles.dayHeaderText}>{isToday ? t('nutrition.today') : day}</Text>
                      <Text style={styles.dayHeaderMeta}>
                        {t('nutrition.dayTotal')}: ~{Math.round(dayTotals.calories)} kcal · {t('honest.aiEstimate')}
                      </Text>
                    </View>
                    {entries.map(renderEntryRow)}
                  </View>
                )
              })
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
    h1: { fontSize: 26, fontFamily: fonts.heading, color: colors.textPrimary },
    sub: { color: colors.textSecondary, fontSize: 14, marginBottom: spacing.sm },
    fieldLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 4 },
    optional: { color: colors.textMuted, fontWeight: '400' },
    hint: { color: colors.textFaint, fontSize: 11 },

    section: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.sm },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
    barHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    barLabel: { color: colors.textMuted, fontSize: 12 },
    barValue: { color: colors.textFaint, fontSize: 12 },
    barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.cardAlt, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 3 },

    textarea: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.lg, padding: spacing.md, color: colors.textPrimary, fontSize: 14, minHeight: 90, textAlignVertical: 'top' },

    photo: { width: '100%', height: 160, borderRadius: radius.lg },
    removeBadge: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' },
    removeBadgeText: { color: '#fff' },
    photoPlaceholder: { height: 96, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 4 },
    placeholderIcon: { fontSize: 22 },
    placeholderText: { color: colors.textMuted, fontSize: 12 },

    analyzeBtn: { backgroundColor: colors.orange, paddingVertical: 15, borderRadius: radius.lg, alignItems: 'center', marginTop: spacing.sm },
    btnDisabled: { opacity: 0.4 },
    analyzeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    resultsCard: { minHeight: 200, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
    emptyState: { minHeight: 200, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: spacing.xl },
    emptyIcon: { fontSize: 38 },
    emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
    resultsTitle: { color: colors.textPrimary, fontFamily: fonts.heading, fontSize: 18, marginBottom: spacing.md },
    estimateRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
    aiChip: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: radius.full, backgroundColor: colors.sageSoft },
    aiChipText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.olive },

    dayHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    dayHeaderText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
    dayHeaderMeta: { color: colors.textFaint, fontSize: 11 },

    logEntry: { backgroundColor: colors.cardAlt, borderRadius: radius.sm, padding: spacing.sm, marginBottom: 6 },
    logEntryActive: { backgroundColor: colors.orangeSoft, borderWidth: 1, borderColor: colors.orangeBorder },
    logEntryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    logEntryTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '600', flex: 1, marginRight: spacing.sm },
    logEntryIcon: { fontSize: 13 },
    logEntryMeta: { color: colors.textFaint, fontSize: 11, marginTop: 2 },
    clearLogText: { color: colors.textFaint, fontSize: 12 },

    editInput: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.sm, padding: 8, color: colors.textPrimary, fontSize: 13 },
    editSaveBtn: { flex: 1, backgroundColor: colors.orange, paddingVertical: 8, borderRadius: radius.sm, alignItems: 'center' },
    editSaveBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    editCancelBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    editCancelBtnText: { color: colors.textSecondary, fontSize: 12 },
  })
}
