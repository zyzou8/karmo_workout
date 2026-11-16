import React, { useCallback, useMemo, useState } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fonts, radius, spacing } from '../theme'
import { useTheme } from '../lib/theme/ThemeContext'
import { useTranslation } from '../lib/i18n/LanguageContext'
import { RootStackParamList } from '../navigation'
import { loadWorkoutLog, WorkoutEntry } from '../lib/workoutLog'
import { formatWeight, useUnits } from '../lib/units'
import TabBar from '../components/TabBar'

/** Train: form camera (the differentiator) and the workout log. */
export default function TrainScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { colors } = useTheme()
  const { t, locale } = useTranslation()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [units] = useUnits()
  const [log, setLog] = useState<WorkoutEntry[]>([])

  useFocusEffect(useCallback(() => {
    loadWorkoutLog().then(setLog)
  }, []))

  const dateFmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })
  const recent = log.slice(0, 8)

  const describe = (e: WorkoutEntry): string => {
    if (e.source === 'motion') return t('honest.aiCue')
    const parts: string[] = []
    if (e.sets) parts.push(`${e.sets} × ${e.reps ?? '–'}`)
    if (e.weightKg) parts.push(formatWeight(e.weightKg, units.weight))
    return parts.join(' · ')
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>{t('train.title')}</Text>
        <Text style={styles.subtitle}>{t('train.subtitle')}</Text>

        <TouchableOpacity style={[styles.hero, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('Motion')} activeOpacity={0.85}>
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
            <Text style={styles.viewfinderIcon}>◎</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { color: colors.onPrimary }]}>{t('train.formCameraTitle')}</Text>
            <Text style={[styles.heroDesc, { color: colors.onPrimary }]}>{t('train.formCameraDescription')}</Text>
            <Text style={[styles.heroCta, { color: colors.onPrimary }]}>{t('train.open')} →</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('WorkoutLog')} activeOpacity={0.85}>
          <View style={styles.cardIcon}><Text style={styles.cardIconText}>＋</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{t('train.logTitle')}</Text>
            <Text style={styles.cardDesc}>{t('train.logDescription')}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>{t('train.recentTitle')}</Text>
        {recent.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyText}>{t('train.recentEmpty')}</Text></View>
        ) : (
          <View style={styles.list}>
            {recent.map(e => (
              <TouchableOpacity
                key={e.id}
                style={styles.row}
                onPress={() => (e.source === 'manual' ? navigation.navigate('WorkoutLog', { exercise: e.exercise }) : navigation.navigate('Motion'))}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{e.exercise}</Text>
                  <Text style={styles.rowMeta}>{describe(e)}</Text>
                </View>
                <Text style={styles.rowDate}>{dateFmt.format(new Date(e.dateISO))}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
      <TabBar active="Train" />
    </SafeAreaView>
  )
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  const cornerBase = { position: 'absolute' as const, width: 14, height: 14, borderColor: colors.sage }
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
    h1: { fontFamily: fonts.heading, fontSize: 30, color: colors.textPrimary },
    subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, marginTop: 2, marginBottom: spacing.xl },
    hero: { borderRadius: radius.xl, padding: spacing.lg, flexDirection: 'row', gap: spacing.lg, alignItems: 'center', marginBottom: spacing.md },
    viewfinder: { width: 84, height: 108, borderRadius: radius.md, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
    corner: cornerBase,
    tl: { top: 8, left: 8, borderTopWidth: 2, borderLeftWidth: 2 },
    tr: { top: 8, right: 8, borderTopWidth: 2, borderRightWidth: 2 },
    bl: { bottom: 8, left: 8, borderBottomWidth: 2, borderLeftWidth: 2 },
    br: { bottom: 8, right: 8, borderBottomWidth: 2, borderRightWidth: 2 },
    viewfinderIcon: { fontSize: 28, color: colors.sage },
    heroTitle: { fontFamily: fonts.heading, fontSize: 22 },
    heroDesc: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, marginTop: 4, opacity: 0.85 },
    heroCta: { fontFamily: fonts.bodyBold, fontSize: 14, marginTop: spacing.md },
    card: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card,
      borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.xl,
    },
    cardIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.sageSoft, alignItems: 'center', justifyContent: 'center' },
    cardIconText: { fontSize: 20, color: colors.textPrimary },
    cardTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary },
    cardDesc: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    chevron: { fontSize: 26, color: colors.textMuted },
    sectionTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary, marginBottom: spacing.md },
    empty: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.cardAlt },
    emptyText: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 14 },
    list: { backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
    rowTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
    rowMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 2 },
    rowDate: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  })
}
