import AsyncStorage from '@react-native-async-storage/async-storage'
import { loadNutritionTarget } from './nutrition'

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

export async function loadProfile(): Promise<UserProfile> {
  try {
    const saved = await AsyncStorage.getItem(PROFILE_KEY)
    if (saved) return { ...DEFAULT_PROFILE, ...JSON.parse(saved) }
  } catch {
    // fall through to defaults
  }
  return DEFAULT_PROFILE
}

export async function hasSavedProfile(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PROFILE_KEY)) !== null
  } catch {
    return false
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  } catch {
    // best-effort persistence; ignore write failures
  }
}

export interface MeasurementEntry {
  id: string
  dateISO: string
  weightKg?: number
  bodyFatPct?: number
  note?: string
}

export async function loadMeasurements(): Promise<MeasurementEntry[]> {
  try {
    const saved = await AsyncStorage.getItem(MEASUREMENT_LOG_KEY)
    return saved ? (JSON.parse(saved) as MeasurementEntry[]) : []
  } catch {
    return []
  }
}

export async function saveMeasurements(entries: MeasurementEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(MEASUREMENT_LOG_KEY, JSON.stringify(entries))
  } catch {
    // best-effort persistence; ignore write failures
  }
}

/** Most recent logged body weight (measurement log takes priority), or the profile's stored weight, or null if unknown. */
export async function getCurrentWeightKg(): Promise<number | null> {
  const measurements = (await loadMeasurements()).filter(m => m.weightKg != null)
  if (measurements.length > 0) {
    const latest = [...measurements].sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime())[0]
    return latest.weightKg ?? null
  }
  const profile = await loadProfile()
  const profileWeight = parseFloat(profile.weightKg)
  return Number.isNaN(profileWeight) ? null : profileWeight
}

/** Re-exported so screens only need one import for "does the user have a saved nutrition target". */
export { loadNutritionTarget }
