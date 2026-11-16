import { loadWorkoutLog } from './workoutLog'
import { loadMeasurements, loadProfile } from './profile'
import { loadNutritionLog, loadNutritionTarget } from './nutrition'
import { BodySummary, computeBodySummary } from './bodySummaryCore'

export * from './bodySummaryCore'

/** Builds the last-7-days summary from everything stored on this device. */
export async function buildBodySummary(now = new Date()): Promise<BodySummary> {
  const [profile, workouts, measurements, meals, nutritionTarget] = await Promise.all([
    loadProfile(),
    loadWorkoutLog(),
    loadMeasurements(),
    loadNutritionLog(),
    loadNutritionTarget(),
  ])
  return computeBodySummary({
    workouts,
    measurements,
    meals,
    nutritionTarget,
    profileWeightKg: profile.weightKg,
    daysPerWeek: profile.daysPerWeek,
  }, now)
}
