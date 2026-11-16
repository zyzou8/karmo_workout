export interface PlanExercise {
  id: string
  name: string
  targetSets?: number
  targetReps?: number
  targetWeightKg?: number
}

export interface WorkoutPlan {
  id: string
  name: string
  exercises: PlanExercise[]
}

const PLANS_KEY = 'karmo_workout_plans'

export function loadPlans(): WorkoutPlan[] {
  try {
    const saved = localStorage.getItem(PLANS_KEY)
    if (saved) return JSON.parse(saved)
  } catch {
    console.warn('karmo: failed to parse saved workout plans, resetting')
  }
  return []
}

export function savePlans(plans: WorkoutPlan[]) {
  try {
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans))
  } catch {}
}
