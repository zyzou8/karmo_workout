import AsyncStorage from '@react-native-async-storage/async-storage'

export type CoachId = 'sage' | 'atlas' | 'pip'

export const COACH_IDS: CoachId[] = ['sage', 'atlas', 'pip']

export interface CoachSettings {
  coach: CoachId
  /** 0 = strict, 100 = gentle */
  gentle: number
  /** 0 = harsh, 100 = encouraging */
  encourage: number
  /** 0 = verbose, 100 = minimal */
  brevity: number
}

/** Supportive, not harsh, by default. */
export const DEFAULT_COACH_SETTINGS: CoachSettings = { coach: 'sage', gentle: 75, encourage: 80, brevity: 40 }

export interface ChatMessage {
  role: 'user' | 'model'
  text: string
}

const COACH_KEY = 'karmo_coach'

export async function loadCoachSettings(): Promise<CoachSettings> {
  try {
    const saved = await AsyncStorage.getItem(COACH_KEY)
    if (saved) return { ...DEFAULT_COACH_SETTINGS, ...JSON.parse(saved) }
  } catch {
    // fall through to defaults
  }
  return DEFAULT_COACH_SETTINGS
}

export async function saveCoachSettings(settings: CoachSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(COACH_KEY, JSON.stringify(settings))
  } catch {
    // best-effort persistence
  }
}
