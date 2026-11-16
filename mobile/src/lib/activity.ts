import { loadNutritionLog } from './nutrition'
import { loadWorkoutLog, WorkoutEntry } from './workoutLog'
import { loadMeasurements, MeasurementEntry } from './profile'

interface ActivityMeal {
  id: string
  title: string
  dateISO: string
  timestamp: string
}

export interface DayActivity {
  workouts: WorkoutEntry[]
  meals: ActivityMeal[]
  measurement?: MeasurementEntry
}

function dayKey(dateISO: string): string {
  return new Date(dateISO).toDateString()
}

export async function getActivityByDate(): Promise<Map<string, DayActivity>> {
  const map = new Map<string, DayActivity>()

  const getOrCreate = (key: string): DayActivity => {
    let entry = map.get(key)
    if (!entry) {
      entry = { workouts: [], meals: [] }
      map.set(key, entry)
    }
    return entry
  }

  const [workouts, meals, measurements] = await Promise.all([
    loadWorkoutLog(),
    loadNutritionLog(),
    loadMeasurements(),
  ])

  for (const workout of workouts) {
    getOrCreate(dayKey(workout.dateISO)).workouts.push(workout)
  }
  for (const meal of meals) {
    getOrCreate(dayKey(meal.dateISO)).meals.push(meal)
  }
  for (const measurement of measurements) {
    getOrCreate(dayKey(measurement.dateISO)).measurement = measurement
  }

  return map
}
