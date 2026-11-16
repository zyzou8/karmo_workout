import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { useVideoPlayer, VideoView } from 'expo-video'
import * as VideoThumbnails from 'expo-video-thumbnails'
import Slider from '@react-native-community/slider'
import TopBar from '../components/TopBar'
import HeaderActions from '../components/HeaderActions'
import ChipGroup from '../components/ChipGroup'
import MarkdownText from '../components/MarkdownText'
import { PhotoAngleDiagram } from '../components/PhotoAngleDiagram'
import { TrendChart } from '../components/TrendChart'
import { appendImage, PickedImage } from '../lib/api'
import { streamAnalysis, StreamError } from '../lib/streaming'
import { loadWorkoutLog, saveWorkoutLog, extractFormScore, estimateWorkoutCalories, WorkoutEntry } from '../lib/workoutLog'
import { loadPlans, savePlans, WorkoutPlan, PlanExercise } from '../lib/workoutPlans'
import { getCurrentWeightKg } from '../lib/profile'
import { DICTIONARIES } from '../lib/i18n/translations'
import { useTheme } from '../lib/theme/ThemeContext'
import { useTranslation } from '../lib/i18n/LanguageContext'
import { spacing, radius, fonts } from '../theme'

const EXERCISE_SLUGS = [
  'squat', 'deadlift', 'benchPress', 'overheadPress',
  'barbellRow', 'pullup', 'pushup', 'lunge',
  'romanianDeadlift', 'hipThrust', 'plank', 'running',
  'yoga', 'other',
] as const
type ExerciseSlug = typeof EXERCISE_SLUGS[number]
type Tab = 'camera' | 'upload'

export default function MotionScreen() {
  const { colors } = useTheme()
  const { t, locale } = useTranslation()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [tab, setTab] = useState<Tab>('camera')
  const [exercise, setExercise] = useState<ExerciseSlug>('squat')
  const [image, setImage] = useState<PickedImage | null>(null)
  const [videoUri, setVideoUri] = useState<string | null>(null)
  const [scrubSeconds, setScrubSeconds] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState('')

  const [permission, requestPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraView>(null)
  const [cameraReady, setCameraReady] = useState(false)

  const player = useVideoPlayer(videoUri || '', p => { p.pause() })

  useEffect(() => {
    if (!videoUri) { setVideoDuration(0); return }
    const interval = setInterval(() => {
      if (player.duration && player.duration > 0) {
        setVideoDuration(player.duration)
        clearInterval(interval)
      }
    }, 200)
    return () => clearInterval(interval)
  }, [videoUri, player])

  const reset = () => {
    setImage(null)
    setVideoUri(null)
    setScrubSeconds(0)
    setVideoDuration(0)
    setAnalysis('')
  }

  const switchTab = (nextTab: Tab) => {
    setTab(nextTab)
    reset()
  }

  const mapCameraError = () => t('motion.cameraErrorNotAllowed')

  const capturePhoto = async () => {
    if (!cameraRef.current) return
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 })
    if (photo) {
      setImage({ uri: photo.uri, name: 'capture.jpg', type: 'image/jpeg' })
    }
  }

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.9,
    })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    if (asset.type === 'video') {
      setVideoUri(asset.uri)
      setImage(null)
      setScrubSeconds(0)
      setAnalysis('')
    } else {
      setImage({ uri: asset.uri, name: asset.fileName || 'upload.jpg', type: asset.mimeType || 'image/jpeg' })
      setVideoUri(null)
      setAnalysis('')
    }
  }

  const useThisFrame = async () => {
    if (!videoUri) return
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time: Math.round(scrubSeconds * 1000) })
      setImage({ uri, name: 'frame.jpg', type: 'image/jpeg' })
      setVideoUri(null)
    } catch {
      Alert.alert(t('errors.generic'))
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

  const analyzeForm = async () => {
    if (!image) return
    setIsAnalyzing(true)
    setAnalysis('')
    try {
      const formData = new FormData()
      appendImage(formData, image)
      formData.append('exercise', DICTIONARIES.en.motion.exercises[exercise])
      formData.append('locale', locale)

      const fullAnalysis = await streamAnalysis('/api/analyze-motion', formData, setAnalysis)

      const entry: WorkoutEntry = {
        id: Date.now().toString(),
        dateISO: new Date().toISOString(),
        exercise: t(`motion.exercises.${exercise}`),
        source: 'motion',
        formScore: extractFormScore(fullAnalysis),
      }
      const nextLog = [entry, ...workoutLog]
      setWorkoutLog(nextLog)
      await saveWorkoutLog(nextLog)
    } catch (err) {
      setAnalysis('Error: ' + mapStreamError(err))
    } finally {
      setIsAnalyzing(false)
    }
  }

  // ---- Workout plans + manual log + progress chart ----

  const [workoutLog, setWorkoutLog] = useState<WorkoutEntry[]>([])
  const [manualExercise, setManualExercise] = useState('')
  const [manualSets, setManualSets] = useState('')
  const [manualReps, setManualReps] = useState('')
  const [manualWeight, setManualWeight] = useState('')
  const [manualDuration, setManualDuration] = useState('')
  const [manualNote, setManualNote] = useState('')
  const [weightAvailable, setWeightAvailable] = useState(true)

  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [newPlanName, setNewPlanName] = useState('')
  const [newPlanExercises, setNewPlanExercises] = useState<PlanExercise[]>([])
  const [draftExerciseName, setDraftExerciseName] = useState('')
  const [draftExerciseSets, setDraftExerciseSets] = useState('')
  const [draftExerciseReps, setDraftExerciseReps] = useState('')
  const [draftExerciseWeight, setDraftExerciseWeight] = useState('')

  const [selectedProgressExercise, setSelectedProgressExercise] = useState('')

  useEffect(() => {
    loadWorkoutLog().then(setWorkoutLog)
    loadPlans().then(setPlans)
    getCurrentWeightKg().then(w => setWeightAvailable(w != null))
  }, [])

  const addManualWorkout = async () => {
    if (!manualExercise.trim()) return
    const sets = manualSets ? parseInt(manualSets, 10) : undefined
    const reps = manualReps ? parseInt(manualReps, 10) : undefined
    const weightKg = manualWeight ? parseFloat(manualWeight) : undefined
    const durationMin = manualDuration ? parseInt(manualDuration, 10) : undefined
    const validDuration = durationMin && !Number.isNaN(durationMin) ? durationMin : undefined
    const bodyWeightKg = await getCurrentWeightKg()
    const entry: WorkoutEntry = {
      id: Date.now().toString(),
      dateISO: new Date().toISOString(),
      exercise: manualExercise.trim(),
      source: 'manual',
      sets: sets && !Number.isNaN(sets) ? sets : undefined,
      reps: reps && !Number.isNaN(reps) ? reps : undefined,
      weightKg: weightKg && !Number.isNaN(weightKg) ? weightKg : undefined,
      durationMin: validDuration,
      estimatedCalories: validDuration && bodyWeightKg ? estimateWorkoutCalories(validDuration, bodyWeightKg) : undefined,
      note: manualNote.trim() || undefined,
    }
    const next = [entry, ...workoutLog]
    setWorkoutLog(next)
    await saveWorkoutLog(next)
    setManualExercise(''); setManualSets(''); setManualReps(''); setManualWeight(''); setManualDuration(''); setManualNote('')
  }

  const startPlanExercise = (ex: PlanExercise) => {
    setManualExercise(ex.name)
    setManualSets(ex.targetSets != null ? String(ex.targetSets) : '')
    setManualReps(ex.targetReps != null ? String(ex.targetReps) : '')
    setManualWeight(ex.targetWeightKg != null ? String(ex.targetWeightKg) : '')
  }

  const addExerciseToNewPlan = () => {
    if (!draftExerciseName.trim()) return
    const sets = draftExerciseSets ? parseInt(draftExerciseSets, 10) : undefined
    const reps = draftExerciseReps ? parseInt(draftExerciseReps, 10) : undefined
    const weightKg = draftExerciseWeight ? parseFloat(draftExerciseWeight) : undefined
    setNewPlanExercises(prev => [...prev, {
      id: Date.now().toString(),
      name: draftExerciseName.trim(),
      targetSets: sets && !Number.isNaN(sets) ? sets : undefined,
      targetReps: reps && !Number.isNaN(reps) ? reps : undefined,
      targetWeightKg: weightKg && !Number.isNaN(weightKg) ? weightKg : undefined,
    }])
    setDraftExerciseName(''); setDraftExerciseSets(''); setDraftExerciseReps(''); setDraftExerciseWeight('')
  }

  const removeExerciseFromNewPlan = (id: string) => setNewPlanExercises(prev => prev.filter(e => e.id !== id))

  const saveNewPlan = async () => {
    if (!newPlanName.trim() || newPlanExercises.length === 0) return
    const plan: WorkoutPlan = { id: Date.now().toString(), name: newPlanName.trim(), exercises: newPlanExercises }
    const next = [plan, ...plans]
    setPlans(next)
    await savePlans(next)
    setNewPlanName(''); setNewPlanExercises([]); setShowPlanForm(false)
  }

  const deletePlan = (id: string) => {
    Alert.alert(t('motion.deletePlanConfirm'), undefined, [
      { text: t('nutrition.cancel'), style: 'cancel' },
      { text: t('nutrition.delete'), style: 'destructive', onPress: async () => {
        const next = plans.filter(p => p.id !== id)
        setPlans(next)
        await savePlans(next)
      } },
    ])
  }

  const deleteWorkoutEntry = (id: string) => {
    Alert.alert(t('motion.deleteWorkoutConfirm'), undefined, [
      { text: t('nutrition.cancel'), style: 'cancel' },
      { text: t('nutrition.delete'), style: 'destructive', onPress: async () => {
        const next = workoutLog.filter(w => w.id !== id)
        setWorkoutLog(next)
        await saveWorkoutLog(next)
      } },
    ])
  }

  const distinctExercises = useMemo(
    () => Array.from(new Set(workoutLog.filter(w => w.weightKg != null).map(w => w.exercise))),
    [workoutLog]
  )
  useEffect(() => {
    if (!selectedProgressExercise && distinctExercises.length > 0) setSelectedProgressExercise(distinctExercises[0])
  }, [distinctExercises, selectedProgressExercise])

  const progressValues = useMemo(() => {
    if (!selectedProgressExercise) return []
    return workoutLog
      .filter(w => w.exercise === selectedProgressExercise && w.weightKg != null)
      .sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime())
      .map(w => w.weightKg as number)
  }, [workoutLog, selectedProgressExercise])

  const groupedWorkoutsByDay = useMemo(() => {
    const map = new Map<string, WorkoutEntry[]>()
    for (const entry of workoutLog) {
      const key = new Date(entry.dateISO).toDateString()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(entry)
    }
    return Array.from(map.entries())
  }, [workoutLog])

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar icon="🎯" title={t('motion.headerTitle')} accent={colors.blue} actions={<HeaderActions />} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>{t('motion.title')}</Text>
        <Text style={styles.sub}>{t('motion.subtitle')}</Text>

        {/* Tab switcher */}
        <View style={styles.tabBar}>
          {(['camera', 'upload'] as Tab[]).map(tb => (
            <TouchableOpacity
              key={tb}
              onPress={() => switchTab(tb)}
              style={[styles.tabBtn, tab === tb && styles.tabBtnActive]}
            >
              <Text style={[styles.tabBtnText, tab === tb && styles.tabBtnTextActive]}>
                {tb === 'camera' ? t('motion.tabCamera') : t('motion.tabUpload')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Exercise selector */}
        <Text style={styles.label}>{t('motion.exerciseLabel')}</Text>
        <ChipGroup
          options={EXERCISE_SLUGS.map(s => t(`motion.exercises.${s}`))}
          value={t(`motion.exercises.${exercise}`)}
          onChange={label => {
            const found = EXERCISE_SLUGS.find(s => t(`motion.exercises.${s}`) === label)
            if (found) setExercise(found)
          }}
          accent={colors.blue}
        />

        {/* Camera tab */}
        {tab === 'camera' && (
          <View style={styles.mediaCard}>
            {!image ? (
              permission?.granted ? (
                <>
                  <CameraView
                    ref={cameraRef}
                    style={styles.cameraPreview}
                    facing="back"
                    onCameraReady={() => setCameraReady(true)}
                  />
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.blue }]}
                    onPress={capturePhoto}
                    disabled={!cameraReady}
                  >
                    <Text style={styles.actionBtnText}>{t('motion.capture')}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.placeholder}>
                  <Text style={styles.placeholderIcon}>📷</Text>
                  <Text style={styles.placeholderText}>{mapCameraError()}</Text>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.blue }]} onPress={requestPermission}>
                    <Text style={styles.actionBtnText}>{t('motion.startCamera')}</Text>
                  </TouchableOpacity>
                </View>
              )
            ) : (
              <>
                <Image source={{ uri: image.uri }} style={styles.previewImg} contentFit="cover" />
                <View style={styles.row}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setImage(null); setAnalysis('') }}>
                    <Text style={styles.secondaryBtnText}>{t('motion.retake')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.flex1, { backgroundColor: colors.blue }]}
                    onPress={analyzeForm}
                    disabled={isAnalyzing}
                  >
                    <Text style={styles.actionBtnText}>{isAnalyzing ? t('motion.analyzing') : t('motion.analyzeForm')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        {/* Upload tab */}
        {tab === 'upload' && (
          <View style={styles.mediaCard}>
            {!image && !videoUri && (
              <TouchableOpacity style={styles.placeholder} onPress={pickFromLibrary}>
                <Text style={styles.placeholderIcon}>📁</Text>
                <Text style={styles.placeholderText}>{t('motion.uploadClickText')}</Text>
                <Text style={styles.placeholderSubtext}>{t('motion.uploadHelpText')}</Text>
              </TouchableOpacity>
            )}

            {videoUri && (
              <>
                <VideoView player={player} style={styles.previewImg} contentFit="cover" nativeControls={false} />
                <View style={{ paddingHorizontal: spacing.md }}>
                  <Text style={styles.placeholderSubtext}>{t('motion.videoScrubHint')}</Text>
                  <Slider
                    minimumValue={0}
                    maximumValue={videoDuration || 1}
                    value={scrubSeconds}
                    onValueChange={v => {
                      setScrubSeconds(v)
                      player.currentTime = v
                    }}
                    minimumTrackTintColor={colors.blue}
                    thumbTintColor={colors.blue}
                  />
                </View>
                <View style={styles.row}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setVideoUri(null); setAnalysis('') }}>
                    <Text style={styles.secondaryBtnText}>{t('motion.changeVideo')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.flex1, { backgroundColor: colors.blue }]} onPress={useThisFrame}>
                    <Text style={styles.actionBtnText}>{t('motion.useThisFrame')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {image && !videoUri && (
              <>
                <Image source={{ uri: image.uri }} style={styles.previewImg} contentFit="cover" />
                <View style={styles.row}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setImage(null); setAnalysis('') }}>
                    <Text style={styles.secondaryBtnText}>{t('motion.remove')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.flex1, { backgroundColor: colors.blue }]}
                    onPress={analyzeForm}
                    disabled={isAnalyzing}
                  >
                    <Text style={styles.actionBtnText}>{isAnalyzing ? t('motion.analyzing') : t('motion.analyzeForm')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        {!image && !videoUri && (
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>{t('motion.tipsTitle')}</Text>
            <Text style={styles.tipsItem}>• {t('motion.tip1')}</Text>
            <Text style={styles.tipsItem}>• {t('motion.tip2')}</Text>
            <Text style={styles.tipsItem}>• {t('motion.tip3')}</Text>
            <Text style={styles.tipsItem}>• {t('motion.tip4Prefix')} {t(`motion.keyMoments.${exercise}`)}</Text>
            <PhotoAngleDiagram />
          </View>
        )}

        {/* Results */}
        <View style={styles.resultsCard}>
          {!analysis && !isAnalyzing && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎯</Text>
              <Text style={styles.emptyText}>{t('motion.resultsPlaceholder')}</Text>
            </View>
          )}
          {isAnalyzing && !analysis && (
            <View style={styles.emptyState}>
              <ActivityIndicator color={colors.blue} />
              <Text style={styles.emptyText}>{t('motion.analyzingResults')}</Text>
            </View>
          )}
          {analysis && (() => {
            // Honest AI: show a band, not a fake precise score, and label the cue as AI (upload path is not live).
            const score = isAnalyzing ? undefined : extractFormScore(analysis)
            const band = score == null ? null
              : score >= 8 ? { label: t('honest.bandSolid'), fill: 1 }
              : score >= 5 ? { label: t('honest.bandMixed'), fill: 0.62 }
              : { label: t('honest.bandNeedsWork'), fill: 0.3 }
            return (
              <View style={{ padding: spacing.lg }}>
                <View style={styles.honestHeader}>
                  <Text style={styles.resultsTitle}>{t('motion.resultsTitle')}</Text>
                  <View style={styles.aiChip}><Text style={styles.aiChipText}>{t('honest.aiCue')}</Text></View>
                </View>
                {band && (
                  <View style={styles.bandCard}>
                    <Text style={styles.bandLabel}>{t('honest.bandLabel')}</Text>
                    <Text style={styles.bandValue}>{band.label}</Text>
                    <View style={styles.bandTrack}>
                      <View style={[styles.bandFill, { width: `${Math.round(band.fill * 100)}%` }]} />
                    </View>
                    <Text style={styles.bandHint}>{t('honest.bandHint')}</Text>
                  </View>
                )}
                <MarkdownText text={analysis} accent={colors.blue} />
                {!isAnalyzing && (
                  <View style={styles.resultActions}>
                    <TouchableOpacity style={styles.resultBtnPrimary} onPress={analyzeForm} disabled={!image}>
                      <Text style={styles.resultBtnPrimaryText}>↻ {t('honest.reanalyze')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.resultBtn}
                      onPress={() => Share.share({ message: `${t('motion.resultsTitle')} (${t('honest.aiCue')})\n\n${analysis}` }).catch(() => {})}
                    >
                      <Text style={styles.resultBtnText}>↗ {t('honest.share')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )
          })()}
        </View>

        {/* Workout Plans */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('motion.plansTitle')}</Text>
          <TouchableOpacity onPress={() => setShowPlanForm(s => !s)}>
            <Text style={styles.linkText}>{showPlanForm ? t('motion.cancelPlanButton') : `+ ${t('motion.createPlanButton')}`}</Text>
          </TouchableOpacity>
        </View>

        {showPlanForm && (
          <View style={styles.card}>
            <TextInput
              value={newPlanName}
              onChangeText={setNewPlanName}
              placeholder={t('motion.planNamePlaceholder')}
              placeholderTextColor={colors.textFaint}
              style={styles.input}
            />
            {newPlanExercises.map(ex => (
              <View key={ex.id} style={styles.chipRow}>
                <Text style={styles.chipRowText}>
                  {ex.name}
                  {ex.targetSets != null && ex.targetReps != null ? ` · ${ex.targetSets}×${ex.targetReps}` : ''}
                  {ex.targetWeightKg != null ? ` · ${ex.targetWeightKg} kg` : ''}
                </Text>
                <TouchableOpacity onPress={() => removeExerciseFromNewPlan(ex.id)}><Text>✕</Text></TouchableOpacity>
              </View>
            ))}
            <View style={styles.grid4}>
              <TextInput value={draftExerciseName} onChangeText={setDraftExerciseName} placeholder={t('motion.exerciseNamePlaceholder')} placeholderTextColor={colors.textFaint} style={[styles.inputSmall, { flexBasis: '100%' }]} />
              <TextInput value={draftExerciseSets} onChangeText={setDraftExerciseSets} placeholder={t('motion.setsLabel')} placeholderTextColor={colors.textFaint} keyboardType="number-pad" style={styles.inputSmall} />
              <TextInput value={draftExerciseReps} onChangeText={setDraftExerciseReps} placeholder={t('motion.repsLabel')} placeholderTextColor={colors.textFaint} keyboardType="number-pad" style={styles.inputSmall} />
              <TextInput value={draftExerciseWeight} onChangeText={setDraftExerciseWeight} placeholder={t('motion.weightLabel')} placeholderTextColor={colors.textFaint} keyboardType="number-pad" style={styles.inputSmall} />
            </View>
            <TouchableOpacity onPress={addExerciseToNewPlan} disabled={!draftExerciseName.trim()}>
              <Text style={[styles.linkText, !draftExerciseName.trim() && { opacity: 0.4 }]}>+ {t('motion.addExerciseToPlan')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtnBlock, (!newPlanName.trim() || newPlanExercises.length === 0) && styles.btnDisabled]}
              onPress={saveNewPlan}
              disabled={!newPlanName.trim() || newPlanExercises.length === 0}
            >
              <Text style={styles.primaryBtnBlockText}>{t('motion.savePlanButton')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {plans.length === 0 && !showPlanForm ? (
          <Text style={styles.emptyHint}>{t('motion.noPlansYet')}</Text>
        ) : (
          plans.map(plan => (
            <View key={plan.id} style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.planName}>{plan.name}</Text>
                <TouchableOpacity onPress={() => deletePlan(plan.id)}><Text>🗑️</Text></TouchableOpacity>
              </View>
              {plan.exercises.map(ex => (
                <TouchableOpacity key={ex.id} style={styles.chipRow} onPress={() => startPlanExercise(ex)}>
                  <Text style={styles.chipRowText}>
                    {ex.name}
                    {ex.targetSets != null && ex.targetReps != null ? ` · ${ex.targetSets}×${ex.targetReps}` : ''}
                    {ex.targetWeightKg != null ? ` · ${ex.targetWeightKg} kg` : ''}
                  </Text>
                  <Text style={styles.linkText}>{t('motion.startPlanExercise')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}

        {/* Manual workout log */}
        <Text style={styles.sectionTitle}>{t('motion.logWorkoutTitle')}</Text>
        <View style={styles.card}>
          <TextInput value={manualExercise} onChangeText={setManualExercise} placeholder={t('motion.exerciseNamePlaceholder')} placeholderTextColor={colors.textFaint} style={styles.input} />
          <View style={styles.grid4}>
            <TextInput value={manualSets} onChangeText={setManualSets} placeholder={t('motion.setsLabel')} placeholderTextColor={colors.textFaint} keyboardType="number-pad" style={styles.inputSmall} />
            <TextInput value={manualReps} onChangeText={setManualReps} placeholder={t('motion.repsLabel')} placeholderTextColor={colors.textFaint} keyboardType="number-pad" style={styles.inputSmall} />
            <TextInput value={manualWeight} onChangeText={setManualWeight} placeholder={t('motion.weightLabel')} placeholderTextColor={colors.textFaint} keyboardType="number-pad" style={styles.inputSmall} />
            <TextInput value={manualDuration} onChangeText={setManualDuration} placeholder={t('motion.durationLabel')} placeholderTextColor={colors.textFaint} keyboardType="number-pad" style={styles.inputSmall} />
          </View>
          <TextInput value={manualNote} onChangeText={setManualNote} placeholder={t('motion.notePlaceholder')} placeholderTextColor={colors.textFaint} style={styles.input} />
          {!!manualDuration && !weightAvailable && <Text style={styles.warnText}>{t('motion.addWeightForCalories')}</Text>}
          <TouchableOpacity
            style={[styles.primaryBtnBlock, !manualExercise.trim() && styles.btnDisabled]}
            onPress={addManualWorkout}
            disabled={!manualExercise.trim()}
          >
            <Text style={styles.primaryBtnBlockText}>{t('motion.logWorkoutButton')}</Text>
          </TouchableOpacity>
        </View>

        {/* Workout history */}
        <Text style={styles.sectionTitle}>{t('motion.workoutHistoryTitle')}</Text>
        {groupedWorkoutsByDay.length === 0 ? (
          <Text style={styles.emptyHint}>{t('motion.noWorkoutsYet')}</Text>
        ) : (
          groupedWorkoutsByDay.map(([day, entries]) => {
            const dayCalories = entries.reduce((sum, e) => sum + (e.estimatedCalories || 0), 0)
            return (
              <View key={day} style={styles.card}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.dayLabel}>{day === new Date().toDateString() ? t('nutrition.today') : day}</Text>
                  {dayCalories > 0 && <Text style={styles.dayLabel}>🔥 ~{dayCalories} kcal</Text>}
                </View>
                {entries.map(entry => (
                  <View key={entry.id} style={styles.chipRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.chipRowText}>{entry.exercise}</Text>
                      <Text style={styles.chipRowMeta}>
                        {entry.source === 'motion'
                          ? entry.formScore != null ? `${t('profile.formScoreLabel')}: ${entry.formScore}/10` : t('motion.headerTitle')
                          : [
                              entry.sets != null && entry.reps != null ? `${entry.sets}×${entry.reps}` : null,
                              entry.weightKg != null ? `${entry.weightKg} kg` : null,
                              entry.durationMin != null ? `${entry.durationMin} min` : null,
                              entry.estimatedCalories != null ? `🔥 ~${entry.estimatedCalories} kcal` : null,
                              entry.note || null,
                            ].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteWorkoutEntry(entry.id)}><Text>🗑️</Text></TouchableOpacity>
                  </View>
                ))}
              </View>
            )
          })
        )}

        {/* Progress chart */}
        {distinctExercises.length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{t('motion.progressChartTitle')}</Text>
            </View>
            <ChipGroup options={distinctExercises} value={selectedProgressExercise} onChange={setSelectedProgressExercise} accent={colors.blue} />
            {progressValues.length >= 2 ? (
              <TrendChart values={progressValues} colorFrom="#60a5fa" colorTo="#38bdf8" gradientId="mobileExerciseProgress" />
            ) : (
              <Text style={styles.emptyHint}>{t('motion.noExerciseDataYet')}</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
    h1: { fontSize: 26, fontFamily: fonts.heading, color: colors.textPrimary },
    sub: { color: colors.textSecondary, fontSize: 14, marginBottom: spacing.sm },
    label: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginTop: spacing.sm, marginBottom: 4 },

    tabBar: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.lg, padding: 4, borderWidth: 1, borderColor: colors.border },
    tabBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center' },
    tabBtnActive: { backgroundColor: colors.borderLight },
    tabBtnText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
    tabBtnTextActive: { color: '#fff' },

    mediaCard: { borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    cameraPreview: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.bg },
    previewImg: { width: '100%', aspectRatio: 16 / 9 },
    placeholder: { aspectRatio: 16 / 9, alignItems: 'center', justifyContent: 'center', gap: 8, padding: spacing.lg },
    placeholderIcon: { fontSize: 40 },
    placeholderText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
    placeholderSubtext: { color: colors.textFaint, fontSize: 11 },

    row: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
    flex1: { flex: 1 },
    actionBtn: { paddingVertical: 12, borderRadius: radius.md, alignItems: 'center', margin: spacing.md },
    actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    secondaryBtn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: radius.md, backgroundColor: colors.borderLight, alignItems: 'center' },
    secondaryBtnText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },

    tipsCard: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
    tipsTitle: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 6 },
    tipsItem: { color: colors.textMuted, fontSize: 12, marginBottom: 2 },

    resultsCard: { minHeight: 220, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
    emptyState: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 10 },
    emptyIcon: { fontSize: 34 },
    emptyText: { color: colors.textMuted, fontSize: 13 },
    resultsTitle: { color: colors.textPrimary, fontFamily: fonts.heading, fontSize: 18, marginBottom: spacing.md },
    honestHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
    aiChip: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: radius.full, backgroundColor: colors.sageSoft },
    aiChipText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.olive },
    bandCard: { backgroundColor: colors.cardAlt, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, gap: 4 },
    bandLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
    bandValue: { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary },
    bandTrack: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden', marginTop: 4 },
    bandFill: { height: '100%', borderRadius: 4, backgroundColor: colors.leaf },
    bandHint: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
    resultActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
    resultBtnPrimary: { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' },
    resultBtnPrimaryText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.onPrimary },
    resultBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center' },
    resultBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },

    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
    linkText: { color: colors.blue, fontSize: 12, fontWeight: '600' },
    emptyHint: { color: colors.textFaint, fontSize: 12 },

    card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
    input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12, color: colors.textPrimary, fontSize: 14 },
    grid4: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    inputSmall: { flexBasis: '31%', flexGrow: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: 10, color: colors.textPrimary, fontSize: 12 },
    warnText: { color: colors.amber, fontSize: 11 },

    primaryBtnBlock: { backgroundColor: colors.blue, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center' },
    primaryBtnBlockText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    btnDisabled: { opacity: 0.4 },

    chipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.cardAlt, borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: 10 },
    chipRowText: { color: colors.textSecondary, fontSize: 12 },
    chipRowMeta: { color: colors.textFaint, fontSize: 11, marginTop: 2 },
    planName: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
    dayLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  })
}
