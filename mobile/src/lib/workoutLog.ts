import AsyncStorage from '@react-native-async-storage/async-storage'

export interface WorkoutEntry {
  id: string
  dateISO: string
  exercise: string
  source: 'motion' | 'manual'
  formScore?: number
  sets?: number
  reps?: number
  weightKg?: number
  durationMin?: number
  estimatedCalories?: number
  note?: string
  /** Per-set detail from the Setline-style workout log (weights stored in kg). */
  setDetails?: SetDetail[]
  remarks?: string
  bodyPart?: string
}

export interface SetDetail {
  reps: number
  weightKg: number
}

/** Summary fields kept for older screens: set count, max reps, top weight. */
export function summarizeSets(sets: SetDetail[]): Pick<WorkoutEntry, 'sets' | 'reps' | 'weightKg'> {
  if (sets.length === 0) return {}
  return {
    sets: sets.length,
    reps: Math.max(...sets.map(s => s.reps)),
    weightKg: Math.max(...sets.map(s => s.weightKg)),
  }
}

/** Total lifted volume (reps × kg) for one entry; falls back to summary fields. */
export function entryVolumeKg(entry: WorkoutEntry): number {
  if (entry.setDetails?.length) return entry.setDetails.reduce((sum, s) => sum + s.reps * s.weightKg, 0)
  if (entry.sets && entry.reps && entry.weightKg) return entry.sets * entry.reps * entry.weightKg
  return 0
}

/** Heaviest weight previously logged for an exercise (case-insensitive), or 0. */
export function bestWeightKg(entries: WorkoutEntry[], exercise: string): number {
  const name = exercise.trim().toLowerCase()
  let best = 0
  for (const e of entries) {
    if (e.exercise.trim().toLowerCase() !== name) continue
    const top = e.setDetails?.length ? Math.max(...e.setDetails.map(s => s.weightKg)) : e.weightKg || 0
    if (top > best) best = top
  }
  return best
}

const WORKOUT_LOG_KEY = 'karmo_workout_log'
const MAX_WORKOUT_ENTRIES = 200

export async function loadWorkoutLog(): Promise<WorkoutEntry[]> {
  try {
    const saved = await AsyncStorage.getItem(WORKOUT_LOG_KEY)
    return saved ? (JSON.parse(saved) as WorkoutEntry[]) : []
  } catch {
    return []
  }
}

export async function saveWorkoutLog(entries: WorkoutEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(WORKOUT_LOG_KEY, JSON.stringify(entries.slice(0, MAX_WORKOUT_ENTRIES)))
  } catch {
    // best-effort persistence; ignore write failures
  }
}

export function extractFormScore(analysis: string): number | undefined {
  const match = analysis.match(/Form Score:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i)
  if (!match) return undefined
  const score = parseFloat(match[1])
  return Number.isNaN(score) ? undefined : score
}

// General resistance-training MET value (Compendium of Physical Activities, "weight lifting, general").
// This is a rough estimate, not a medical-grade measurement.
const RESISTANCE_TRAINING_MET = 5

export function estimateWorkoutCalories(durationMin: number, bodyWeightKg: number): number {
  return Math.round((RESISTANCE_TRAINING_MET * 3.5 * bodyWeightKg / 200) * durationMin)
}
