import React, { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../lib/theme/ThemeContext'
import { useTranslation } from '../lib/i18n/LanguageContext'
import { LOCALES } from '../lib/i18n/translations'
import { loadDisclaimerAcceptance, saveDisclaimerAcceptance } from '../lib/disclaimer'
import { DEFAULT_PROFILE, EQUIPMENT_SLUGS, EquipmentSlug, GOAL_SLUGS, GoalSlug, loadProfile, saveProfile } from '../lib/profile'
import { displayToCm, displayToKg, LengthUnit, saveUnits, DEFAULT_UNITS, WeightUnit } from '../lib/units'
import DisclaimerSummary from '../components/DisclaimerSummary'
import { spacing, radius, fonts } from '../theme'

/**
 * First-run onboarding (about 60 seconds, not a tour): language → disclaimer & privacy →
 * height, weight, goal and equipment. Consent and goals feed every later module.
 */
export default function RegistrationScreen({ onAccepted }: { onAccepted: () => void }) {
  const { colors } = useTheme()
  const { t, locale, setLocale } = useTranslation()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [step, setStep] = useState<'language' | 'disclaimer' | 'details'>('language')
  const [isAdult, setIsAdult] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const [weightUnit, setWeightUnit] = useState<WeightUnit>(DEFAULT_UNITS.weight)
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>(DEFAULT_UNITS.length)
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [goal, setGoal] = useState<GoalSlug>(DEFAULT_PROFILE.goal)
  const [equipment, setEquipment] = useState<EquipmentSlug>(DEFAULT_PROFILE.equipment)
  const [error, setError] = useState<string | null>(null)

  // Already accepted earlier (e.g. an update added the details step): go straight to details.
  useEffect(() => {
    loadDisclaimerAcceptance().then(a => { if (a) setStep('details') })
  }, [])

  const accept = async () => {
    await saveDisclaimerAcceptance()
    setStep('details')
  }

  const finish = async () => {
    const h = parseFloat(height)
    const w = parseFloat(weight)
    if (!Number.isFinite(h) || h <= 0) return setError(t('onboarding.errorHeight'))
    if (!Number.isFinite(w) || w <= 0) return setError(t('onboarding.errorWeight'))
    const existing = await loadProfile()
    await saveProfile({
      ...existing,
      heightCm: String(Math.round(displayToCm(h, lengthUnit) * 10) / 10),
      weightKg: String(Math.round(displayToKg(w, weightUnit) * 10) / 10),
      goal,
      equipment,
    })
    await saveUnits({ ...DEFAULT_UNITS, weight: weightUnit, length: lengthUnit })
    onAccepted()
  }

  const UnitToggle = <T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) => (
    <View style={styles.unitToggle}>
      {options.map(o => (
        <TouchableOpacity key={o} onPress={() => onChange(o)} style={[styles.unitBtn, value === o && { backgroundColor: colors.primary }]}>
          <Text style={[styles.unitText, value === o && { color: colors.onPrimary }]}>{o}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  const Chips = <T extends string>({ slugs, value, onChange, prefix }: { slugs: readonly T[]; value: T; onChange: (v: T) => void; prefix: string }) => (
    <View style={styles.chipWrap}>
      {slugs.map(s => (
        <TouchableOpacity key={s} onPress={() => onChange(s)} style={[styles.chip, value === s && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
          <Text style={[styles.chipText, value === s && { color: colors.onPrimary }]}>{t(`${prefix}.${s}`)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  const Checkbox = ({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) => (
    <TouchableOpacity onPress={onToggle} style={styles.checkRow} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <View style={[styles.checkbox, checked && { backgroundColor: colors.violet, borderColor: colors.violet }]}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.brandRow}>
          <View style={styles.logo}><Text style={styles.logoText}>K</Text></View>
          <Text style={styles.brand}>{t('nav.brand')}</Text>
          <Text style={styles.step}>{step === 'language' ? '1' : step === 'disclaimer' ? '2' : '3'} / 3</Text>
        </View>

        {step === 'details' ? (
          <>
            <Text style={styles.h1}>{t('onboarding.stepDetails')}</Text>
            <Text style={styles.subtitle}>{t('onboarding.sixtySeconds')}</Text>

            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>{t('onboarding.height')}</Text>
              <UnitToggle<LengthUnit> options={['in', 'cm']} value={lengthUnit} onChange={setLengthUnit} />
            </View>
            <TextInput
              value={height}
              onChangeText={v => setHeight(v.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder={lengthUnit === 'in' ? '69' : '175'}
              placeholderTextColor={colors.textFaint}
              style={styles.input}
            />

            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>{t('onboarding.weight')}</Text>
              <UnitToggle<WeightUnit> options={['lb', 'kg']} value={weightUnit} onChange={setWeightUnit} />
            </View>
            <TextInput
              value={weight}
              onChangeText={v => setWeight(v.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder={weightUnit === 'lb' ? '160' : '72'}
              placeholderTextColor={colors.textFaint}
              style={styles.input}
            />

            <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>{t('onboarding.goal')}</Text>
            <Chips slugs={GOAL_SLUGS} value={goal} onChange={setGoal} prefix="body.goals" />

            <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>{t('onboarding.equipment')}</Text>
            <Chips slugs={EQUIPMENT_SLUGS} value={equipment} onChange={setEquipment} prefix="body.equipment" />

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity style={styles.primaryBtn} onPress={finish}>
              <Text style={styles.primaryText}>{t('onboarding.continue')}</Text>
            </TouchableOpacity>
          </>
        ) : step === 'language' ? (
          <>
            <Text style={styles.h1}>{t('disclaimer.welcomeTitle')}</Text>
            <Text style={styles.subtitle}>{t('disclaimer.welcomeSubtitle')}</Text>
            <View style={styles.langGrid}>
              {LOCALES.map(l => {
                const selected = locale === l.value
                return (
                  <TouchableOpacity
                    key={l.value}
                    onPress={() => setLocale(l.value)}
                    style={[styles.langBtn, selected && { borderColor: colors.violet, backgroundColor: colors.violetSoft }]}
                  >
                    <Text style={[styles.langText, selected && { color: colors.textPrimary }]}>{l.label}</Text>
                    {selected && <Text style={{ color: colors.violet }}>✓</Text>}
                  </TouchableOpacity>
                )
              })}
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('disclaimer')}>
              <Text style={styles.primaryText}>{t('disclaimer.continueButton')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.h1}>{t('disclaimer.title')}</Text>
            <Text style={styles.subtitle}>{t('disclaimer.subtitle')}</Text>
            <DisclaimerSummary />
            <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
              <Checkbox checked={isAdult} onToggle={() => setIsAdult(v => !v)} label={t('disclaimer.ageCheckbox')} />
              <Checkbox checked={agreed} onToggle={() => setAgreed(v => !v)} label={t('disclaimer.agreeCheckbox')} />
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('language')}>
                <Text style={styles.secondaryText}>{t('disclaimer.backButton')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1, marginTop: 0 }, !(isAdult && agreed) && { opacity: 0.4 }]}
                onPress={accept}
                disabled={!(isAdult && agreed)}
              >
                <Text style={styles.primaryText}>{t('disclaimer.agreeButton')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
    logo: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    logoText: { color: colors.onPrimary, fontFamily: fonts.heading, fontSize: 16 },
    brand: { fontSize: 18, fontFamily: fonts.heading, color: colors.textPrimary },
    step: { marginLeft: 'auto', fontSize: 12, color: colors.textMuted },
    h1: { fontSize: 28, fontFamily: fonts.heading, color: colors.textPrimary, marginBottom: spacing.sm },
    subtitle: { fontSize: 14, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.lg },
    fieldHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.sm },
    fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary, marginBottom: spacing.sm },
    input: {
      fontFamily: fonts.bodyBold, fontSize: 20, color: colors.textPrimary, backgroundColor: colors.card,
      borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 14,
    },
    unitToggle: { flexDirection: 'row', backgroundColor: colors.cardAlt, borderRadius: radius.full, padding: 3 },
    unitBtn: { paddingVertical: 5, paddingHorizontal: 14, borderRadius: radius.full },
    unitText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
    chipText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
    error: { marginTop: spacing.lg, fontFamily: fonts.bodyBold, fontSize: 14, color: colors.red },
    langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    langBtn: {
      width: '48.5%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    langText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
    primaryBtn: {
      marginTop: spacing.xl,
      paddingVertical: 14,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    primaryText: { color: colors.onPrimary, fontSize: 15, fontFamily: fonts.bodyBold },
    buttonRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
    secondaryBtn: {
      paddingVertical: 14,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      backgroundColor: colors.cardAlt,
      alignItems: 'center',
    },
    secondaryText: { color: colors.textSecondary, fontSize: 15, fontWeight: '500' },
    checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: colors.borderLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
    checkLabel: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  })
}
