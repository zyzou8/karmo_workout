import { NUTRITION_LOG_KEY } from '@/lib/nutrition'
import { loadWorkoutLog, WorkoutEntry } from '@/lib/workoutLog'
import { loadMeasurements, MeasurementEntry } from '@/lib/profile'

interface NutritionLogEntry {
  id: string
  title: string
  dateISO: string
  timestamp: string
}

export interface DayActivity {
  workouts: WorkoutEntry[]
  meals: NutritionLogEntry[]
  measurement?: MeasurementEntry
}

function loadNutritionLog(): NutritionLogEntry[] {
  try {
    const saved = localStorage.getItem(NUTRITION_LOG_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return []
}

function dayKey(dateISO: string): string {
  return new Date(dateISO).toDateString()
}

export function getActivityByDate(): Map<string, DayActivity> {
  const map = new Map<string, DayActivity>()

  const getOrCreate = (key: string): DayActivity => {
    let entry = map.get(key)
    if (!entry) {
      entry = { workouts: [], meals: [] }
      map.set(key, entry)
    }
    return entry
  }

  for (const workout of loadWorkoutLog()) {
    getOrCreate(dayKey(workout.dateISO)).workouts.push(workout)
  }
  for (const meal of loadNutritionLog()) {
    getOrCreate(dayKey(meal.dateISO)).meals.push(meal)
  }
  for (const measurement of loadMeasurements()) {
    getOrCreate(dayKey(measurement.dateISO)).measurement = measurement
  }

  return map
}
