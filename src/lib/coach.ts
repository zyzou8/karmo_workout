/** Coach Talk personas and the user's persona sliders (App Flow: Customize Coach Personas). */

export type CoachId = 'sage' | 'atlas' | 'pip'

export interface CoachPersona {
  id: CoachId
  name: string
  emoji: string
  /** Defaults applied when the coach is picked; the user can override them in Settings. */
  defaults: CoachSliders
}

export interface CoachSliders {
  /** 0 = strict, 100 = gentle */
  gentle: number
  /** 0 = harsh, 100 = encouraging */
  encourage: number
  /** 0 = detailed, 100 = minimal */
  brevity: number
}

export const COACHES: CoachPersona[] = [
  { id: 'sage', name: 'Sage', emoji: '🌿', defaults: { gentle: 80, encourage: 85, brevity: 40 } },
  { id: 'atlas', name: 'Atlas', emoji: '🏋️', defaults: { gentle: 25, encourage: 55, brevity: 55 } },
  { id: 'pip', name: 'Pip', emoji: '⚡', defaults: { gentle: 60, encourage: 70, brevity: 90 } },
]

export interface CoachSettings {
  coach: CoachId
  sliders: CoachSliders
}

/** Supportive, not harsh, by default. */
export const DEFAULT_COACH_SETTINGS: CoachSettings = { coach: 'sage', sliders: COACHES[0].defaults }

const COACH_KEY = 'karmo_coach'
const CHAT_KEY = 'karmo_coach_chat'

export function loadCoachSettings(): CoachSettings {
  try {
    const saved = localStorage.getItem(COACH_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<CoachSettings>
      return {
        coach: parsed.coach && COACHES.some(c => c.id === parsed.coach) ? parsed.coach : DEFAULT_COACH_SETTINGS.coach,
        sliders: { ...DEFAULT_COACH_SETTINGS.sliders, ...parsed.sliders },
      }
    }
  } catch {}
  return DEFAULT_COACH_SETTINGS
}

export function saveCoachSettings(settings: CoachSettings) {
  try {
    localStorage.setItem(COACH_KEY, JSON.stringify(settings))
  } catch {}
}

export interface ChatMessage {
  role: 'user' | 'model'
  text: string
}

const MAX_SAVED_MESSAGES = 40

export function loadChat(): ChatMessage[] {
  try {
    const saved = localStorage.getItem(CHAT_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return []
}

export function saveChat(messages: ChatMessage[]) {
  try {
    localStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-MAX_SAVED_MESSAGES)))
  } catch {}
}
