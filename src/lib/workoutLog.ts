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
  /** Setline-style per-set detail from the Workout log screen. */
  setDetails?: SetDetail[]
  bodyPart?: string
}

export interface SetDetail {
  reps: number
  weightKg: number
}

export const BODY_PART_SLUGS = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'fullBody'] as const
export type BodyPartSlug = typeof BODY_PART_SLUGS[number]

/** Total load lifted in an entry (reps × weight), from set detail when present. */
export function entryVolumeKg(entry: WorkoutEntry): number {
  if (entry.setDetails?.length) return entry.setDetails.reduce((sum, s) => sum + s.reps * s.weightKg, 0)
  if (entry.sets && entry.reps && entry.weightKg) return entry.sets * entry.reps * entry.weightKg
  return 0
}

/** Heaviest single set ever logged for this exercise (case-insensitive name match). */
export function bestWeightKg(entries: WorkoutEntry[], exercise: string): number {
  const name = exercise.trim().toLowerCase()
  let best = 0
  for (const e of entries) {
    if (e.exercise.trim().toLowerCase() !== name) continue
    for (const s of e.setDetails ?? []) best = Math.max(best, s.weightKg)
    if (e.weightKg) best = Math.max(best, e.weightKg)
  }
  return best
}

// General resistance-training MET value (Compendium of Physical Activities, "weight lifting, general").
// This is a rough estimate, not a medical-grade measurement.
const RESISTANCE_TRAINING_MET = 5

export function estimateWorkoutCalories(durationMin: number, bodyWeightKg: number): number {
  return Math.round((RESISTANCE_TRAINING_MET * 3.5 * bodyWeightKg / 200) * durationMin)
}

const WORKOUT_LOG_KEY = 'karmo_workout_log'
const MAX_WORKOUT_ENTRIES = 200

export function loadWorkoutLog(): WorkoutEntry[] {
  try {
    const saved = localStorage.getItem(WORKOUT_LOG_KEY)
    if (saved) return JSON.parse(saved)
  } catch {
    console.warn('karmo: failed to parse saved workout log, resetting')
  }
  return []
}

export function saveWorkoutLog(entries: WorkoutEntry[]) {
  try {
    localStorage.setItem(WORKOUT_LOG_KEY, JSON.stringify(entries.slice(0, MAX_WORKOUT_ENTRIES)))
  } catch {}
}

export function extractFormScore(analysis: string): number | undefined {
  const match = analysis.match(/Form Score:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i)
  if (!match) return undefined
  const score = parseFloat(match[1])
  return Number.isNaN(score) ? undefined : score
}
