import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
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
import { useNavigation } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import TopBar from '../components/TopBar'
import HeaderActions from '../components/HeaderActions'
import ChipGroup from '../components/ChipGroup'
import MarkdownText from '../components/MarkdownText'
import { appendImage, PickedImage } from '../lib/api'
import { streamAnalysis, StreamError } from '../lib/streaming'
import { extractTag, stripTag, saveNutritionTarget } from '../lib/nutrition'
import {
  FITNESS_LEVEL_SLUGS, GOAL_SLUGS, EQUIPMENT_SLUGS,
  FitnessLevelSlug, GoalSlug, EquipmentSlug, GenderSlug,
  loadProfile,
} from '../lib/profile'
import { useTheme } from '../lib/theme/ThemeContext'
import { useTranslation } from '../lib/i18n/LanguageContext'
import { DICTIONARIES } from '../lib/i18n/translations'
import { spacing, radius, fonts } from '../theme'

const DAYS = ['2', '3', '4', '5', '6']
const GENDER_OPTIONS: { slug: GenderSlug; key: string }[] = [
  { slug: 'notSpecified', key: 'body.genderNotSpecified' },
  { slug: 'male', key: 'body.genderMale' },
  { slug: 'female', key: 'body.genderFemale' },
  { slug: 'nonBinary', key: 'body.genderNonBinary' },
]

export default function BodyScreen() {
  const { colors } = useTheme()
  const { t, locale } = useTranslation()
  const navigation = useNavigation()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [age, setAge] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [gender, setGender] = useState<GenderSlug>('notSpecified')
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevelSlug>('beginner')
  const [goal, setGoal] = useState<GoalSlug>('loseWeight')
  const [daysPerWeek, setDaysPerWeek] = useState('3')
  const [equipment, setEquipment] = useState<EquipmentSlug>('none')
  const [image, setImage] = useState<PickedImage | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [plan, setPlan] = useState('')
  const [prefilledFromProfile, setPrefilledFromProfile] = useState(false)
  const [targetSaved, setTargetSaved] = useState(false)

  useEffect(() => {
    loadProfile().then(p => {
      if (p.age || p.heightCm || p.weightKg) {
        setAge(p.age); setHeightCm(p.heightCm); setWeightKg(p.weightKg)
        setGender(p.gender); setFitnessLevel(p.fitnessLevel); setGoal(p.goal)
        setDaysPerWeek(p.daysPerWeek); setEquipment(p.equipment)
        setPrefilledFromProfile(true)
      }
    })
  }, [])

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    })
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      setImage({ uri: asset.uri, name: asset.fileName || 'body.jpg', type: asset.mimeType || 'image/jpeg' })
      setPlan('')
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

  const generatePlan = async () => {
    setIsGenerating(true)
    setPlan('')
    setTargetSaved(false)
    try {
      const formData = new FormData()
      if (image) appendImage(formData, image)
      formData.append('age', age)
      formData.append('heightCm', heightCm)
      formData.append('weightKg', weightKg)
      formData.append('gender', DICTIONARIES.en.body[
        gender === 'notSpecified' ? 'genderNotSpecified'
          : gender === 'male' ? 'genderMale'
          : gender === 'female' ? 'genderFemale'
          : 'genderNonBinary'
      ])
      formData.append('fitnessLevel', DICTIONARIES.en.body.fitnessLevels[fitnessLevel])
      formData.append('goals', DICTIONARIES.en.body.goals[goal])
      formData.append('daysPerWeek', daysPerWeek)
      formData.append('equipment', DICTIONARIES.en.body.equipment[equipment])
      formData.append('locale', locale)

      const fullPlan = await streamAnalysis('/api/analyze-body', formData, setPlan)

      const target = extractTag<{ calories?: number; protein?: number; carbs?: number; fat?: number }>(fullPlan, 'TARGET_DATA')
      if (target) {
        await saveNutritionTarget(target)
        setTargetSaved(true)
      }
      setPlan(stripTag(fullPlan, 'TARGET_DATA'))
    } catch (err) {
      setPlan('Error: ' + mapStreamError(err))
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar icon="💪" title={t('body.headerTitle')} accent={colors.emerald} actions={<HeaderActions />} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.h1}>{t('body.title')}</Text>
          <Text style={styles.sub}>{t('body.subtitle')}</Text>

          {/* Optional photo */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('body.photoLabel')} <Text style={styles.optional}>{t('body.optional')}</Text></Text>
            {image ? (
              <View>
                <Image source={{ uri: image.uri }} style={styles.photo} contentFit="cover" />
                <TouchableOpacity style={styles.removeBadge} onPress={() => setImage(null)}>
                  <Text style={styles.removeBadgeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.photoPlaceholder} onPress={pickImage}>
                <Text style={styles.placeholderIcon}>📸</Text>
                <Text style={styles.placeholderText}>{t('body.uploadPhoto')}</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.hint}>{t('body.photoHelp')}</Text>
          </View>

          {/* Measurements */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{t('body.measurementsTitle')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Profile' as never)}>
                <Text style={styles.editLink}>{t('profile.editInProfile')}</Text>
              </TouchableOpacity>
            </View>
            {prefilledFromProfile && <Text style={styles.hint}>{t('profile.loadedFromProfileHint')}</Text>}
            <View style={styles.grid2}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t('body.age')}</Text>
                <TextInput
                  value={age} onChangeText={setAge} placeholder="25" placeholderTextColor={colors.textFaint}
                  keyboardType="number-pad" style={styles.input}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t('body.height')}</Text>
                <TextInput
                  value={heightCm} onChangeText={setHeightCm} placeholder="175" placeholderTextColor={colors.textFaint}
                  keyboardType="number-pad" style={styles.input}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t('body.weight')}</Text>
                <TextInput
                  value={weightKg} onChangeText={setWeightKg} placeholder="70" placeholderTextColor={colors.textFaint}
                  keyboardType="number-pad" style={styles.input}
                />
              </View>
            </View>
            <Text style={styles.fieldLabel}>{t('body.gender')}</Text>
            <ChipGroup
              options={GENDER_OPTIONS.map(g => t(g.key))}
              value={t(GENDER_OPTIONS.find(g => g.slug === gender)?.key || '')}
              onChange={label => {
                const found = GENDER_OPTIONS.find(g => t(g.key) === label)
                if (found) setGender(found.slug)
              }}
              accent={colors.emerald}
            />
          </View>

          {/* Training preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('body.trainingPrefsTitle')}</Text>

            <Text style={styles.fieldLabel}>{t('body.fitnessLevel')}</Text>
            <ChipGroup
              options={FITNESS_LEVEL_SLUGS.map(s => t(`body.fitnessLevels.${s}`))}
              value={t(`body.fitnessLevels.${fitnessLevel}`)}
              onChange={label => {
                const found = FITNESS_LEVEL_SLUGS.find(s => t(`body.fitnessLevels.${s}`) === label)
                if (found) setFitnessLevel(found)
              }}
              accent={colors.emerald}
            />

            <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]}>{t('body.primaryGoal')}</Text>
            <ChipGroup
              options={GOAL_SLUGS.map(s => t(`body.goals.${s}`))}
              value={t(`body.goals.${goal}`)}
              onChange={label => {
                const found = GOAL_SLUGS.find(s => t(`body.goals.${s}`) === label)
                if (found) setGoal(found)
              }}
              accent={colors.emerald}
            />

            <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]}>{t('body.daysPerWeek')}</Text>
            <ChipGroup
              options={DAYS.map(d => `${d} ${t('body.daysSuffix')}`)}
              value={`${daysPerWeek} ${t('body.daysSuffix')}`}
              onChange={label => setDaysPerWeek(label.split(' ')[0])}
              accent={colors.emerald}
            />

            <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]}>{t('body.equipmentLabel')}</Text>
            <ChipGroup
              options={EQUIPMENT_SLUGS.map(s => t(`body.equipment.${s}`))}
              value={t(`body.equipment.${equipment}`)}
              onChange={label => {
                const found = EQUIPMENT_SLUGS.find(s => t(`body.equipment.${s}`) === label)
                if (found) setEquipment(found)
              }}
              accent={colors.emerald}
            />
          </View>

          <TouchableOpacity
            style={[styles.generateBtn, isGenerating && styles.btnDisabled]}
            onPress={generatePlan}
            disabled={isGenerating}
          >
            <Text style={styles.generateBtnText}>
              {isGenerating ? t('body.generating') : t('body.generateButton')}
            </Text>
          </TouchableOpacity>

          {/* Results */}
          <View style={styles.resultsCard}>
            {!plan && !isGenerating && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>{t('body.resultsPlaceholder')}</Text>
              </View>
            )}
            {isGenerating && !plan && (
              <View style={styles.emptyState}>
                <ActivityIndicator color={colors.emerald} />
                <Text style={styles.emptyText}>{t('body.buildingPlan')}</Text>
              </View>
            )}
            {plan && (
              <View style={{ padding: spacing.lg }}>
                <Text style={styles.resultsTitle}>{t('body.planTitle')}</Text>
                {targetSaved && <Text style={styles.targetSavedHint}>{t('body.targetSavedHint')}</Text>}
                <MarkdownText text={plan} accent={colors.emerald} />
              </View>
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
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
    h1: { fontSize: 26, fontFamily: fonts.heading, color: colors.textPrimary },
    sub: { color: colors.textSecondary, fontSize: 14, marginBottom: spacing.sm },

    section: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
    editLink: { color: colors.emerald, fontSize: 12, fontWeight: '600' },
    optional: { color: colors.textMuted, fontWeight: '400' },

    photo: { width: '100%', height: 180, borderRadius: radius.md },
    removeBadge: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' },
    removeBadgeText: { color: '#fff' },
    photoPlaceholder: { height: 96, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 4 },
    placeholderIcon: { fontSize: 22 },
    placeholderText: { color: colors.textMuted, fontSize: 12 },
    hint: { color: colors.textFaint, fontSize: 11 },

    grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    field: { flexBasis: '31%', flexGrow: 1 },
    fieldLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
    input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 12, color: colors.textPrimary, fontSize: 14 },

    generateBtn: { backgroundColor: colors.emerald, paddingVertical: 15, borderRadius: radius.lg, alignItems: 'center' },
    btnDisabled: { opacity: 0.5 },
    generateBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    resultsCard: { minHeight: 260, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
    emptyState: { minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: spacing.xl },
    emptyIcon: { fontSize: 38 },
    emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
    resultsTitle: { color: colors.textPrimary, fontWeight: '700', fontSize: 15, marginBottom: spacing.sm },
    targetSavedHint: { color: colors.emerald, fontSize: 12, marginBottom: spacing.md },
  })
}
