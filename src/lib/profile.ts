export const FITNESS_LEVEL_SLUGS = ['beginner', 'intermediate', 'advanced'] as const
export const GOAL_SLUGS = ['loseWeight', 'buildMuscle', 'improveStrength', 'improveEndurance', 'generalFitness', 'athleticPerformance', 'rehab'] as const
export const EQUIPMENT_SLUGS = ['none', 'dumbbells', 'barbell', 'fullGym', 'bands', 'kettlebells'] as const
export const GENDER_SLUGS = ['notSpecified', 'male', 'female', 'nonBinary'] as const

export type FitnessLevelSlug = typeof FITNESS_LEVEL_SLUGS[number]
export type GoalSlug = typeof GOAL_SLUGS[number]
export type EquipmentSlug = typeof EQUIPMENT_SLUGS[number]
export type GenderSlug = typeof GENDER_SLUGS[number]

export interface UserProfile {
  age: string
  heightCm: string
  weightKg: string
  gender: GenderSlug
  fitnessLevel: FitnessLevelSlug
  goal: GoalSlug
  daysPerWeek: string
  equipment: EquipmentSlug
}

export const DEFAULT_PROFILE: UserProfile = {
  age: '',
  heightCm: '',
  weightKg: '',
  gender: 'notSpecified',
  fitnessLevel: 'beginner',
  goal: 'loseWeight',
  daysPerWeek: '3',
  equipment: 'none',
}

const PROFILE_KEY = 'karmo_profile'
const MEASUREMENT_LOG_KEY = 'karmo_measurement_log'

export function loadProfile(): UserProfile {
  try {
    const saved = localStorage.getItem(PROFILE_KEY)
    if (saved) return { ...DEFAULT_PROFILE, ...JSON.parse(saved) }
  } catch {
    console.warn('karmo: failed to parse saved profile, using defaults')
  }
  return DEFAULT_PROFILE
}

export function hasSavedProfile(): boolean {
  try {
    return localStorage.getItem(PROFILE_KEY) !== null
  } catch {
    return false
  }
}

export function saveProfile(profile: UserProfile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  } catch {}
}

export interface MeasurementEntry {
  id: string
  dateISO: string
  weightKg?: number
  bodyFatPct?: number
  note?: string
}

export function loadMeasurements(): MeasurementEntry[] {
  try {
    const saved = localStorage.getItem(MEASUREMENT_LOG_KEY)
    if (saved) return JSON.parse(saved)
  } catch {
    console.warn('karmo: failed to parse saved measurement log, resetting')
  }
  return []
}

export function saveMeasurements(entries: MeasurementEntry[]) {
  try {
    localStorage.setItem(MEASUREMENT_LOG_KEY, JSON.stringify(entries))
  } catch {}
}

/** Most recent logged body weight (measurement log takes priority), or the profile's stored weight, or null if unknown. */
export function getCurrentWeightKg(): number | null {
  const measurements = loadMeasurements().filter(m => m.weightKg != null)
  if (measurements.length > 0) {
    const latest = [...measurements].sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime())[0]
    return latest.weightKg ?? null
  }
  const profileWeight = parseFloat(loadProfile().weightKg)
  return Number.isNaN(profileWeight) ? null : profileWeight
}
