import AsyncStorage from '@react-native-async-storage/async-storage'

/** Bump when the disclaimer text changes materially so existing users are asked to accept again. */
export const DISCLAIMER_VERSION = 1

export const DISCLAIMER_SECTION_KEYS = [
  'medical', 'injury', 'nutrition', 'healthyUse', 'mentalHealth', 'ai', 'results', 'eligibility',
] as const

export interface DisclaimerAcceptance {
  version: number
  acceptedAtISO: string
}

const DISCLAIMER_KEY = 'karmo_disclaimer'

export async function loadDisclaimerAcceptance(): Promise<DisclaimerAcceptance | null> {
  try {
    const saved = await AsyncStorage.getItem(DISCLAIMER_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as DisclaimerAcceptance
      if (parsed.version >= DISCLAIMER_VERSION) return parsed
    }
  } catch {
    // treat unreadable data as not accepted
  }
  return null
}

export async function saveDisclaimerAcceptance(): Promise<DisclaimerAcceptance> {
  const acceptance = { version: DISCLAIMER_VERSION, acceptedAtISO: new Date().toISOString() }
  try {
    await AsyncStorage.setItem(DISCLAIMER_KEY, JSON.stringify(acceptance))
  } catch {
    // best-effort persistence; ignore write failures
  }
  return acceptance
}
