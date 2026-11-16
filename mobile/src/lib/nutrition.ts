import AsyncStorage from '@react-native-async-storage/async-storage'

export interface NutrientData {
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
}

export type MealTypeSlug = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'preWorkout' | 'postWorkout'

export interface LogEntry {
  id: string
  title: string
  mealType: MealTypeSlug
  description: string
  timestamp: string
  dateISO: string
  analysis: string
  nutrients?: NutrientData
}

export const NUTRITION_LOG_KEY = 'karmo_nutrition_log'
export const NUTRITION_TARGET_KEY = 'karmo_nutrition_target'
const MAX_LOG_ENTRIES = 200

function tagRegex(tagName: string): RegExp {
  return new RegExp(`${tagName}:\\s*(\\{[^\\n]*\\})\\s*$`)
}

export function extractTag<T = NutrientData>(text: string, tagName: string): T | null {
  const match = text.match(tagRegex(tagName))
  if (!match) return null
  try {
    return JSON.parse(match[1]) as T
  } catch {
    return null
  }
}

export function stripTag(text: string, tagName: string): string {
  return text.replace(tagRegex(tagName), '').trim()
}

export function sumNutrients(entries: NutrientData[]): Required<NutrientData> {
  const total: Required<NutrientData> = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  for (const entry of entries) {
    total.calories += entry.calories || 0
    total.protein += entry.protein || 0
    total.carbs += entry.carbs || 0
    total.fat += entry.fat || 0
    total.fiber += entry.fiber || 0
  }
  return total
}

export async function loadNutritionLog(): Promise<LogEntry[]> {
  try {
    const saved = await AsyncStorage.getItem(NUTRITION_LOG_KEY)
    return saved ? (JSON.parse(saved) as LogEntry[]) : []
  } catch {
    return []
  }
}

export async function saveNutritionLog(entries: LogEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(NUTRITION_LOG_KEY, JSON.stringify(entries.slice(0, MAX_LOG_ENTRIES)))
  } catch {
    // best-effort persistence; ignore write failures
  }
}

export interface NutritionTarget {
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  updatedAt?: number
}

export async function loadNutritionTarget(): Promise<NutritionTarget | null> {
  try {
    const saved = await AsyncStorage.getItem(NUTRITION_TARGET_KEY)
    return saved ? (JSON.parse(saved) as NutritionTarget) : null
  } catch {
    return null
  }
}

export async function saveNutritionTarget(target: NutritionTarget): Promise<void> {
  try {
    await AsyncStorage.setItem(NUTRITION_TARGET_KEY, JSON.stringify({ ...target, updatedAt: Date.now() }))
  } catch {
    // best-effort persistence; ignore write failures
  }
}
