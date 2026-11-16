'use client'

import { PageHeader, AiLabel } from '@/components/PageHeader'
import { useState, useRef, useCallback, useEffect, useMemo, ChangeEvent } from 'react'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { CollapsibleAIResponse } from '@/components/CollapsibleAIResponse'
import { DICTIONARIES } from '@/lib/i18n/translations'
import { streamAnalysis, StreamError } from '@/lib/api'
import { loadWorkoutLog, saveWorkoutLog, extractFormScore, estimateWorkoutCalories, WorkoutEntry } from '@/lib/workoutLog'
import { loadPlans, savePlans, WorkoutPlan, PlanExercise } from '@/lib/workoutPlans'
import { getCurrentWeightKg } from '@/lib/profile'
import { PhotoAngleDiagram } from '@/components/PhotoAngleDiagram'
import { TrendChart } from '@/components/TrendChart'
import { useVideoFormAnalysis, VideoInputPanel, VideoResultsPanel } from '@/components/VideoFormAnalysis'
import { scoreBand } from '@/components/VideoAnalysisFigures'

const EXERCISE_SLUGS = [
  'squat', 'deadlift', 'benchPress', 'overheadPress',
  'barbellRow', 'pullup', 'pushup', 'lunge',
  'romanianDeadlift', 'hipThrust', 'plank', 'running',
  'yoga', 'other',
] as const

type ExerciseSlug = typeof EXERCISE_SLUGS[number]
type Tab = 'camera' | 'upload' | 'video'

function captureFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<{ file: File; url: string } | null> {
  return new Promise((resolve) => {
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) { resolve(null); return }
        const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' })
        resolve({ file, url: URL.createObjectURL(blob) })
      },
      'image/jpeg',
      0.9,
    )
  })
}

export default function MotionPage() {
  const { t, locale } = useTranslation()
  const [tab, setTab] = useState<Tab>('video')
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null)
  const [exercise, setExercise] = useState<ExerciseSlug>('squat')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState('')
  const [cameraError, setCameraError] = useState('')

  const [workoutLog, setWorkoutLog] = useState<WorkoutEntry[]>([])
  const [manualExercise, setManualExercise] = useState('')
  const [manualSets, setManualSets] = useState('')
  const [manualReps, setManualReps] = useState('')
  const [manualWeight, setManualWeight] = useState('')
  const [manualDuration, setManualDuration] = useState('')
  const [manualNote, setManualNote] = useState('')

  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [newPlanName, setNewPlanName] = useState('')
  const [newPlanExercises, setNewPlanExercises] = useState<PlanExercise[]>([])
  const [draftExerciseName, setDraftExerciseName] = useState('')
  const [draftExerciseSets, setDraftExerciseSets] = useState('')
  const [draftExerciseReps, setDraftExerciseReps] = useState('')
  const [draftExerciseWeight, setDraftExerciseWeight] = useState('')

  const [selectedProgressExercise, setSelectedProgressExercise] = useState('')

  const logFormRef = useRef<HTMLDivElement>(null)

  const video = useVideoFormAnalysis({
    exerciseEn: DICTIONARIES.en.motion.exercises[exercise],
    locale,
    onAnalyzed: formScore => {
      const entry: WorkoutEntry = {
        id: Date.now().toString(),
        dateISO: new Date().toISOString(),
        exercise: t(`motion.exercises.${exercise}`),
        source: 'motion',
        formScore,
      }
      setWorkoutLog(prev => {
        const next = [entry, ...prev]
        saveWorkoutLog(next)
        return next
      })
    },
  })

  useEffect(() => {
    setWorkoutLog(loadWorkoutLog())
    setPlans(loadPlans())
  }, [])

  const addManualWorkout = () => {
    if (!manualExercise.trim()) return
    const sets = manualSets ? parseInt(manualSets, 10) : undefined
    const reps = manualReps ? parseInt(manualReps, 10) : undefined
    const weightKg = manualWeight ? parseFloat(manualWeight) : undefined
    const durationMin = manualDuration ? parseInt(manualDuration, 10) : undefined
    const validDuration = durationMin && !Number.isNaN(durationMin) ? durationMin : undefined
    const bodyWeightKg = getCurrentWeightKg()
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
    saveWorkoutLog(next)
    setManualExercise('')
    setManualSets('')
    setManualReps('')
    setManualWeight('')
    setManualDuration('')
    setManualNote('')
  }

  const startPlanExercise = (ex: PlanExercise) => {
    setManualExercise(ex.name)
    setManualSets(ex.targetSets != null ? String(ex.targetSets) : '')
    setManualReps(ex.targetReps != null ? String(ex.targetReps) : '')
    setManualWeight(ex.targetWeightKg != null ? String(ex.targetWeightKg) : '')
    logFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
    setDraftExerciseName('')
    setDraftExerciseSets('')
    setDraftExerciseReps('')
    setDraftExerciseWeight('')
  }

  const removeExerciseFromNewPlan = (id: string) => {
    setNewPlanExercises(prev => prev.filter(e => e.id !== id))
  }

  const saveNewPlan = () => {
    if (!newPlanName.trim() || newPlanExercises.length === 0) return
    const plan: WorkoutPlan = { id: Date.now().toString(), name: newPlanName.trim(), exercises: newPlanExercises }
    const next = [plan, ...plans]
    setPlans(next)
    savePlans(next)
    setNewPlanName('')
    setNewPlanExercises([])
    setShowPlanForm(false)
  }

  const deletePlan = (id: string) => {
    if (!confirm(t('motion.deletePlanConfirm'))) return
    const next = plans.filter(p => p.id !== id)
    setPlans(next)
    savePlans(next)
  }

  const deleteWorkoutEntry = (id: string) => {
    if (!confirm(t('motion.deleteWorkoutConfirm'))) return
    const next = workoutLog.filter(w => w.id !== id)
    setWorkoutLog(next)
    saveWorkoutLog(next)
  }

  const distinctExercises = useMemo(
    () => Array.from(new Set(workoutLog.filter(w => w.weightKg != null).map(w => w.exercise))),
    [workoutLog]
  )

  useEffect(() => {
    if (!selectedProgressExercise && distinctExercises.length > 0) {
      setSelectedProgressExercise(distinctExercises[0])
    }
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

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const uploadVideoRef = useRef<HTMLVideoElement>(null)
  const uploadCanvasRef = useRef<HTMLCanvasElement>(null)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setIsCameraOn(false)
  }, [])

  const mapCameraError = (err: unknown): string => {
    const name = err instanceof DOMException ? err.name : ''
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return t('motion.cameraErrorNotAllowed')
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return t('motion.cameraErrorNotFound')
    if (name === 'NotReadableError' || name === 'TrackStartError') return t('motion.cameraErrorNotReadable')
    return t('motion.cameraErrorGeneric')
  }

  const startCamera = async () => {
    setCameraError('')

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(t('motion.cameraErrorInsecure'))
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCameraOn(true)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'OverconstrainedError') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true })
          streamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            setIsCameraOn(true)
          }
          return
        } catch (err2) {
          setCameraError(mapCameraError(err2))
          return
        }
      }
      setCameraError(mapCameraError(err))
    }
  }

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return
    const result = await captureFrame(videoRef.current, canvasRef.current)
    if (!result) return
    setCapturedFile(result.file)
    setCapturedImage(result.url)
    stopCamera()
  }

  const useThisFrame = async () => {
    if (!uploadVideoRef.current || !uploadCanvasRef.current) return
    const result = await captureFrame(uploadVideoRef.current, uploadCanvasRef.current)
    if (!result) return
    setUploadedFile(result.file)
    setUploadedImage(result.url)
    setUploadedVideoUrl(null)
    setAnalysis('')
  }

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

    if (validImageTypes.includes(file.type)) {
      setUploadedFile(file)
      setUploadedImage(URL.createObjectURL(file))
      setUploadedVideoUrl(null)
      setAnalysis('')
      return
    }

    if (file.type.startsWith('video/')) {
      setUploadedVideoUrl(URL.createObjectURL(file))
      setUploadedFile(null)
      setUploadedImage(null)
      setAnalysis('')
      return
    }

    alert(t('motion.invalidFileType'))
  }

  const currentImage = tab === 'camera' ? capturedImage : uploadedImage
  const currentFile = tab === 'camera' ? capturedFile : uploadedFile

  const mapStreamError = (err: unknown): string => {
    if (err instanceof StreamError) {
      if (err.kind === 'network') return t('errors.network')
      if (err.kind === 'timeout') return t('errors.timeout')
      return err.message || t('errors.generic')
    }
    return err instanceof Error ? err.message : t('errors.generic')
  }

  const analyzeForm = async () => {
    if (!currentFile) return
    setIsAnalyzing(true)
    setAnalysis('')

    try {
      const formData = new FormData()
      formData.append('image', currentFile)
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
      const nextWorkoutLog = [entry, ...workoutLog]
      saveWorkoutLog(nextWorkoutLog)
      setWorkoutLog(nextWorkoutLog)
    } catch (err) {
      setAnalysis('Error: ' + mapStreamError(err))
    } finally {
      setIsAnalyzing(false)
    }
  }

  const reset = () => {
    setCapturedImage(null)
    setCapturedFile(null)
    setUploadedImage(null)
    setUploadedFile(null)
    setUploadedVideoUrl(null)
    setAnalysis('')
    stopCamera()
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageHeader title={t('motion.headerTitle')} back={{ href: '/train', label: t('tabs.train') }} />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('motion.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('motion.subtitle')}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="space-y-4">
            {/* Tab switcher */}
            <div className="flex bg-white dark:bg-gray-900 rounded-xl p-1 border border-gray-200 dark:border-gray-800">
              {(['video', 'camera', 'upload'] as Tab[]).map(tb => (
                <button
                  key={tb}
                  onClick={() => { setTab(tb); reset(); video.resetAll() }}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    tab === tb
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {tb === 'video' ? t('videoAnalysis.tab') : tb === 'camera' ? t('motion.tabCamera') : t('motion.tabUpload')}
                </button>
              ))}
            </div>

            {/* Exercise selector */}
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('motion.exerciseLabel')}</label>
              <select
                value={exercise}
                onChange={e => setExercise(e.target.value as ExerciseSlug)}
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                {EXERCISE_SLUGS.map(slug => (
                  <option key={slug} value={slug}>{t(`motion.exercises.${slug}`)}</option>
                ))}
              </select>
            </div>

            {/* Video analysis tab */}
            {tab === 'video' && <VideoInputPanel va={video} />}

            {/* Camera tab */}
            {tab === 'camera' && (
              <div className="rounded-xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                {!capturedImage ? (
                  <div>
                    <div className="aspect-video bg-gray-50 dark:bg-gray-950 relative">
                      {isCameraOn ? (
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-gray-500">
                          <div className="text-5xl">📷</div>
                          <p className="text-sm">{t('motion.cameraPreviewPlaceholder')}</p>
                          {cameraError && (
                            <p className="text-red-400 text-xs text-center px-4">{cameraError}</p>
                          )}
                        </div>
                      )}
                      <canvas ref={canvasRef} className="hidden" />
                    </div>
                    <div className="p-4 flex gap-3">
                      {!isCameraOn ? (
                        <button
                          onClick={startCamera}
                          className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors"
                        >
                          {t('motion.startCamera')}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={capturePhoto}
                            className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors"
                          >
                            {t('motion.capture')}
                          </button>
                          <button
                            onClick={stopCamera}
                            className="py-2.5 px-4 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm transition-colors"
                          >
                            {t('motion.cancel')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <img src={capturedImage} alt="Captured" className="w-full aspect-video object-cover" />
                    <div className="p-4 flex gap-3">
                      <button
                        onClick={() => { setCapturedImage(null); setCapturedFile(null); setAnalysis('') }}
                        className="py-2.5 px-4 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm transition-colors"
                      >
                        {t('motion.retake')}
                      </button>
                      <button
                        onClick={analyzeForm}
                        disabled={isAnalyzing}
                        className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
                      >
                        {isAnalyzing ? t('motion.analyzing') : t('motion.analyzeForm')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Upload tab */}
            {tab === 'upload' && (
              <div>
                {!uploadedImage && !uploadedVideoUrl && (
                  <label className="block rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 transition-colors cursor-pointer">
                    <div className="aspect-video flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
                      <div className="text-5xl">📁</div>
                      <div className="text-center">
                        <p className="text-sm font-medium">{t('motion.uploadClickText')}</p>
                        <p className="text-xs mt-1">{t('motion.uploadHelpText')}</p>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}

                {uploadedVideoUrl && (
                  <div className="rounded-xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                    <div className="aspect-video bg-black">
                      <video
                        ref={uploadVideoRef}
                        src={uploadedVideoUrl}
                        controls
                        playsInline
                        className="w-full h-full"
                      />
                      <canvas ref={uploadCanvasRef} className="hidden" />
                    </div>
                    <div className="p-4 space-y-3">
                      <p className="text-xs text-gray-500">{t('motion.videoScrubHint')}</p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setUploadedVideoUrl(null)}
                          className="py-2.5 px-4 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm transition-colors"
                        >
                          {t('motion.changeVideo')}
                        </button>
                        <button
                          onClick={useThisFrame}
                          className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors"
                        >
                          {t('motion.useThisFrame')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {uploadedImage && (
                  <div className="rounded-xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                    <img src={uploadedImage} alt="Uploaded" className="w-full aspect-video object-cover" />
                    <div className="p-4 flex gap-3">
                      <button
                        onClick={() => { setUploadedImage(null); setUploadedFile(null); setAnalysis('') }}
                        className="py-2.5 px-4 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm transition-colors"
                      >
                        {t('motion.remove')}
                      </button>
                      <button
                        onClick={analyzeForm}
                        disabled={isAnalyzing}
                        className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
                      >
                        {isAnalyzing ? t('motion.analyzing') : t('motion.analyzeForm')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tips */}
            {tab !== 'video' && !currentImage && !uploadedVideoUrl && (
              <div className="rounded-xl bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t('motion.tipsTitle')}</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• {t('motion.tip1')}</li>
                  <li>• {t('motion.tip2')}</li>
                  <li>• {t('motion.tip3')}</li>
                  <li>• {t('motion.tip4Prefix')} {t(`motion.keyMoments.${exercise}`)}</li>
                </ul>
                <PhotoAngleDiagram />
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div>
            {tab === 'video' ? <VideoResultsPanel va={video} /> : (
            <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm shadow-gray-200/60 dark:shadow-none min-h-64">
              {!analysis && !isAnalyzing && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-600">
                  <div className="text-4xl mb-3">🎯</div>
                  <p className="text-sm">{t('motion.resultsPlaceholder')}</p>
                </div>
              )}

              {isAnalyzing && !analysis && (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('motion.analyzingResults')}</p>
                </div>
              )}

              {analysis && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{t('motion.resultsTitle')}</h3>
                      <AiLabel>{t('honest.aiCue')}</AiLabel>
                    </div>
                    {isAnalyzing && (
                      <div className="flex items-center gap-2 text-xs text-blue-400">
                        <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                        {t('motion.generating')}
                      </div>
                    )}
                  </div>
                  <CollapsibleAIResponse
                    text={analysis}
                    className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed streaming-text"
                  />
                </div>
              )}
            </div>
            )}
          </div>
        </div>

        {/* Workout Plans */}
        <div id="plans" className="mt-10 scroll-mt-24">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('motion.plansTitle')}</p>
            <button
              onClick={() => setShowPlanForm(s => !s)}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              {showPlanForm ? t('motion.cancelPlanButton') : `+ ${t('motion.createPlanButton')}`}
            </button>
          </div>

          {showPlanForm && (
            <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm shadow-gray-200/60 dark:shadow-none p-4 space-y-3 mb-4">
              <input
                type="text"
                value={newPlanName}
                onChange={e => setNewPlanName(e.target.value)}
                placeholder={t('motion.planNamePlaceholder')}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:border-blue-500 transition-colors"
              />

              {newPlanExercises.length > 0 && (
                <div className="space-y-1.5">
                  {newPlanExercises.map(ex => (
                    <div key={ex.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs">
                      <span className="text-gray-700 dark:text-gray-300">
                        {ex.name}
                        {ex.targetSets != null && ex.targetReps != null ? ` · ${ex.targetSets}×${ex.targetReps}` : ''}
                        {ex.targetWeightKg != null ? ` · ${ex.targetWeightKg} kg` : ''}
                      </span>
                      <button onClick={() => removeExerciseFromNewPlan(ex.id)} className="text-gray-500 hover:text-red-400 transition-colors">✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-4 gap-2">
                <input
                  type="text"
                  value={draftExerciseName}
                  onChange={e => setDraftExerciseName(e.target.value)}
                  placeholder={t('motion.exerciseNamePlaceholder')}
                  className="col-span-4 sm:col-span-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-900 dark:text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
                />
                <input
                  type="number"
                  value={draftExerciseSets}
                  onChange={e => setDraftExerciseSets(e.target.value)}
                  placeholder={t('motion.setsLabel')}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-900 dark:text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
                />
                <input
                  type="number"
                  value={draftExerciseReps}
                  onChange={e => setDraftExerciseReps(e.target.value)}
                  placeholder={t('motion.repsLabel')}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-900 dark:text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
                />
                <input
                  type="number"
                  value={draftExerciseWeight}
                  onChange={e => setDraftExerciseWeight(e.target.value)}
                  placeholder={t('motion.weightLabel')}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-900 dark:text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <button
                onClick={addExerciseToNewPlan}
                disabled={!draftExerciseName.trim()}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                + {t('motion.addExerciseToPlan')}
              </button>

              <button
                onClick={saveNewPlan}
                disabled={!newPlanName.trim() || newPlanExercises.length === 0}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {t('motion.savePlanButton')}
              </button>
            </div>
          )}

          {plans.length === 0 && !showPlanForm ? (
            <p className="text-xs text-gray-400 dark:text-gray-600">{t('motion.noPlansYet')}</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {plans.map(plan => (
                <div key={plan.id} className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm shadow-gray-200/60 dark:shadow-none p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{plan.name}</p>
                    <button onClick={() => deletePlan(plan.id)} className="text-gray-500 hover:text-red-400 transition-colors text-xs">🗑️</button>
                  </div>
                  <div className="space-y-1">
                    {plan.exercises.map(ex => (
                      <button
                        key={ex.id}
                        onClick={() => startPlanExercise(ex)}
                        className="w-full flex items-center justify-between gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1.5 text-xs transition-colors text-left"
                      >
                        <span className="text-gray-700 dark:text-gray-300">
                          {ex.name}
                          {ex.targetSets != null && ex.targetReps != null ? ` · ${ex.targetSets}×${ex.targetReps}` : ''}
                          {ex.targetWeightKg != null ? ` · ${ex.targetWeightKg} kg` : ''}
                        </span>
                        <span className="text-blue-600 dark:text-blue-400 shrink-0">{t('motion.startPlanExercise')}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Manual Workout Log */}
        <div ref={logFormRef} className="mt-10 grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm shadow-gray-200/60 dark:shadow-none p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('motion.logWorkoutTitle')}</p>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('motion.exerciseNameLabel')}</label>
                <input
                  type="text"
                  value={manualExercise}
                  onChange={e => setManualExercise(e.target.value)}
                  placeholder={t('motion.exerciseNamePlaceholder')}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('motion.setsLabel')}</label>
                  <input
                    type="number"
                    value={manualSets}
                    onChange={e => setManualSets(e.target.value)}
                    placeholder="3"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('motion.repsLabel')}</label>
                  <input
                    type="number"
                    value={manualReps}
                    onChange={e => setManualReps(e.target.value)}
                    placeholder="10"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('motion.weightLabel')}</label>
                  <input
                    type="number"
                    value={manualWeight}
                    onChange={e => setManualWeight(e.target.value)}
                    placeholder="60"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('motion.durationLabel')}</label>
                  <input
                    type="number"
                    value={manualDuration}
                    onChange={e => setManualDuration(e.target.value)}
                    placeholder="30"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('motion.noteLabel')}</label>
                  <input
                    type="text"
                    value={manualNote}
                    onChange={e => setManualNote(e.target.value)}
                    placeholder={t('motion.notePlaceholder')}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
              {manualDuration && !getCurrentWeightKg() && (
                <p className="text-xs text-amber-500 dark:text-amber-400">{t('motion.addWeightForCalories')}</p>
              )}
              <button
                onClick={addManualWorkout}
                disabled={!manualExercise.trim()}
                className="w-full py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-blue-600 dark:text-blue-300 text-sm font-medium transition-colors"
              >
                {t('motion.logWorkoutButton')}
              </button>
            </div>
          </div>

          <div className="lg:col-span-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('motion.workoutHistoryTitle')}</p>
            {groupedWorkoutsByDay.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-600">{t('motion.noWorkoutsYet')}</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {groupedWorkoutsByDay.map(([day, entries]) => {
                  const dayCalories = entries.reduce((sum, e) => sum + (e.estimatedCalories || 0), 0)
                  return (
                    <div key={day} className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm shadow-gray-200/60 dark:shadow-none p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-gray-500">{day === new Date().toDateString() ? t('nutrition.today') : day}</p>
                        {dayCalories > 0 && <p className="text-xs text-gray-400 dark:text-gray-600">🔥 ~{dayCalories} kcal</p>}
                      </div>
                      <div className="space-y-1.5">
                        {entries.map(entry => (
                          <div key={entry.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 text-xs">
                            <div className="min-w-0">
                              <span className="text-gray-900 dark:text-white font-medium">{entry.exercise}</span>
                              <span className="text-gray-500 ml-2">
                                {entry.source === 'motion'
                                  ? entry.formScore != null ? `${t('honest.confidenceBand')}: ${t(`honest.${scoreBand(entry.formScore)}`)}` : t('motion.headerTitle')
                                  : [
                                      entry.sets != null && entry.reps != null ? `${entry.sets}×${entry.reps}` : null,
                                      entry.weightKg != null ? `${entry.weightKg} kg` : null,
                                      entry.durationMin != null ? `${entry.durationMin} min` : null,
                                      entry.estimatedCalories != null ? `🔥 ~${entry.estimatedCalories} kcal` : null,
                                      entry.note || null,
                                    ].filter(Boolean).join(' · ')}
                              </span>
                            </div>
                            <button
                              onClick={() => deleteWorkoutEntry(entry.id)}
                              title={t('nutrition.delete')}
                              className="w-6 h-6 shrink-0 flex items-center justify-center rounded text-gray-500 hover:text-red-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Progress Chart */}
        {distinctExercises.length > 0 && (
          <div className="mt-10 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm shadow-gray-200/60 dark:shadow-none p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('motion.progressChartTitle')}</p>
              <select
                value={selectedProgressExercise}
                onChange={e => setSelectedProgressExercise(e.target.value)}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-gray-900 dark:text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
              >
                {distinctExercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
              </select>
            </div>
            {progressValues.length >= 2 ? (
              <TrendChart values={progressValues} colorFrom="#60a5fa" colorTo="#38bdf8" gradientId="exerciseProgressGradient" />
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-600">{t('motion.noExerciseDataYet')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
