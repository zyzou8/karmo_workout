import { getStorage, withFileLock } from './storage'

/** Video form analyses each account may run per calendar week (Monday 00:00 → Sunday 23:59, server time). */
export const VIDEO_ANALYSES_PER_WEEK = 7

interface UsageFile { weeks: Record<string, number> }

const usageFile = (userId: string) => `usage/${userId}.json`

function weekStart(d = new Date()): Date {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)) // back to Monday
  return start
}

const weekKey = (d = new Date()) => {
  const s = weekStart(d)
  return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`
}

export interface QuotaStatus { used: number; limit: number; remaining: number; resetsAtISO: string }

function status(used: number): QuotaStatus {
  const reset = weekStart()
  reset.setDate(reset.getDate() + 7)
  return { used, limit: VIDEO_ANALYSES_PER_WEEK, remaining: Math.max(0, VIDEO_ANALYSES_PER_WEEK - used), resetsAtISO: reset.toISOString() }
}

async function load(userId: string): Promise<UsageFile> {
  const raw = await getStorage().read(usageFile(userId))
  return raw ? JSON.parse(raw) : { weeks: {} }
}

export async function getVideoQuota(userId: string): Promise<QuotaStatus> {
  return status((await load(userId)).weeks[weekKey()] || 0)
}

/** Take one analysis from this week's allowance. Returns null when none are left. */
export async function reserveVideoAnalysis(userId: string): Promise<QuotaStatus | null> {
  return withFileLock(usageFile(userId), async () => {
    const usage = await load(userId)
    const key = weekKey()
    const used = usage.weeks[key] || 0
    if (used >= VIDEO_ANALYSES_PER_WEEK) return null
    usage.weeks = { [key]: used + 1 } // only the current week matters
    await getStorage().write(usageFile(userId), JSON.stringify(usage))
    return status(used + 1)
  })
}

/** Give the allowance back when the analysis itself failed. */
export async function refundVideoAnalysis(userId: string): Promise<void> {
  await withFileLock(usageFile(userId), async () => {
    const usage = await load(userId)
    const key = weekKey()
    if (usage.weeks[key]) {
      usage.weeks[key] -= 1
      await getStorage().write(usageFile(userId), JSON.stringify(usage))
    }
  })
}
