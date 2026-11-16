/**
 * Keeps the browser's karmo_* localStorage keys in sync with the signed-in user's
 * server-side copy. The rest of the app keeps reading and writing localStorage as before;
 * writes to synced keys are detected here and pushed to /api/user-data (debounced).
 */

/** Device-level preferences: never synced and never cleared on logout. */
const DEVICE_KEYS = new Set(['karmo_theme', 'karmo_locale'])
/** Bookkeeping keys for the sync itself. */
const OWNER_KEY = 'karmo__owner'
const DIRTY_KEY = 'karmo__dirty'

const PUSH_DELAY_MS = 1500

const isSyncedKey = (key: string) => key.startsWith('karmo_') && !key.startsWith('karmo__') && !DEVICE_KEYS.has(key)

let activeUserId: string | null = null
let pushTimer: ReturnType<typeof setTimeout> | null = null
let patched = false
let suppress = false

function syncedKeys(): string[] {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && isSyncedKey(k)) keys.push(k)
  }
  return keys
}

function collectItems(): Record<string, string> {
  const items: Record<string, string> = {}
  for (const k of syncedKeys()) items[k] = localStorage.getItem(k) ?? ''
  return items
}

function clearSyncedKeys() {
  suppress = true
  try {
    for (const k of syncedKeys()) localStorage.removeItem(k)
  } finally {
    suppress = false
  }
}

async function push(keepalive = false): Promise<boolean> {
  if (!activeUserId) return true
  if (pushTimer) { clearTimeout(pushTimer); pushTimer = null }
  try {
    const res = await fetch('/api/user-data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: collectItems() }),
      keepalive,
    })
    if (res.ok) localStorage.removeItem(DIRTY_KEY)
    return res.ok
  } catch {
    return false // stays dirty; retried on the next change or next login
  }
}

function schedulePush() {
  if (!activeUserId || suppress) return
  localStorage.setItem(DIRTY_KEY, '1')
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => { void push() }, PUSH_DELAY_MS)
}

function patchStorage() {
  if (patched) return
  patched = true
  const proto = Storage.prototype
  const origSet = proto.setItem
  const origRemove = proto.removeItem
  const origClear = proto.clear
  proto.setItem = function (key: string, value: string) {
    origSet.call(this, key, value)
    if (this === window.localStorage && isSyncedKey(key)) schedulePush()
  }
  proto.removeItem = function (key: string) {
    origRemove.call(this, key)
    if (this === window.localStorage && isSyncedKey(key)) schedulePush()
  }
  proto.clear = function () {
    origClear.call(this)
    if (this === window.localStorage) schedulePush()
  }
  window.addEventListener('pagehide', () => {
    if (activeUserId && localStorage.getItem(DIRTY_KEY)) void push(true)
  })
}

/**
 * Load the user's data into localStorage and start syncing.
 * - Unsynced local edits by this same user are pushed (local wins).
 * - Data left in the browser from before accounts existed is claimed by the first account
 *   that signs in with an empty server copy.
 * - Otherwise the server copy replaces whatever is in the browser.
 */
export async function startUserSync(userId: string): Promise<void> {
  patchStorage()
  const res = await fetch('/api/user-data', { cache: 'no-store' })
  if (!res.ok) throw new Error(`failed to load user data (${res.status})`)
  const server: { updatedAtISO: string | null; items: Record<string, string> } = await res.json()

  const owner = localStorage.getItem(OWNER_KEY)
  const dirty = localStorage.getItem(DIRTY_KEY) === '1'
  const serverEmpty = !server.updatedAtISO
  const hasLocal = syncedKeys().length > 0

  activeUserId = userId
  const keepLocal = (owner === userId && dirty) || (owner === null && serverEmpty && hasLocal)

  if (keepLocal) {
    localStorage.setItem(OWNER_KEY, userId)
    await push()
    return
  }

  clearSyncedKeys()
  suppress = true
  try {
    for (const [k, v] of Object.entries(server.items)) if (isSyncedKey(k)) localStorage.setItem(k, v)
  } finally {
    suppress = false
  }
  localStorage.setItem(OWNER_KEY, userId)
  localStorage.removeItem(DIRTY_KEY)
}

/** Flush pending changes, then remove this user's data from the browser. */
export async function stopUserSync(): Promise<void> {
  if (activeUserId && localStorage.getItem(DIRTY_KEY)) await push()
  activeUserId = null
  clearSyncedKeys()
  localStorage.removeItem(OWNER_KEY)
  localStorage.removeItem(DIRTY_KEY)
}

export const ONBOARDING_KEY = 'karmo_onboarding_done'

export function hasCompletedOnboarding(): boolean {
  try { return localStorage.getItem(ONBOARDING_KEY) !== null } catch { return false }
}

export function markOnboardingComplete() {
  try { localStorage.setItem(ONBOARDING_KEY, new Date().toISOString()) } catch {}
}
