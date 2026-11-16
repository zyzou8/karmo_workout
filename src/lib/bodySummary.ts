import { loadWorkoutLog } from '@/lib/workoutLog'
import { loadMeasurements, loadProfile } from '@/lib/profile'
import { NUTRITION_LOG_KEY, NUTRITION_TARGET_KEY } from '@/lib/nutrition'
import { BodySummary, BodySummaryInput, computeBodySummary } from './bodySummaryCore'

export * from './bodySummaryCore'

function readJSON<T>(key: string): T | null {
  try {
    const saved = localStorage.getItem(key)
    if (saved) return JSON.parse(saved) as T
  } catch {}
  return null
}

/** Builds the last-7-days summary from everything stored in this browser. */
export function buildBodySummary(now = new Date()): BodySummary {
  const profile = loadProfile()
  return computeBodySummary({
    workouts: loadWorkoutLog(),
    measurements: loadMeasurements(),
    meals: readJSON<BodySummaryInput['meals']>(NUTRITION_LOG_KEY) ?? [],
    nutritionTarget: readJSON<BodySummaryInput['nutritionTarget']>(NUTRITION_TARGET_KEY),
    profileWeightKg: profile.weightKg,
    daysPerWeek: profile.daysPerWeek,
  }, now)
}
