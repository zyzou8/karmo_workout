import AsyncStorage from '@react-native-async-storage/async-storage'

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

export async function loadPlans(): Promise<WorkoutPlan[]> {
  try {
    const saved = await AsyncStorage.getItem(PLANS_KEY)
    return saved ? (JSON.parse(saved) as WorkoutPlan[]) : []
  } catch {
    return []
  }
}

export async function savePlans(plans: WorkoutPlan[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PLANS_KEY, JSON.stringify(plans))
  } catch {
    // best-effort persistence; ignore write failures
  }
}
