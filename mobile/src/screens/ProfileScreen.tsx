import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import TabBar from '../components/TabBar'
import { cmToDisplay, displayToCm, displayToKg, kgToDisplay, loadUnits, DEFAULT_UNITS, UnitPrefs } from '../lib/units'
import ChipGroup from '../components/ChipGroup'
import { CalendarPicker } from '../components/CalendarPicker'
import { TrendChart } from '../components/TrendChart'
import { useTheme } from '../lib/theme/ThemeContext'
import { useTranslation } from '../lib/i18n/LanguageContext'
import { RootStackParamList } from '../navigation'
import { spacing, radius, fonts } from '../theme'
import {
  FITNESS_LEVEL_SLUGS, GOAL_SLUGS, EQUIPMENT_SLUGS,
  FitnessLevelSlug, GoalSlug, EquipmentSlug, GenderSlug,
  DEFAULT_PROFILE, loadProfile, saveProfile,
  MeasurementEntry, loadMeasurements, saveMeasurements,
} from '../lib/profile'
import { getActivityByDate, DayActivity } from '../lib/activity'

const DAYS = ['2', '3', '4', '5', '6']
const GENDER_OPTIONS: { slug: GenderSlug; key: string }[] = [
  { slug: 'notSpecified', key: 'body.genderNotSpecified' },
  { slug: 'male', key: 'body.genderMale' },
  { slug: 'female', key: 'body.genderFemale' },
  { slug: 'nonBinary', key: 'body.genderNonBinary' },
]

function todayInputDate(): Date {
  return new Date()
}

export default function ProfileScreen() {
  const { colors } = useTheme()
  const { t, locale } = useTranslation()
  const styles = useMemo(() => createStyles(colors), [colors])
  const route = useRoute<RouteProp<RootStackParamList, 'Profile'>>()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [units, setUnits] = useState<UnitPrefs>(DEFAULT_UNITS)
  /** Profile stores kg/cm as strings; the form shows the user's units. */
  const toDisplayStr = (stored: string, conv: (n: number) => number) => {
    const n = parseFloat(stored)
    return Number.isFinite(n) ? String(conv(n)) : ''
  }
  const toStoredStr = (shown: string, conv: (n: number) => number) => {
    const n = parseFloat(shown)
    return Number.isFinite(n) ? String(Math.round(conv(n) * 10) / 10) : ''
  }

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
  const [entryWeight, setEntryWeight] = useState('')
  const [entryBodyFat, setEntryBodyFat] = useState('')
  const [entryNote, setEntryNote] = useState('')

  const [selectedDate, setSelectedDate] = useState(() => {
    if (route.params?.date) {
      const m = route.params.date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    }
    return todayInputDate()
  })
  const [activityByDate, setActivityByDate] = useState<Map<string, DayActivity>>(new Map())

  const refreshActivity = () => getActivityByDate().then(setActivityByDate)

  useEffect(() => {
    Promise.all([loadProfile(), loadUnits()]).then(([p, u]) => {
      setUnits(u)
      setAge(p.age)
      setHeightCm(toDisplayStr(p.heightCm, n => cmToDisplay(n, u.length)))
      setWeightKg(toDisplayStr(p.weightKg, n => kgToDisplay(n, u.weight)))
      setGender(p.gender); setFitnessLevel(p.fitnessLevel); setGoal(p.goal)
      setDaysPerWeek(p.daysPerWeek); setEquipment(p.equipment)
    })
    loadMeasurements().then(setMeasurements)
    refreshActivity()
  }, [])

  const handleSaveProfile = async () => {
    await saveProfile({
      age,
      heightCm: toStoredStr(heightCm, n => displayToCm(n, units.length)),
      weightKg: toStoredStr(weightKg, n => displayToKg(n, units.weight)),
      gender, fitnessLevel, goal, daysPerWeek, equipment,
    })
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2500)
  }

  const handleAddMeasurement = async () => {
    const weight = parseFloat(entryWeight)
    if (!entryWeight || Number.isNaN(weight)) return
    const bodyFat = entryBodyFat ? parseFloat(entryBodyFat) : undefined
    const entry: MeasurementEntry = {
      id: Date.now().toString(),
      dateISO: new Date().toISOString(),
      weightKg: Math.round(displayToKg(weight, units.weight) * 100) / 100,
      bodyFatPct: bodyFat !== undefined && !Number.isNaN(bodyFat) ? bodyFat : undefined,
      note: entryNote.trim() || undefined,
    }
    const next = [entry, ...measurements]
    setMeasurements(next)
    await saveMeasurements(next)
    refreshActivity()
    setEntryWeight(''); setEntryBodyFat(''); setEntryNote('')
  }

  const deleteMeasurement = (id: string) => {
    Alert.alert(t('profile.deleteEntryConfirm'), undefined, [
      { text: t('nutrition.cancel'), style: 'cancel' },
      {
        text: t('nutrition.delete'), style: 'destructive', onPress: async () => {
          const next = measurements.filter(m => m.id !== id)
          setMeasurements(next)
          await saveMeasurements(next)
          refreshActivity()
        },
      },
    ])
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
    () => sortedAsc.filter(m => m.weightKg != null).map(m => kgToDisplay(m.weightKg as number, units.weight)),
    [sortedAsc, units.weight]
  )

  const getDots = (date: Date): string[] => {
    const activity = activityByDate.get(date.toDateString())
    if (!activity) return []
    const dots: string[] = []
    if (activity.workouts.length > 0) dots.push(colors.emerald)
    if (activity.meals.length > 0) dots.push(colors.orange)
    if (activity.measurement) dots.push(colors.violet)
    return dots
  }
  const selectedActivity = activityByDate.get(selectedDate.toDateString())
  const hasSelectedActivity = !!selectedActivity && (
    selectedActivity.workouts.length > 0 || selectedActivity.meals.length > 0 || !!selectedActivity.measurement
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.meHeader}>
        <Text style={styles.meTitle}>{t('tabs.me')}</Text>
        <TouchableOpacity style={styles.meSettings} onPress={() => navigation.navigate('Settings')} accessibilityLabel={t('settingsScreen.title')}>
          <Text style={styles.meSettingsText}>⚙︎ {t('settingsScreen.openSettings')}</Text>
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.h1}>{t('profile.title')}</Text>
          <Text style={styles.subtitle}>{t('profile.subtitle')}</Text>

          {/* Profile form */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t('profile.profileSectionTitle')}</Text>

            <View style={styles.grid2}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t('body.age')}</Text>
                <TextInput
                  value={age}
                  onChangeText={setAge}
                  placeholder="25"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t('onboarding.height')} ({units.length})</Text>
                <TextInput
                  value={heightCm}
                  onChangeText={setHeightCm}
                  placeholder="175"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t('onboarding.weight')} ({units.weight})</Text>
                <TextInput
                  value={weightKg}
                  onChangeText={setWeightKg}
                  placeholder="70"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('body.gender')}</Text>
              <ChipGroup
                options={GENDER_OPTIONS.map(g => t(g.key))}
                value={t(GENDER_OPTIONS.find(g => g.slug === gender)?.key || '')}
                onChange={label => {
                  const found = GENDER_OPTIONS.find(g => t(g.key) === label)
                  if (found) setGender(found.slug)
                }}
                accent={colors.violet}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('body.fitnessLevel')}</Text>
              <ChipGroup
                options={FITNESS_LEVEL_SLUGS.map(s => t(`body.fitnessLevels.${s}`))}
                value={t(`body.fitnessLevels.${fitnessLevel}`)}
                onChange={label => {
                  const found = FITNESS_LEVEL_SLUGS.find(s => t(`body.fitnessLevels.${s}`) === label)
                  if (found) setFitnessLevel(found)
                }}
                accent={colors.violet}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('body.primaryGoal')}</Text>
              <ChipGroup
                options={GOAL_SLUGS.map(s => t(`body.goals.${s}`))}
                value={t(`body.goals.${goal}`)}
                onChange={label => {
                  const found = GOAL_SLUGS.find(s => t(`body.goals.${s}`) === label)
                  if (found) setGoal(found)
                }}
                accent={colors.violet}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('body.daysPerWeek')}</Text>
              <ChipGroup
                options={DAYS.map(d => `${d} ${t('body.daysSuffix')}`)}
                value={`${daysPerWeek} ${t('body.daysSuffix')}`}
                onChange={label => setDaysPerWeek(label.split(' ')[0])}
                accent={colors.violet}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('body.equipmentLabel')}</Text>
              <ChipGroup
                options={EQUIPMENT_SLUGS.map(s => t(`body.equipment.${s}`))}
                value={t(`body.equipment.${equipment}`)}
                onChange={label => {
                  const found = EQUIPMENT_SLUGS.find(s => t(`body.equipment.${s}`) === label)
                  if (found) setEquipment(found)
                }}
                accent={colors.violet}
              />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
              <Text style={styles.saveBtnText}>{t('profile.saveButton')}</Text>
            </TouchableOpacity>
            {savedFlash && <Text style={styles.savedHint}>{t('profile.savedHint')}</Text>}
          </View>

          {/* Progress log */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t('profile.measurementLogTitle')}</Text>
            <Text style={styles.cardSubLabel}>{t('profile.measurementLogSubtitle')}</Text>

            <View style={styles.grid2}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t('onboarding.weight')} ({units.weight})</Text>
                <TextInput
                  value={entryWeight}
                  onChangeText={setEntryWeight}
                  placeholder="70"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t('profile.bodyFatLabel')}</Text>
                <TextInput
                  value={entryBodyFat}
                  onChangeText={setEntryBodyFat}
                  placeholder="18"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('profile.noteLabel')}</Text>
              <TextInput
                value={entryNote}
                onChangeText={setEntryNote}
                placeholder={t('profile.notePlaceholder')}
                placeholderTextColor={colors.textFaint}
                style={styles.input}
              />
            </View>

            <TouchableOpacity
              style={[styles.logBtn, !entryWeight && styles.logBtnDisabled]}
              onPress={handleAddMeasurement}
              disabled={!entryWeight}
            >
              <Text style={styles.logBtnText}>{t('profile.logButton')}</Text>
            </TouchableOpacity>

            {weightTrendValues.length >= 2 && (
              <View style={{ marginTop: spacing.md }}>
                <Text style={styles.cardSubLabel}>{t('profile.trendTitle')}</Text>
                <TrendChart values={weightTrendValues} gradientId="mobileWeightTrend" />
              </View>
            )}

            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              {sortedDesc.length === 0 ? (
                <Text style={styles.emptyText}>{t('profile.noMeasurementsYet')}</Text>
              ) : (
                sortedDesc.map(entry => {
                  const delta = deltaById.get(entry.id)
                  return (
                    <View key={entry.id} style={styles.measurementRow}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                          <Text style={styles.measurementWeight}>
                            {entry.weightKg != null ? `${kgToDisplay(entry.weightKg, units.weight)} ${units.weight}` : '—'}
                          </Text>
                          {delta != null && (
                            <Text style={[styles.measurementDelta, { color: delta > 0 ? colors.amber : delta < 0 ? colors.emerald : colors.textMuted }]}>
                              {delta > 0 ? '+' : ''}{kgToDisplay(delta, units.weight).toFixed(1)} {units.weight} {t('profile.sinceLast')}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.measurementMeta}>
                          {new Date(entry.dateISO).toLocaleDateString()}
                          {entry.bodyFatPct != null ? ` · ${entry.bodyFatPct}% BF` : ''}
                          {entry.note ? ` · ${entry.note}` : ''}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => deleteMeasurement(entry.id)}>
                        <Text style={{ fontSize: 14 }}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  )
                })
              )}
            </View>
          </View>

          {/* Activity calendar */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t('profile.activityCalendarTitle')}</Text>
            <Text style={styles.cardSubLabel}>{t('profile.activityCalendarSubtitle')}</Text>

            <View style={{ marginTop: spacing.md }}>
              <CalendarPicker locale={locale} selected={selectedDate} onSelect={setSelectedDate} getDots={getDots} />
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.emerald }]} />
                <Text style={styles.legendText}>{t('profile.legendWorkout')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.orange }]} />
                <Text style={styles.legendText}>{t('profile.legendMeal')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.violet }]} />
                <Text style={styles.legendText}>{t('profile.legendMeasurement')}</Text>
              </View>
            </View>

            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <Text style={styles.selectedDateLabel}>
                {new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }).format(selectedDate)}
              </Text>
              {!hasSelectedActivity ? (
                <Text style={styles.emptyText}>{t('profile.noActivityForDay')}</Text>
              ) : (
                <>
                  {selectedActivity!.workouts.length > 0 && (
                    <View>
                      <Text style={[styles.detailHeading, { color: colors.emerald }]}>{t('profile.workoutsHeading')}</Text>
                      {selectedActivity!.workouts.map(w => (
                        <View key={w.id} style={styles.detailRow}>
                          <Text style={styles.detailText}>{w.exercise}</Text>
                          {w.formScore != null && (
                            <Text style={styles.detailMeta}>{t('profile.formScoreLabel')}: {w.formScore}/10</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                  {selectedActivity!.meals.length > 0 && (
                    <View>
                      <Text style={[styles.detailHeading, { color: colors.orange }]}>{t('profile.mealsHeading')}</Text>
                      {selectedActivity!.meals.map(m => (
                        <View key={m.id} style={styles.detailRow}>
                          <Text style={styles.detailText}>{m.title}</Text>
                          <Text style={styles.detailMeta}>{m.timestamp}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {selectedActivity!.measurement && (
                    <View>
                      <Text style={[styles.detailHeading, { color: colors.violet }]}>{t('profile.measurementHeading')}</Text>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailText}>
                          {selectedActivity!.measurement!.weightKg != null ? `${kgToDisplay(selectedActivity!.measurement!.weightKg, units.weight)} ${units.weight}` : ''}
                          {selectedActivity!.measurement!.bodyFatPct != null ? ` · ${selectedActivity!.measurement!.bodyFatPct}% BF` : ''}
                        </Text>
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <TabBar active="Profile" />
    </SafeAreaView>
  )
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    meHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
    meTitle: { fontFamily: fonts.heading, fontSize: 30, color: colors.textPrimary },
    meSettings: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.full, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    meSettingsText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary },
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
    h1: { color: colors.textPrimary, fontSize: 26, fontFamily: fonts.heading },
    subtitle: { color: colors.textMuted, fontSize: 14, marginTop: 4, marginBottom: spacing.sm },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.xl,
      padding: spacing.lg,
      gap: spacing.md,
    },
    cardLabel: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
    cardSubLabel: { color: colors.textMuted, fontSize: 12 },
    grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    field: { flex: 1, minWidth: 100, gap: 4 },
    fieldLabel: { color: colors.textMuted, fontSize: 12 },
    input: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: radius.md,
      paddingVertical: 10,
      paddingHorizontal: 12,
      color: colors.textPrimary,
      fontSize: 14,
    },
    saveBtn: {
      backgroundColor: colors.violetDark,
      paddingVertical: 13,
      borderRadius: radius.lg,
      alignItems: 'center',
    },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    savedHint: { color: colors.emerald, fontSize: 12, textAlign: 'center' },
    logBtn: {
      backgroundColor: colors.violetSoft,
      borderWidth: 1,
      borderColor: colors.violetBorder,
      paddingVertical: 11,
      borderRadius: radius.md,
      alignItems: 'center',
    },
    logBtnDisabled: { opacity: 0.4 },
    logBtnText: { color: colors.violet, fontWeight: '600', fontSize: 13 },
    emptyText: { color: colors.textFaint, fontSize: 12 },
    measurementRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cardAlt,
      borderRadius: radius.md,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    measurementWeight: { color: colors.textPrimary, fontWeight: '600', fontSize: 14 },
    measurementDelta: { fontSize: 12 },
    measurementMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
    legendRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { color: colors.textMuted, fontSize: 12 },
    selectedDateLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
    detailHeading: { fontSize: 12, fontWeight: '700', marginBottom: 4, marginTop: 6 },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cardAlt,
      borderRadius: radius.md,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginBottom: 4,
    },
    detailText: { color: colors.textSecondary, fontSize: 13, flexShrink: 1 },
    detailMeta: { color: colors.textFaint, fontSize: 11 },
  })
}
