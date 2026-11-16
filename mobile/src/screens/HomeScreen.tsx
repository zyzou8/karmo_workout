import React, { useCallback, useMemo, useState } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fonts, radius, spacing } from '../theme'
import { useTheme } from '../lib/theme/ThemeContext'
import { useTranslation } from '../lib/i18n/LanguageContext'
import { RootStackParamList } from '../navigation'
import { getActivityByDate, DayActivity } from '../lib/activity'
import TabBar from '../components/TabBar'
import RestTimerModal from '../components/RestTimerModal'

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Sunday-first week containing today, matching the deck's S M T W T F S strip. */
function currentWeek(): Date[] {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay())
  return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
}

/** Home: the daily hub. Week strip, quick tools, feature cards; one profile feeds every module. */
export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { colors, theme } = useTheme()
  const { t, locale } = useTranslation()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [activityByDate, setActivityByDate] = useState<Map<string, DayActivity>>(new Map())
  const [timerOpen, setTimerOpen] = useState(false)

  useFocusEffect(useCallback(() => {
    getActivityByDate().then(setActivityByDate)
  }, []))

  const week = useMemo(currentWeek, [])
  const weekdayFmt = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'narrow' }), [locale])
  const dateFmt = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }), [locale])
  const weekActivity = week.map(d => activityByDate.get(d.toDateString()))
  const weekWorkouts = weekActivity.reduce((sum, a) => sum + (a?.workouts.length || 0), 0)
  const weekMeals = weekActivity.reduce((sum, a) => sum + (a?.meals.length || 0), 0)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('hub.greetingMorning') : hour < 18 ? t('hub.greetingAfternoon') : t('hub.greetingEvening')

  const tools = [
    { key: 'rest', icon: '⏱', label: t('hub.toolRest'), onPress: () => setTimerOpen(true) },
    { key: 'log', icon: '＋', label: t('hub.toolLog'), onPress: () => navigation.navigate('WorkoutLog') },
    { key: 'coach', icon: '❝', label: t('hub.toolCoach'), onPress: () => navigation.navigate('Coach') },
    { key: 'meal', icon: '🥗', label: t('hub.toolMeal'), onPress: () => navigation.navigate('Nutrition') },
  ]

  const features = [
    { key: 'motion', icon: '◎', title: t('hub.motionTitle'), description: t('hub.motionDescription'), onPress: () => navigation.navigate('Motion'), tone: colors.primary, onTone: colors.onPrimary },
    { key: 'body', icon: '◍', title: t('hub.bodyTitle'), description: t('hub.bodyDescription'), onPress: () => navigation.navigate('Body'), tone: colors.sage, onTone: '#1E2318' },
    { key: 'nutrition', icon: '🥗', title: t('hub.nutritionTitle'), description: t('hub.nutritionDescription'), onPress: () => navigation.navigate('Nutrition'), tone: colors.sage, onTone: '#1E2318' },
    { key: 'progress', icon: '◔', title: t('hub.progressTitle'), description: t('hub.progressDescription'), onPress: () => navigation.navigate('Insight'), tone: colors.sage, onTone: '#1E2318' },
  ]

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.date}>{dateFmt.format(new Date())}</Text>
            <Text style={styles.greeting}>{greeting}</Text>
          </View>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')} accessibilityLabel={t('settingsScreen.title')}>
            <Text style={styles.settingsIcon}>⚙︎</Text>
          </TouchableOpacity>
        </View>

        {/* Week strip */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t('hub.weekTitle')}</Text>
            <Text style={styles.cardMeta}>
              {weekWorkouts || weekMeals
                ? `${weekWorkouts} ${t('home.activityWorkouts')} · ${weekMeals} ${t('home.activityMeals')}`
                : t('home.activityEmpty')}
            </Text>
          </View>
          <View style={styles.weekRow}>
            {week.map((d, i) => {
              const activity = weekActivity[i]
              const dots: string[] = []
              if (activity?.workouts.length) dots.push(colors.olive)
              if (activity?.meals.length) dots.push(colors.orange)
              if (activity?.measurement) dots.push(colors.leaf)
              const isToday = d.toDateString() === new Date().toDateString()
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.dayCell, isToday && { backgroundColor: colors.primary }]}
                  onPress={() => navigation.navigate('Profile', { date: isoDate(d) })}
                >
                  <Text style={[styles.dayLabel, isToday && { color: colors.onPrimary }]}>{weekdayFmt.format(d)}</Text>
                  <Text style={[styles.dayNumber, isToday && { color: colors.onPrimary }]}>{d.getDate()}</Text>
                  <View style={styles.dotsRow}>
                    {dots.map((c, di) => <View key={di} style={[styles.dot, { backgroundColor: isToday ? colors.onPrimary : c }]} />)}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Quick tools */}
        <Text style={styles.sectionTitle}>{t('hub.quickTools')}</Text>
        <View style={styles.toolsRow}>
          {tools.map(tool => (
            <TouchableOpacity key={tool.key} style={styles.tool} onPress={tool.onPress} accessibilityLabel={tool.label}>
              <View style={styles.toolIcon}><Text style={styles.toolIconText}>{tool.icon}</Text></View>
              <Text style={styles.toolLabel}>{tool.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Feature cards */}
        <Text style={styles.sectionTitle}>{t('hub.featuresTitle')}</Text>
        <View style={styles.grid}>
          {features.map((f, i) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.feature, i === 0 && styles.featureWide, i === 0 && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              activeOpacity={0.85}
              onPress={f.onPress}
            >
              <View style={[styles.featureIcon, { backgroundColor: i === 0 ? colors.sage : colors.sageSoft }]}>
                <Text style={[styles.featureIconText, { color: i === 0 ? '#1E2318' : colors.textPrimary }]}>{f.icon}</Text>
              </View>
              <Text style={[styles.featureTitle, i === 0 && { color: colors.onPrimary }]}>{f.title}</Text>
              <Text style={[styles.featureDesc, i === 0 && { color: colors.onPrimary, opacity: 0.85 }]}>{f.description}</Text>
              <Text style={[styles.featureCta, i === 0 && { color: colors.onPrimary }]}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.coachCard} onPress={() => navigation.navigate('Coach')}>
          <Text style={styles.coachTitle}>{t('hub.coachTitle')}</Text>
          <Text style={styles.coachDesc}>{t('hub.coachDescription')}</Text>
        </TouchableOpacity>

        <Text style={styles.footnote}>{t('hub.oneProfile')}</Text>
      </ScrollView>
      <TabBar active="Home" />
      <RestTimerModal visible={timerOpen} onClose={() => setTimerOpen(false)} />
    </SafeAreaView>
  )
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
    date: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 13 },
    greeting: { fontFamily: fonts.heading, color: colors.textPrimary, fontSize: 30, marginTop: 2 },
    settingsBtn: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card,
      borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    },
    settingsIcon: { fontSize: 18, color: colors.textPrimary },

    card: {
      backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border,
      padding: spacing.lg, marginBottom: spacing.xl,
    },
    cardHeader: { marginBottom: spacing.md },
    cardTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary },
    cardMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
    weekRow: { flexDirection: 'row', gap: 4 },
    dayCell: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: radius.md },
    dayLabel: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 11 },
    dayNumber: { fontFamily: fonts.bodyBold, color: colors.textPrimary, fontSize: 15 },
    dotsRow: { flexDirection: 'row', gap: 2, height: 5 },
    dot: { width: 5, height: 5, borderRadius: 2.5 },

    sectionTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary, marginBottom: spacing.md },
    toolsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
    tool: {
      flex: 1, alignItems: 'center', gap: 6, paddingVertical: spacing.md,
      backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    },
    toolIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.sageSoft, alignItems: 'center', justifyContent: 'center' },
    toolIconText: { fontSize: 18, color: colors.textPrimary },
    toolLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textPrimary },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md },
    feature: {
      width: '47.8%', backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border,
      padding: spacing.lg, gap: 6,
    },
    featureWide: { width: '100%' },
    featureIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    featureIconText: { fontSize: 18 },
    featureTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary },
    featureDesc: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
    featureCta: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.olive, marginTop: 4 },

    coachCard: {
      backgroundColor: colors.sageSoft, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg,
      borderWidth: 1, borderColor: colors.border,
    },
    coachTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary },
    coachDesc: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 4 },
    footnote: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  })
}
