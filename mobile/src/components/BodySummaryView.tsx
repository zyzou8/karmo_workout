import React, { ReactNode, useMemo, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTheme } from '../lib/theme/ThemeContext'
import { useTranslation } from '../lib/i18n/LanguageContext'
import { BodySummary, MUSCLE_GROUPS, MuscleGroup, muscleLoadLevel, musclesForExercise } from '../lib/bodySummaryCore'
import { RootStackParamList } from '../navigation'
import { BodyModel, BodyPin, BodyView, LOAD_COLORS } from './BodyModel'
import { ActivityRings, Ring } from './ActivityRings'
import { TrendChart } from './TrendChart'
import { radius, spacing } from '../theme'

const LEVEL_KEYS = ['rest', 'light', 'moderate', 'optimal', 'high'] as const
const RING_COLORS = { training: '#fa114f', minutes: '#92e82a', fuel: '#1eeaef' }
const PIN_COLORS = { form: '#3b82f6', body: '#8b5cf6', fuel: '#f97316', training: '#10b981', muscle: '#f43f5e' }

type Nav = NativeStackNavigationProp<RootStackParamList>

interface Props {
  summary: BodySummary
  /** Shared snapshots hide empty sections and links back into the app. */
  mode: 'owner' | 'shared'
}

export default function BodySummaryView({ summary, mode }: Props) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const navigation = useNavigation<Nav>()
  const { width } = useWindowDimensions()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [view, setView] = useState<BodyView>('front')
  const [selected, setSelected] = useState<MuscleGroup | null>(null)
  const muscleLabel = (m: MuscleGroup) => t(`overview.muscles.${m}`)
  const { training, form, body, fuel } = summary
  const owner = mode === 'owner'

  const rings: (Ring & { label: string; text: string })[] = [
    {
      value: training.daysTrained, goal: training.daysGoal, color: RING_COLORS.training,
      label: t('overview.rings.training'), text: `${training.daysTrained}/${training.daysGoal}`,
    },
    {
      value: training.minutes, goal: training.minutesGoal, color: RING_COLORS.minutes,
      label: t('overview.rings.minutes'), text: `${training.minutes}/${training.minutesGoal}`,
    },
  ]
  if (fuel?.targetCalories) {
    rings.push({
      value: fuel.avgCalories, goal: fuel.targetCalories, color: RING_COLORS.fuel,
      label: t('overview.rings.fuel'), text: `${fuel.avgCalories}/${fuel.targetCalories}`,
    })
  }

  const pins: BodyPin[] = [
    { n: 1, x: 100, y: 24, color: PIN_COLORS.form },
    { n: 2, x: 80, y: 90, color: PIN_COLORS.body },
    { n: 3, x: 100, y: 142, color: PIN_COLORS.fuel },
    { n: 4, x: 147, y: 112, color: PIN_COLORS.training },
    { n: 5, x: 84, y: 252, color: PIN_COLORS.muscle },
  ].filter(pin => owner || (pin.n === 1 ? form : pin.n === 2 ? body : pin.n === 3 ? fuel : true))

  const loadedMuscles = MUSCLE_GROUPS
    .map(m => ({ m, sets: summary.muscles[m] ?? 0 }))
    .filter(x => x.sets > 0)
    .sort((a, b) => b.sets - a.sets)
  const maxSets = Math.max(20, ...loadedMuscles.map(x => x.sets))

  const selectedSets = selected ? summary.muscles[selected] ?? 0 : 0
  const selectedLevel = muscleLoadLevel(selectedSets)
  const selectedExercises = selected
    ? training.topExercises.filter(ex => (musclesForExercise(ex.name)[selected] ?? 0) > 0)
    : []

  const empty = (text: string, route?: 'Motion' | 'Profile' | 'Nutrition') =>
    owner && route ? (
      <TouchableOpacity onPress={() => navigation.navigate(route as never)}>
        <Text style={styles.muted}>{text} →</Text>
      </TouchableOpacity>
    ) : (
      <Text style={styles.muted}>{text}</Text>
    )

  return (
    <View style={{ gap: spacing.md }}>
      {/* Rings */}
      <View style={[styles.card, styles.ringsCard]}>
        <ActivityRings rings={rings} size={104} />
        <View style={{ flex: 1, gap: spacing.sm }}>
          {rings.map(r => (
            <View key={r.label}>
              <Text style={[styles.ringLabel, { color: r.color }]}>{r.label}</Text>
              <Text style={styles.ringValue}>{r.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Body model */}
      <View style={styles.card}>
        <View style={styles.segment}>
          {(['front', 'back'] as const).map(v => (
            <TouchableOpacity key={v} onPress={() => setView(v)} style={[styles.segmentBtn, view === v && styles.segmentBtnActive]}>
              <Text style={[styles.segmentText, view === v && { color: colors.textPrimary }]}>{t(`overview.${v}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ alignItems: 'center' }}>
          <BodyModel
            view={view}
            muscles={summary.muscles}
            selected={selected}
            onSelect={m => setSelected(prev => (prev === m ? null : m))}
            pins={pins}
            width={Math.min(220, width * 0.55)}
          />
        </View>
        <View style={styles.legend}>
          {LEVEL_KEYS.map((key, level) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: level ? LOAD_COLORS[level] : colors.borderLight }]} />
              <Text style={styles.legendText}>{t(`overview.levels.${key}`)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.detailBox}>
          {selected ? (
            <>
              <View style={styles.rowBetween}>
                <Text style={styles.detailTitle}>{muscleLabel(selected)}</Text>
                <Text style={[styles.detailLevel, { color: LOAD_COLORS[selectedLevel] || colors.textMuted }]}>
                  {t(`overview.levels.${LEVEL_KEYS[selectedLevel]}`)}
                </Text>
              </View>
              <Text style={styles.small}>{selectedSets} {t('overview.setsThisWeek')}</Text>
              <Text style={[styles.small, { color: colors.textSecondary, marginTop: 4 }]}>
                {selectedExercises.length
                  ? `${t('overview.fromTopExercises')}: ${selectedExercises.map(e => e.name).join(', ')}`
                  : t('overview.noExercisesForMuscle')}
              </Text>
            </>
          ) : (
            <Text style={styles.small}>{t('overview.tapMuscle')}{'\n'}{t('overview.muscleLoadHint')}</Text>
          )}
        </View>
      </View>

      {(owner || form) && (
        <PinCard n={1} color={PIN_COLORS.form} title={t('overview.form')} styles={styles}>
          {form ? (
            <>
              <BigStat styles={styles} value={form.avg.toFixed(1)} unit="/ 10" caption={`${t('overview.formAvg')} · ${form.count} ${t('overview.formScored')}`} />
              {form.best && (
                <Text style={[styles.small, { marginTop: spacing.sm }]}>
                  {t('overview.best')}: <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{form.best.name}</Text> · {form.best.score}/10
                </Text>
              )}
            </>
          ) : empty(t('overview.formEmpty'), 'Motion')}
        </PinCard>
      )}

      {(owner || body) && (
        <PinCard n={2} color={PIN_COLORS.body} title={t('overview.body')} styles={styles}>
          {body?.weightKg != null ? (
            <>
              <View style={styles.statRow}>
                <BigStat styles={styles} value={body.weightKg.toFixed(1)} unit="kg" caption={t('overview.weight')} />
                {body.bodyFatPct != null && <BigStat styles={styles} value={body.bodyFatPct.toFixed(1)} unit="%" caption={t('overview.bodyFat')} />}
              </View>
              {body.deltaKg != null && body.deltaKg !== 0 && (
                <Text style={[styles.small, { color: body.deltaKg < 0 ? colors.emerald : colors.amber, fontWeight: '600', marginTop: 4 }]}>
                  {body.deltaKg > 0 ? '▲' : '▼'} {Math.abs(body.deltaKg).toFixed(1)} kg {t('overview.sinceLast')}
                </Text>
              )}
              {body.weights.length >= 2 && (
                <TrendChart values={body.weights} gradientId={`weight-${mode}`} colorFrom="#8b5cf6" colorTo="#c084fc" height={60} />
              )}
            </>
          ) : empty(t('overview.bodyEmpty'), 'Profile')}
        </PinCard>
      )}

      {(owner || fuel) && (
        <PinCard n={3} color={PIN_COLORS.fuel} title={t('overview.fuel')} styles={styles}>
          {fuel ? (
            <>
              <BigStat
                styles={styles}
                value={String(fuel.avgCalories)}
                unit={t('overview.kcal')}
                caption={`${t('overview.avgPerDay')}${fuel.targetCalories ? ` · ${t('overview.target')} ${fuel.targetCalories}` : ''} · ${fuel.daysLogged}/7 ${t('overview.daysLogged')}`}
              />
              <View style={[styles.statRow, { marginTop: spacing.md }]}>
                <Macro styles={styles} label={t('overview.protein')} grams={fuel.avgProtein} target={fuel.targetProtein} color="#f43f5e" />
                <Macro styles={styles} label={t('overview.carbs')} grams={fuel.avgCarbs} color="#f59e0b" />
                <Macro styles={styles} label={t('overview.fat')} grams={fuel.avgFat} color="#0ea5e9" />
              </View>
            </>
          ) : empty(t('overview.fuelEmpty'), 'Nutrition')}
        </PinCard>
      )}

      <PinCard n={4} color={PIN_COLORS.training} title={t('overview.training')} styles={styles}>
        {training.sessions > 0 ? (
          <>
            <View style={styles.statRow}>
              <BigStat styles={styles} value={String(training.sessions)} caption={t('overview.sessions')} />
              {training.minutes > 0 && <BigStat styles={styles} value={String(training.minutes)} caption={t('overview.minutesShort')} />}
              {training.calories > 0 && <BigStat styles={styles} value={String(training.calories)} caption={t('overview.kcal')} />}
            </View>
            <Text style={styles.sectionLabel}>{t('overview.topExercises')}</Text>
            {training.topExercises.map(ex => (
              <View key={ex.name} style={styles.rowBetween}>
                <Text style={styles.listText} numberOfLines={1}>{ex.name}</Text>
                <Text style={styles.small}>{ex.sets} {t('overview.sets')}</Text>
              </View>
            ))}
          </>
        ) : empty(t('overview.trainingEmpty'), 'Motion')}
      </PinCard>

      <PinCard n={5} color={PIN_COLORS.muscle} title={t('overview.muscleLoad')} styles={styles}>
        {loadedMuscles.length ? (
          <View style={{ gap: spacing.sm }}>
            {loadedMuscles.slice(0, 7).map(({ m, sets }) => (
              <TouchableOpacity key={m} onPress={() => setSelected(m)}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.listText, selected === m && { color: colors.textPrimary, fontWeight: '600' }]}>{muscleLabel(m)}</Text>
                  <Text style={styles.small}>{sets}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(sets / maxSets) * 100}%`, backgroundColor: LOAD_COLORS[muscleLoadLevel(sets)] }]} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>{t('overview.trainingEmpty')}</Text>
        )}
      </PinCard>
    </View>
  )
}

type Styles = ReturnType<typeof createStyles>

function PinCard({ n, color, title, styles, children }: { n: number; color: string; title: string; styles: Styles; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.pinHeader}>
        <View style={[styles.pinBadge, { backgroundColor: color }]}>
          <Text style={styles.pinBadgeText}>{n}</Text>
        </View>
        <Text style={styles.pinTitle}>{title}</Text>
      </View>
      {children}
    </View>
  )
}

function BigStat({ value, unit, caption, styles }: { value: string; unit?: string; caption: string; styles: Styles }) {
  return (
    <View>
      <Text style={styles.bigValue}>
        {value}
        {unit ? <Text style={styles.bigUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.small}>{caption}</Text>
    </View>
  )
}

function Macro({ label, grams, target, color, styles }: { label: string; grams: number; target?: number; color: string; styles: Styles }) {
  const pct = target ? Math.min(100, (grams / target) * 100) : 100
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.small}>{label}</Text>
      <Text style={styles.macroValue}>
        {grams}g{target ? <Text style={styles.small}> / {target}</Text> : null}
      </Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color, opacity: target ? 1 : 0.5 }]} />
      </View>
    </View>
  )
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    ringsCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
    ringLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    ringValue: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    segment: {
      flexDirection: 'row',
      alignSelf: 'center',
      backgroundColor: colors.cardAlt,
      borderRadius: radius.sm,
      padding: 2,
      marginBottom: spacing.sm,
    },
    segmentBtn: { paddingVertical: 5, paddingHorizontal: spacing.md, borderRadius: 6 },
    segmentBtnActive: { backgroundColor: colors.card },
    segmentText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
    legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md, marginTop: spacing.sm },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendSwatch: { width: 10, height: 10, borderRadius: 2 },
    legendText: { fontSize: 11, color: colors.textMuted },
    detailBox: {
      marginTop: spacing.md,
      backgroundColor: colors.cardAlt,
      borderRadius: radius.md,
      padding: spacing.md,
      minHeight: 64,
    },
    detailTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    detailLevel: { fontSize: 12, fontWeight: '700' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
    statRow: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-end' },
    pinHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    pinBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    pinBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    pinTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    bigValue: { fontSize: 28, fontWeight: '800', color: colors.textPrimary },
    bigUnit: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
    macroValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    small: { fontSize: 12, color: colors.textMuted },
    muted: { fontSize: 14, color: colors.textMuted },
    listText: { flex: 1, fontSize: 14, color: colors.textSecondary },
    sectionLabel: {
      fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase',
      letterSpacing: 0.5, marginTop: spacing.md, marginBottom: spacing.xs,
    },
    barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.cardAlt, overflow: 'hidden', marginTop: 4 },
    barFill: { height: '100%', borderRadius: 3 },
  })
}
