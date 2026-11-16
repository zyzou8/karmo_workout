import React, { useCallback, useMemo, useState } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fonts, radius, spacing } from '../theme'
import { useTheme } from '../lib/theme/ThemeContext'
import { useTranslation } from '../lib/i18n/LanguageContext'
import { RootStackParamList } from '../navigation'
import { loadWorkoutLog, entryVolumeKg, WorkoutEntry } from '../lib/workoutLog'
import { loadMeasurements, MeasurementEntry } from '../lib/profile'
import { loadNutritionLog, LogEntry } from '../lib/nutrition'
import { kgToDisplay, useUnits } from '../lib/units'
import { TrendChart } from '../components/TrendChart'
import TabBar from '../components/TabBar'

type Window = 4 | 12

const DAY_MS = 24 * 60 * 60 * 1000

/** Body & Progress over 4 or 12 weeks, fed by weigh-ins, workout sets and meals. Empty states name the next log. */
export default function InsightScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { colors } = useTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [units] = useUnits()
  const [weeks, setWeeks] = useState<Window>(4)
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([])
  const [measurements, setMeasurements] = useState<MeasurementEntry[]>([])
  const [meals, setMeals] = useState<LogEntry[]>([])

  useFocusEffect(useCallback(() => {
    Promise.all([loadWorkoutLog(), loadMeasurements(), loadNutritionLog()]).then(([w, m, n]) => {
      setWorkouts(w)
      setMeasurements(m)
      setMeals(n)
    })
  }, []))

  const since = Date.now() - weeks * 7 * DAY_MS
  const inWindow = (iso: string) => new Date(iso).getTime() >= since

  const weightSeries = useMemo(
    () => measurements
      .filter(m => m.weightKg != null && inWindow(m.dateISO))
      .sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime())
      .map(m => kgToDisplay(m.weightKg as number, units.weight)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [measurements, weeks, units.weight],
  )

  const volumeSeries = useMemo(() => {
    const buckets = new Array(weeks).fill(0) as number[]
    let any = false
    for (const w of workouts) {
      const age = Date.now() - new Date(w.dateISO).getTime()
      const idx = weeks - 1 - Math.floor(age / (7 * DAY_MS))
      if (idx < 0 || idx >= weeks) continue
      const v = entryVolumeKg(w)
      if (v > 0) { buckets[idx] += v; any = true }
    }
    return any ? buckets.map(kg => Math.round(kgToDisplay(kg, units.weight))) : []
  }, [workouts, weeks, units.weight])

  const kcalSeries = useMemo(() => {
    const byDay = new Map<string, number>()
    for (const m of meals) {
      if (!inWindow(m.dateISO) || !m.nutrients?.calories) continue
      const key = new Date(m.dateISO).toDateString()
      byDay.set(key, (byDay.get(key) || 0) + m.nutrients.calories)
    }
    return Array.from(byDay.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([, v]) => Math.round(v))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meals, weeks])

  const cards = [
    {
      key: 'weight', title: t('insight.weightTitle'), unit: units.weight, series: weightSeries,
      empty: t('insight.weightEmpty'), note: null as string | null,
      action: { label: t('insight.logWeighIn'), onPress: () => navigation.navigate('Profile', undefined) },
    },
    {
      key: 'volume', title: t('insight.volumeTitle'), unit: `${units.weight} ${t('insight.perWeek')}`, series: volumeSeries,
      empty: t('insight.volumeEmpty'), note: null,
      action: { label: t('train.logTitle'), onPress: () => navigation.navigate('WorkoutLog') },
    },
    {
      key: 'kcal', title: t('insight.kcalTitle'), unit: `${units.energy} ${t('insight.perDay')}`, series: kcalSeries,
      empty: t('insight.kcalEmpty'), note: t('insight.kcalNote'),
      action: { label: t('hub.toolMeal'), onPress: () => navigation.navigate('Nutrition') },
    },
  ]

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>{t('insight.title')}</Text>
        <Text style={styles.subtitle}>{t('insight.subtitle')}</Text>

        <View style={styles.toggle} accessibilityRole="radiogroup">
          {([4, 12] as Window[]).map(w => (
            <TouchableOpacity key={w} onPress={() => setWeeks(w)} style={[styles.toggleBtn, weeks === w && { backgroundColor: colors.primary }]}>
              <Text style={[styles.toggleText, weeks === w && { color: colors.onPrimary }]}>{w === 4 ? t('insight.weeks4') : t('insight.weeks12')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {cards.map(c => {
          const latest = c.series[c.series.length - 1]
          return (
            <View key={c.key} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{c.title}</Text>
                {c.note && <View style={styles.noteChip}><Text style={styles.noteText}>{c.note}</Text></View>}
              </View>
              {c.series.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>{c.empty}</Text>
                  <TouchableOpacity onPress={c.action.onPress}>
                    <Text style={styles.emptyAction}>{c.action.label} →</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.value}>
                    {latest.toLocaleString()} <Text style={styles.valueUnit}>{c.unit}</Text>
                  </Text>
                  <Text style={styles.latestLabel}>{t('insight.latest')}</Text>
                  <TrendChart values={c.series} colorFrom={colors.leaf} colorTo={colors.olive} gradientId={`insight-${c.key}`} />
                </>
              )}
            </View>
          )
        })}

        <View style={styles.links}>
          {[
            { label: t('insight.openBody'), onPress: () => navigation.navigate('Body') },
            { label: t('insight.openNutrition'), onPress: () => navigation.navigate('Nutrition') },
            { label: t('insight.openOverview'), onPress: () => navigation.navigate('Overview') },
          ].map(l => (
            <TouchableOpacity key={l.label} style={styles.linkRow} onPress={l.onPress}>
              <Text style={styles.linkText}>{l.label}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.footnote}>{t('hub.oneProfile')}</Text>
      </ScrollView>
      <TabBar active="Insight" />
    </SafeAreaView>
  )
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
    h1: { fontFamily: fonts.heading, fontSize: 30, color: colors.textPrimary },
    subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, marginTop: 2, marginBottom: spacing.lg },
    toggle: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: colors.cardAlt, borderRadius: radius.full, padding: 3, marginBottom: spacing.lg },
    toggleBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: radius.full },
    toggleText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textSecondary },
    card: { backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
    cardTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary },
    noteChip: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: radius.full, backgroundColor: colors.sageSoft },
    noteText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.olive },
    value: { fontFamily: fonts.heading, fontSize: 30, color: colors.textPrimary },
    valueUnit: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
    latestLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginBottom: spacing.sm },
    empty: { paddingVertical: spacing.md, gap: spacing.sm },
    emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
    emptyAction: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.olive },
    links: { backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, marginTop: spacing.md, overflow: 'hidden' },
    linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
    linkText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
    chevron: { fontSize: 22, color: colors.textMuted },
    footnote: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  })
}
