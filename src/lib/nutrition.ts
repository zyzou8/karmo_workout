export interface NutrientData {
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
}

export const NUTRITION_LOG_KEY = 'karmo_nutrition_log'
export const NUTRITION_TARGET_KEY = 'karmo_nutrition_target'

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
