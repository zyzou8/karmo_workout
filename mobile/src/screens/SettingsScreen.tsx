import React, { ReactNode, useEffect, useMemo, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Slider from '@react-native-community/slider'
import { fonts, radius, spacing } from '../theme'
import { ThemeMode, useTheme } from '../lib/theme/ThemeContext'
import { useTranslation } from '../lib/i18n/LanguageContext'
import { LOCALES } from '../lib/i18n/translations'
import { RootStackParamList } from '../navigation'
import { useUnits, WeightUnit, LengthUnit } from '../lib/units'
import { CoachSettings, DEFAULT_COACH_SETTINGS, loadCoachSettings, saveCoachSettings } from '../lib/coach'
import DisclaimerSummary from '../components/DisclaimerSummary'
import TopBar from '../components/TopBar'

/** Settings: units, theme, language; profile & biometric; coach personas; account; help. */
export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { colors, mode, setMode } = useTheme()
  const { t, locale, setLocale } = useTranslation()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [units, setUnits] = useUnits()
  const [coach, setCoach] = useState<CoachSettings>(DEFAULT_COACH_SETTINGS)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => { loadCoachSettings().then(setCoach) }, [])

  const updateCoach = (patch: Partial<CoachSettings>) => {
    const next = { ...coach, ...patch }
    setCoach(next)
    saveCoachSettings(next)
  }

  const Segmented = <T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) => (
    <View style={styles.segment} accessibilityRole="radiogroup">
      {options.map(o => (
        <TouchableOpacity
          key={o.value}
          onPress={() => onChange(o.value)}
          style={[styles.segmentBtn, value === o.value && { backgroundColor: colors.primary }]}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === o.value }}
        >
          <Text style={[styles.segmentText, value === o.value && { color: colors.onPrimary }]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  const Row = ({ label, children }: { label: string; children: ReactNode }) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  )

  const PersonaSlider = ({ left, right, value, onChange }: { left: string; right: string; value: number; onChange: (v: number) => void }) => (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabel}>{left}</Text>
        <Text style={styles.sliderLabel}>{right}</Text>
      </View>
      <Slider
        minimumValue={0}
        maximumValue={100}
        step={5}
        value={value}
        onSlidingComplete={onChange}
        minimumTrackTintColor={colors.olive}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
        accessibilityLabel={`${left} – ${right}`}
      />
    </View>
  )

  const Expandable = ({ id, label, children }: { id: string; label: string; children: ReactNode }) => (
    <View>
      <TouchableOpacity style={styles.linkRow} onPress={() => setOpen(o => (o === id ? null : id))}>
        <Text style={styles.linkText}>{label}</Text>
        <Text style={styles.chevron}>{open === id ? '⌃' : '›'}</Text>
      </TouchableOpacity>
      {open === id && <View style={styles.expanded}>{children}</View>}
    </View>
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar title={t('settingsScreen.title')} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* 1. App preferences */}
        <Text style={styles.section}>{t('settingsScreen.appPreferences')}</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('settingsScreen.units')}</Text>
          <Row label={t('settingsScreen.weight')}>
            <Segmented<WeightUnit>
              options={[{ value: 'lb', label: 'lb' }, { value: 'kg', label: 'kg' }]}
              value={units.weight}
              onChange={weight => setUnits({ ...units, weight })}
            />
          </Row>
          <Row label={t('settingsScreen.length')}>
            <Segmented<LengthUnit>
              options={[{ value: 'in', label: 'in' }, { value: 'cm', label: 'cm' }]}
              value={units.length}
              onChange={length => setUnits({ ...units, length })}
            />
          </Row>
          <Row label={t('settingsScreen.energy')}>
            <Segmented options={[{ value: 'kcal', label: 'kcal' }]} value={units.energy} onChange={() => {}} />
          </Row>
          <Text style={styles.hint}>{t('settingsScreen.unitsHint')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('settingsScreen.theme')}</Text>
          <Segmented<ThemeMode>
            options={[
              { value: 'dark', label: t('settingsScreen.themeDark') },
              { value: 'light', label: t('settingsScreen.themeLight') },
              { value: 'system', label: t('settingsScreen.themeSystem') },
            ]}
            value={mode}
            onChange={setMode}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('settingsScreen.language')}</Text>
          <View style={styles.langGrid}>
            {LOCALES.map(l => (
              <TouchableOpacity
                key={l.value}
                onPress={() => setLocale(l.value)}
                style={[styles.langBtn, locale === l.value && { borderColor: colors.olive, backgroundColor: colors.sageSoft }]}
              >
                <Text style={[styles.langText, locale === l.value && { color: colors.textPrimary, fontFamily: fonts.bodyBold }]}>{l.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 2. Profile & biometric */}
        <Text style={styles.section}>{t('settingsScreen.profileSection')}</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.linkRowFlat} onPress={() => navigation.navigate('Profile', undefined)}>
            <Text style={styles.linkText}>{t('settingsScreen.editProfile')}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 3. Coach personas */}
        <Text style={styles.section}>{t('settingsScreen.coachSection')}</Text>
        <View style={styles.card}>
          <PersonaSlider left={t('settingsScreen.strict')} right={t('settingsScreen.gentle')} value={coach.gentle} onChange={gentle => updateCoach({ gentle })} />
          <PersonaSlider left={t('settingsScreen.harsh')} right={t('settingsScreen.encouraging')} value={coach.encourage} onChange={encourage => updateCoach({ encourage })} />
          <PersonaSlider left={t('settingsScreen.verbose')} right={t('settingsScreen.minimal')} value={coach.brevity} onChange={brevity => updateCoach({ brevity })} />
        </View>

        {/* 4. Account */}
        <Text style={styles.section}>{t('settingsScreen.account')}</Text>
        <View style={[styles.card, { padding: 0 }]}>
          <Text style={[styles.hint, { padding: spacing.lg, paddingBottom: 0 }]}>{t('settingsScreen.accountNote')}</Text>
          <Expandable id="disclaimer" label={t('settingsScreen.disclaimer')}><DisclaimerSummary /></Expandable>
          <Expandable id="privacy" label={t('settingsScreen.privacy')}><Text style={styles.body}>{t('settingsScreen.privacyBody')}</Text></Expandable>
          <Expandable id="terms" label={t('settingsScreen.terms')}><Text style={styles.body}>{t('settingsScreen.termsBody')}</Text></Expandable>
          <Expandable id="help" label={t('settingsScreen.help')}><Text style={styles.body}>{t('settingsScreen.helpBody')}</Text></Expandable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
    section: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.sm },
    card: { backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.md, overflow: 'hidden' },
    cardTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
    rowLabel: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary },
    segment: { flexDirection: 'row', backgroundColor: colors.cardAlt, borderRadius: radius.full, padding: 3 },
    segmentBtn: { paddingVertical: 7, paddingHorizontal: 16, borderRadius: radius.full },
    segmentText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },
    hint: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
    langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    langBtn: { width: '48.5%', paddingVertical: 10, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
    langText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
    sliderBlock: { gap: 2 },
    sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    sliderLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },
    linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
    linkRowFlat: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    linkText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary },
    chevron: { fontSize: 20, color: colors.textMuted },
    expanded: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  })
}
