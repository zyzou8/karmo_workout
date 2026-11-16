/** Bump when the disclaimer text changes materially so existing users are asked to accept again. */
export const DISCLAIMER_VERSION = 1

export const DISCLAIMER_SECTION_KEYS = [
  'medical', 'injury', 'nutrition', 'healthyUse', 'mentalHealth', 'ai', 'results', 'eligibility',
] as const

export interface DisclaimerAcceptance {
  version: number
  acceptedAtISO: string
  /** Full name the user typed as their signature. */
  signedName?: string
}

const DISCLAIMER_KEY = 'karmo_disclaimer'

export function loadDisclaimerAcceptance(): DisclaimerAcceptance | null {
  try {
    const saved = localStorage.getItem(DISCLAIMER_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as DisclaimerAcceptance
      if (parsed.version >= DISCLAIMER_VERSION) return parsed
    }
  } catch {
    console.warn('karmo: failed to parse saved disclaimer acceptance')
  }
  return null
}

export function saveDisclaimerAcceptance(signedName?: string): DisclaimerAcceptance {
  const acceptance: DisclaimerAcceptance = { version: DISCLAIMER_VERSION, acceptedAtISO: new Date().toISOString(), signedName }
  try {
    localStorage.setItem(DISCLAIMER_KEY, JSON.stringify(acceptance))
  } catch {}
  return acceptance
}
