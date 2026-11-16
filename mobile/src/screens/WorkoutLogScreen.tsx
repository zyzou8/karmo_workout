import React, { useEffect, useMemo, useState } from 'react'
import { useRoute, RouteProp } from '@react-navigation/native'
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fonts, radius, spacing } from '../theme'
import { useTheme } from '../lib/theme/ThemeContext'
import { useTranslation } from '../lib/i18n/LanguageContext'
import { RootStackParamList } from '../navigation'
import { bestWeightKg, loadWorkoutLog, saveWorkoutLog, summarizeSets, WorkoutEntry } from '../lib/workoutLog'
import { displayToKg, kgToDisplay, useUnits, WeightUnit } from '../lib/units'
import TopBar from '../components/TopBar'

const BODY_PARTS = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'fullBody'] as const

interface SetRow { reps: string; weight: string }

/**
 * Setline-style log: fast sets / reps / weight between sets, big glove-friendly rows,
 * kg/lb toggle (NA default lbs), history on the exercise. PR is a feel — never a count.
 */
export default function WorkoutLogScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'WorkoutLog'>>()
  const { colors } = useTheme()
  const { t, locale } = useTranslation()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [units] = useUnits()

  const [log, setLog] = useState<WorkoutEntry[]>([])
  const [bodyPart, setBodyPart] = useState<string>('chest')
  const [exercise, setExercise] = useState(route.params?.exercise ?? '')
  const [unit, setUnit] = useState<WeightUnit>(units.weight)
  const [sets, setSets] = useState<SetRow[]>([{ reps: '', weight: '' }])
  const [remarks, setRemarks] = useState('')

  useEffect(() => { loadWorkoutLog().then(setLog) }, [])
  useEffect(() => { setUnit(units.weight) }, [units.weight])

  const recentExercises = useMemo(() => {
    const seen = new Set<string>()
    const names: string[] = []
    for (const e of log) {
      if (e.source !== 'manual') continue
      const key = e.exercise.trim().toLowerCase()
      if (!seen.has(key)) { seen.add(key); names.push(e.exercise) }
      if (names.length >= 6) break
    }
    return names
  }, [log])

  const history = useMemo(() => {
    const name = exercise.trim().toLowerCase()
    if (!name) return []
    return log.filter(e => e.exercise.trim().toLowerCase() === name).slice(0, 10)
  }, [log, exercise])

  const priorBest = useMemo(() => bestWeightKg(log, exercise), [log, exercise])

  const switchUnit = (next: WeightUnit) => {
    if (next === unit) return
    // Convert what's already typed so the numbers stay true.
    setSets(rows => rows.map(r => {
      const n = parseFloat(r.weight)
      return Number.isFinite(n) ? { ...r, weight: String(kgToDisplay(displayToKg(n, unit), next)) } : r
    }))
    setUnit(next)
  }

  const updateSet = (i: number, patch: Partial<SetRow>) => setSets(rows => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const addSet = () => setSets(rows => [...rows, { ...(rows[rows.length - 1] ?? { reps: '', weight: '' }) }])
  const removeSet = (i: number) => setSets(rows => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows))

  const save = async () => {
    const name = exercise.trim()
    if (!name) return Alert.alert(t('workoutLog.needExercise'))
    const details = sets
      .map(r => ({ reps: parseInt(r.reps, 10), weightKg: displayToKg(parseFloat(r.weight) || 0, unit) }))
      .filter(s => Number.isFinite(s.reps) && s.reps > 0)
      .map(s => ({ reps: s.reps, weightKg: Math.round(s.weightKg * 100) / 100 }))
    if (details.length === 0) return Alert.alert(t('workoutLog.needSet'))

    const entry: WorkoutEntry = {
      id: Date.now().toString(),
      dateISO: new Date().toISOString(),
      exercise: name,
      source: 'manual',
      bodyPart,
      setDetails: details,
      remarks: remarks.trim() || undefined,
      ...summarizeSets(details),
    }
    const next = [entry, ...log]
    setLog(next)
    await saveWorkoutLog(next)
    setSets([{ reps: '', weight: '' }])
    setRemarks('')
    Alert.alert(t('workoutLog.saved'))
  }

  const dateFmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar title={t('workoutLog.title')} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Body part */}
          <Text style={styles.label}>{t('workoutLog.bodyPart')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {BODY_PARTS.map(p => {
              const active = p === bodyPart
              return (
                <TouchableOpacity key={p} onPress={() => setBodyPart(p)} style={[styles.chip, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                  <Text style={[styles.chipText, active && { color: colors.onPrimary }]}>{t(`workoutLog.bodyParts.${p}`)}</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          {/* Exercise */}
          <Text style={styles.label}>{t('workoutLog.exercise')}</Text>
          <TextInput
            value={exercise}
            onChangeText={setExercise}
            placeholder={t('workoutLog.exercisePlaceholder')}
            placeholderTextColor={colors.textFaint}
            style={styles.exerciseInput}
          />
          {recentExercises.length > 0 && (
            <View style={styles.recentRow}>
              <Text style={styles.recentLabel}>{t('workoutLog.recentExercises')}:</Text>
              {recentExercises.map(n => (
                <TouchableOpacity key={n} onPress={() => setExercise(n)} style={styles.recentChip}>
                  <Text style={styles.recentChipText}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Sets */}
          <View style={styles.setsCard}>
            <View style={styles.setsHeader}>
              <Text style={styles.setsTitle}>{exercise.trim() || t('workoutLog.exercisePlaceholder')}</Text>
              <View style={styles.toggle} accessibilityRole="radiogroup" accessibilityLabel={t('workoutLog.unitsHint')}>
                {(['kg', 'lb'] as WeightUnit[]).map(u => (
                  <TouchableOpacity key={u} onPress={() => switchUnit(u)} style={[styles.toggleBtn, unit === u && { backgroundColor: colors.primary }]}>
                    <Text style={[styles.toggleText, unit === u && { color: colors.onPrimary }]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.colHeader}>
              <Text style={[styles.colText, { width: 44 }]}>{t('workoutLog.set')}</Text>
              <Text style={[styles.colText, { flex: 1 }]}>{t('workoutLog.reps')}</Text>
              <Text style={[styles.colText, { flex: 1 }]}>{t('workoutLog.weight')} ({unit})</Text>
              <View style={{ width: 32 }} />
            </View>

            {sets.map((row, i) => {
              const kg = displayToKg(parseFloat(row.weight) || 0, unit)
              const isBest = priorBest > 0 && kg > priorBest
              return (
                <View key={i}>
                  <View style={styles.setRow}>
                    <View style={styles.setNum}><Text style={styles.setNumText}>{i + 1}</Text></View>
                    <TextInput
                      value={row.reps}
                      onChangeText={v => updateSet(i, { reps: v.replace(/[^0-9]/g, '') })}
                      keyboardType="number-pad"
                      placeholder="–"
                      placeholderTextColor={colors.textFaint}
                      style={styles.setInput}
                      accessibilityLabel={`${t('workoutLog.set')} ${i + 1} ${t('workoutLog.reps')}`}
                    />
                    <TextInput
                      value={row.weight}
                      onChangeText={v => updateSet(i, { weight: v.replace(/[^0-9.]/g, '') })}
                      keyboardType="decimal-pad"
                      placeholder="–"
                      placeholderTextColor={colors.textFaint}
                      style={styles.setInput}
                      accessibilityLabel={`${t('workoutLog.set')} ${i + 1} ${t('workoutLog.weight')}`}
                    />
                    <TouchableOpacity onPress={() => removeSet(i)} style={styles.removeBtn} accessibilityLabel={t('workoutLog.removeSet')}>
                      <Text style={styles.removeText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  {isBest && (
                    <View style={styles.bestChip}><Text style={styles.bestText}>🌿 {t('workoutLog.personalBest')}</Text></View>
                  )}
                </View>
              )
            })}

            <TouchableOpacity onPress={addSet} style={styles.addSet}>
              <Text style={styles.addSetText}>{t('workoutLog.addSet')}</Text>
            </TouchableOpacity>
          </View>

          {/* Remarks */}
          <Text style={styles.label}>{t('workoutLog.remarks')}</Text>
          <TextInput
            value={remarks}
            onChangeText={setRemarks}
            placeholder={t('workoutLog.remarksPlaceholder')}
            placeholderTextColor={colors.textFaint}
            style={[styles.exerciseInput, { minHeight: 64, textAlignVertical: 'top' }]}
            multiline
          />

          <TouchableOpacity onPress={save} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.saveText, { color: colors.onPrimary }]}>{t('workoutLog.save')}</Text>
          </TouchableOpacity>

          {/* History */}
          <Text style={styles.historyTitle}>{t('workoutLog.historyTitle')}</Text>
          {history.length === 0 ? (
            <Text style={styles.empty}>{t('workoutLog.historyEmpty')}</Text>
          ) : (
            history.map(e => (
              <View key={e.id} style={styles.historyRow}>
                <Text style={styles.historyDate}>{dateFmt.format(new Date(e.dateISO))}</Text>
                <Text style={styles.historySets}>
                  {e.setDetails?.length
                    ? e.setDetails.map(s => `${s.reps}×${kgToDisplay(s.weightKg, unit)}`).join('  ·  ')
                    : e.sets ? `${e.sets}×${e.reps ?? '–'}${e.weightKg ? ` @ ${kgToDisplay(e.weightKg, unit)}` : ''}` : '—'}
                  {' '}{unit}
                </Text>
                {e.remarks ? <Text style={styles.historyRemarks}>{e.remarks}</Text> : null}
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
    label: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm, marginTop: spacing.md },
    chips: { gap: spacing.sm, paddingBottom: spacing.xs },
    chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
    chipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textSecondary },
    exerciseInput: {
      fontFamily: fonts.body, fontSize: 17, color: colors.textPrimary, backgroundColor: colors.card,
      borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 14,
    },
    recentRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: spacing.sm },
    recentLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
    recentChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.full, backgroundColor: colors.sageSoft },
    recentChipText: { fontFamily: fonts.body, fontSize: 13, color: colors.textPrimary },

    setsCard: { marginTop: spacing.xl, backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
    setsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md, gap: spacing.md },
    setsTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary, flex: 1 },
    toggle: { flexDirection: 'row', backgroundColor: colors.cardAlt, borderRadius: radius.full, padding: 3 },
    toggleBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.full },
    toggleText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },
    colHeader: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs, paddingHorizontal: 2 },
    colText: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
    setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    setNum: { width: 44, height: 52, borderRadius: radius.md, backgroundColor: colors.sageSoft, alignItems: 'center', justifyContent: 'center' },
    setNumText: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.textPrimary },
    setInput: {
      flex: 1, height: 52, borderRadius: radius.md, backgroundColor: colors.cardAlt, textAlign: 'center',
      fontFamily: fonts.bodyBold, fontSize: 20, color: colors.textPrimary,
    },
    removeBtn: { width: 32, height: 52, alignItems: 'center', justifyContent: 'center' },
    removeText: { color: colors.textFaint, fontSize: 14 },
    bestChip: { alignSelf: 'flex-start', marginLeft: 52, marginTop: -4, marginBottom: spacing.sm, paddingVertical: 3, paddingHorizontal: 10, borderRadius: radius.full, backgroundColor: colors.sageSoft },
    bestText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.olive },
    addSet: { marginTop: spacing.xs, height: 48, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' },
    addSetText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.olive },

    saveBtn: { marginTop: spacing.xl, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
    saveText: { fontFamily: fonts.bodyBold, fontSize: 16 },

    historyTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary, marginTop: spacing.xxl, marginBottom: spacing.md },
    empty: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
    historyRow: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    historyDate: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textMuted },
    historySets: { fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary, marginTop: 2 },
    historyRemarks: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 2, fontStyle: 'italic' },
  })
}
