/**
 * Platform-neutral weekly body summary: muscle mapping, aggregation and share-link encoding.
 * This file is copied verbatim to mobile/src/lib/bodySummaryCore.ts, so it must not touch
 * browser or React Native APIs. Keep the two copies identical.
 */
import { DICTIONARIES } from './i18n/translations'

export const MUSCLE_GROUPS = [
  'chest', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs',
  'traps', 'lats', 'lowerBack', 'glutes', 'quads', 'hamstrings', 'calves',
] as const
export type MuscleGroup = typeof MUSCLE_GROUPS[number]

/** Weekly hard sets per muscle; 10–20 is the commonly cited hypertrophy range. */
export const MUSCLE_LOAD_LEVELS = [
  { min: 0, level: 0 },
  { min: 0.5, level: 1 },
  { min: 6, level: 2 },
  { min: 12, level: 3 },
  { min: 20, level: 4 },
] as const

export function muscleLoadLevel(sets: number): number {
  let level = 0
  for (const l of MUSCLE_LOAD_LEVELS) if (sets >= l.min) level = l.level
  return level
}

type MuscleWeights = Partial<Record<MuscleGroup, number>>

/** Primary movers count as 1 set per set performed; secondary muscles as half. */
const EXERCISE_MUSCLES: Record<string, MuscleWeights> = {
  squat: { quads: 1, glutes: 1, hamstrings: 0.5, lowerBack: 0.5, abs: 0.5 },
  deadlift: { hamstrings: 1, glutes: 1, lowerBack: 1, traps: 0.5, forearms: 0.5, quads: 0.5, lats: 0.5 },
  benchPress: { chest: 1, triceps: 0.5, shoulders: 0.5 },
  overheadPress: { shoulders: 1, triceps: 0.5, traps: 0.5, abs: 0.5 },
  barbellRow: { lats: 1, traps: 0.5, biceps: 0.5, lowerBack: 0.5, shoulders: 0.5 },
  pullup: { lats: 1, biceps: 0.5, forearms: 0.5 },
  pushup: { chest: 1, triceps: 0.5, shoulders: 0.5, abs: 0.5 },
  lunge: { quads: 1, glutes: 1, hamstrings: 0.5, calves: 0.5 },
  romanianDeadlift: { hamstrings: 1, glutes: 1, lowerBack: 0.5 },
  hipThrust: { glutes: 1, hamstrings: 0.5 },
  plank: { abs: 1, shoulders: 0.5 },
  running: { calves: 1, quads: 0.5, hamstrings: 0.5, glutes: 0.5 },
  yoga: { abs: 0.5 },
}

/** Keyword fallback for manually typed exercise names. Earlier rules win, so specific names come first. */
const KEYWORD_MUSCLES: { pattern: RegExp; muscles: MuscleWeights }[] = [
  { pattern: /leg curl|腿彎舉|腿弯举/i, muscles: { hamstrings: 1, calves: 0.5 } },
  { pattern: /leg extension|腿屈伸|leg press|腿推|腿举|腿舉/i, muscles: { quads: 1, glutes: 0.5 } },
  { pattern: /calf|小腿|提踵/i, muscles: { calves: 1 } },
  { pattern: /hammer|curl|彎舉|弯举|二頭|二头|bicep/i, muscles: { biceps: 1, forearms: 0.5 } },
  { pattern: /tricep|三頭|三头|pushdown|下壓|下压|skull|dip|雙槓|双杠/i, muscles: { triceps: 1, chest: 0.5 } },
  { pattern: /fly|flye|飛鳥|飞鸟|bench|臥推|卧推|chest|胸/i, muscles: { chest: 1, triceps: 0.5, shoulders: 0.5 } },
  { pattern: /pulldown|下拉|row|划船|lat|背/i, muscles: { lats: 1, biceps: 0.5, traps: 0.5 } },
  { pattern: /shrug|聳肩|耸肩|trap|斜方/i, muscles: { traps: 1 } },
  { pattern: /lateral raise|側平舉|侧平举|shoulder|肩|press|推舉|推举/i, muscles: { shoulders: 1, triceps: 0.5 } },
  { pattern: /crunch|sit-?up|捲腹|卷腹|仰臥起坐|仰卧起坐|abs|core|腹/i, muscles: { abs: 1 } },
  { pattern: /squat|深蹲|lunge|弓步|箭步/i, muscles: EXERCISE_MUSCLES.squat },
  { pattern: /deadlift|硬舉|硬拉/i, muscles: EXERCISE_MUSCLES.deadlift },
  { pattern: /glute|臀|hip thrust/i, muscles: EXERCISE_MUSCLES.hipThrust },
  { pattern: /run|跑/i, muscles: EXERCISE_MUSCLES.running },
]

let exerciseNameIndex: Map<string, string> | null = null

/** Workouts store the exercise's translated display name, so match it back to a slug in any language. */
function exerciseSlugFromName(name: string): string | null {
  if (!exerciseNameIndex) {
    exerciseNameIndex = new Map()
    for (const dict of Object.values(DICTIONARIES)) {
      for (const [slug, label] of Object.entries(dict.motion.exercises)) {
        exerciseNameIndex.set(label.toLowerCase(), slug)
      }
    }
  }
  return exerciseNameIndex.get(name.trim().toLowerCase()) ?? null
}

export function musclesForExercise(name: string): MuscleWeights {
  const slug = exerciseSlugFromName(name)
  if (slug && EXERCISE_MUSCLES[slug]) return EXERCISE_MUSCLES[slug]
  return KEYWORD_MUSCLES.find(k => k.pattern.test(name))?.muscles ?? {}
}

const DEFAULT_SETS_PER_ENTRY = 3
const WHO_WEEKLY_ACTIVE_MINUTES = 150

/**
 * Compact, privacy-scoped weekly snapshot. This exact shape is encoded into share links,
 * so keep keys short and add new fields as optional.
 */
export interface BodySummary {
  v: 1
  /** Display name chosen when sharing. */
  name?: string
  fromISO: string
  toISO: string
  /** Weekly sets per muscle group. */
  muscles: Partial<Record<MuscleGroup, number>>
  training: {
    sessions: number
    daysTrained: number
    daysGoal: number
    minutes: number
    minutesGoal: number
    calories: number
    topExercises: { name: string; sets: number; sessions: number }[]
  }
  form?: { avg: number; count: number; best?: { name: string; score: number } }
  body?: { weightKg?: number; deltaKg?: number; bodyFatPct?: number; weights: number[] }
  fuel?: {
    daysLogged: number
    avgCalories: number
    targetCalories?: number
    avgProtein: number
    avgCarbs: number
    avgFat: number
    targetProtein?: number
  }
}

export type ShareSection = 'form' | 'body' | 'fuel'

interface Nutrients {
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
}

export interface BodySummaryInput {
  workouts: {
    dateISO: string
    exercise: string
    sets?: number
    durationMin?: number
    estimatedCalories?: number
    formScore?: number
  }[]
  measurements: { dateISO: string; weightKg?: number; bodyFatPct?: number }[]
  meals: { dateISO: string; nutrients?: Nutrients }[]
  nutritionTarget: Nutrients | null
  profileWeightKg: string
  daysPerWeek: string
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Aggregates the last 7 days (today inclusive). */
export function computeBodySummary(input: BodySummaryInput, now = new Date()): BodySummary {
  const from = new Date(now)
  from.setHours(0, 0, 0, 0)
  from.setDate(from.getDate() - 6)
  const inWeek = (iso: string) => {
    const d = new Date(iso)
    return d >= from && d <= now
  }

  const workouts = input.workouts.filter(w => inWeek(w.dateISO))

  const muscles: Partial<Record<MuscleGroup, number>> = {}
  const byExercise = new Map<string, { name: string; sets: number; sessions: number }>()
  const days = new Set<string>()
  let minutes = 0
  let calories = 0

  for (const w of workouts) {
    const sets = w.sets ?? DEFAULT_SETS_PER_ENTRY
    for (const [muscle, weight] of Object.entries(musclesForExercise(w.exercise)) as [MuscleGroup, number][]) {
      muscles[muscle] = round1((muscles[muscle] ?? 0) + sets * weight)
    }
    const key = w.exercise.trim().toLowerCase()
    const agg = byExercise.get(key) ?? { name: w.exercise.trim(), sets: 0, sessions: 0 }
    agg.sets += sets
    agg.sessions += 1
    byExercise.set(key, agg)
    days.add(new Date(w.dateISO).toDateString())
    minutes += w.durationMin ?? 0
    calories += w.estimatedCalories ?? 0
  }

  const scored = workouts.filter((w): w is typeof w & { formScore: number } => w.formScore != null)
  const form = scored.length
    ? {
        avg: round1(scored.reduce((s, w) => s + w.formScore, 0) / scored.length),
        count: scored.length,
        best: (() => {
          const top = [...scored].sort((a, b) => b.formScore - a.formScore)[0]
          return { name: top.exercise, score: top.formScore }
        })(),
      }
    : undefined

  const measurements = input.measurements
    .filter(m => m.weightKg != null)
    .sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime())
  const latestWeight = measurements[measurements.length - 1]?.weightKg ?? (parseFloat(input.profileWeightKg) || undefined)
  const prevWeight = measurements[measurements.length - 2]?.weightKg
  const latestBodyFat = [...input.measurements]
    .filter(m => m.bodyFatPct != null)
    .sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime())[0]?.bodyFatPct
  const body = latestWeight != null
    ? {
        weightKg: latestWeight,
        deltaKg: prevWeight != null && latestWeight != null ? round1(latestWeight - prevWeight) : undefined,
        bodyFatPct: latestBodyFat,
        weights: measurements.slice(-12).map(m => m.weightKg as number),
      }
    : undefined

  const meals = input.meals.filter(m => inWeek(m.dateISO))
  const mealDays = new Set(meals.map(m => new Date(m.dateISO).toDateString()))
  const target = input.nutritionTarget
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 }
  for (const m of meals) {
    totals.calories += m.nutrients?.calories || 0
    totals.protein += m.nutrients?.protein || 0
    totals.carbs += m.nutrients?.carbs || 0
    totals.fat += m.nutrients?.fat || 0
  }
  const n = mealDays.size || 1
  const fuel = mealDays.size
    ? {
        daysLogged: mealDays.size,
        avgCalories: Math.round(totals.calories / n),
        targetCalories: target?.calories,
        avgProtein: Math.round(totals.protein / n),
        avgCarbs: Math.round(totals.carbs / n),
        avgFat: Math.round(totals.fat / n),
        targetProtein: target?.protein,
      }
    : undefined

  return {
    v: 1,
    fromISO: from.toISOString(),
    toISO: now.toISOString(),
    muscles,
    training: {
      sessions: workouts.length,
      daysTrained: days.size,
      daysGoal: parseInt(input.daysPerWeek, 10) || 3,
      minutes,
      minutesGoal: WHO_WEEKLY_ACTIVE_MINUTES,
      calories,
      topExercises: [...byExercise.values()].sort((a, b) => b.sets - a.sets).slice(0, 5),
    },
    form,
    body,
    fuel,
  }
}

/** Removes sections the user chose not to share. */
export function scopeSummary(summary: BodySummary, include: Record<ShareSection, boolean>, name?: string): BodySummary {
  return {
    ...summary,
    name: name?.trim() || undefined,
    form: include.form ? summary.form : undefined,
    body: include.body ? summary.body : undefined,
    fuel: include.fuel ? summary.fuel : undefined,
  }
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

function utf8Encode(text: string): number[] {
  const bytes: number[] = []
  for (const ch of text) {
    const cp = ch.codePointAt(0) as number
    if (cp < 0x80) bytes.push(cp)
    else if (cp < 0x800) bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 63))
    else if (cp < 0x10000) bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63))
    else bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63))
  }
  return bytes
}

function utf8Decode(bytes: number[]): string {
  let out = ''
  for (let i = 0; i < bytes.length;) {
    const b = bytes[i]
    let cp: number
    if (b < 0x80) { cp = b; i += 1 }
    else if (b < 0xe0) { cp = ((b & 31) << 6) | (bytes[i + 1] & 63); i += 2 }
    else if (b < 0xf0) { cp = ((b & 15) << 12) | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63); i += 3 }
    else { cp = ((b & 7) << 18) | ((bytes[i + 1] & 63) << 12) | ((bytes[i + 2] & 63) << 6) | (bytes[i + 3] & 63); i += 4 }
    out += String.fromCodePoint(cp)
  }
  return out
}

/** Unpadded base64url, implemented by hand so it behaves the same in browsers and Hermes. */
function toBase64Url(text: string): string {
  const bytes = utf8Encode(text)
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63]
    if (i + 1 < bytes.length) out += B64[(n >> 6) & 63]
    if (i + 2 < bytes.length) out += B64[n & 63]
  }
  return out
}

function fromBase64Url(encoded: string): string {
  const bytes: number[] = []
  let buffer = 0
  let bits = 0
  for (const ch of encoded) {
    const v = B64.indexOf(ch)
    if (v < 0) throw new Error('invalid base64url')
    buffer = (buffer << 6) | v
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes.push((buffer >> bits) & 255)
    }
  }
  return utf8Decode(bytes)
}

/** The snapshot lives in the URL fragment, which browsers never send to the server. */
export function encodeShareFragment(summary: BodySummary): string {
  return toBase64Url(JSON.stringify(summary))
}

export function decodeShareFragment(fragment: string): BodySummary | null {
  try {
    const parsed = JSON.parse(fromBase64Url(fragment.replace(/^#/, ''))) as BodySummary
    if (parsed?.v !== 1 || typeof parsed.muscles !== 'object' || !parsed.training) return null
    return parsed
  } catch {
    return null
  }
}
