import { randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import { getStorage, withFileLock } from './storage'

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>

const USERS_FILE = 'users.json'

export interface StoredUser {
  id: string
  username: string
  displayName: string
  passwordHash: string // hex
  salt: string // hex
  createdAtISO: string
}

export interface PublicUser { id: string; username: string; displayName: string; createdAtISO: string }

export function toPublicUser(u: StoredUser): PublicUser {
  return { id: u.id, username: u.username, displayName: u.displayName, createdAtISO: u.createdAtISO }
}

// Only this server writes users.json, so keep it in memory after the first read.
let usersCache: StoredUser[] | null = null

async function loadUsers(): Promise<StoredUser[]> {
  if (usersCache) return usersCache
  const raw = await getStorage().read(USERS_FILE)
  usersCache = raw ? (JSON.parse(raw).users as StoredUser[]) : []
  return usersCache
}

export const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/

export class AuthError extends Error {
  constructor(public code: 'usernameTaken' | 'invalidUsername' | 'weakPassword' | 'invalidCredentials') { super(code) }
}

export async function createUser(username: string, password: string, displayName: string): Promise<StoredUser> {
  if (!USERNAME_RE.test(username)) throw new AuthError('invalidUsername')
  if (password.length < 8) throw new AuthError('weakPassword')
  return withFileLock(USERS_FILE, async () => {
    const users = [...(await loadUsers())]
    const key = username.toLowerCase()
    if (users.some(u => u.username.toLowerCase() === key)) throw new AuthError('usernameTaken')
    const salt = randomBytes(16)
    const hash = await scrypt(password, salt, 64)
    const user: StoredUser = {
      id: randomUUID(),
      username,
      displayName: displayName.trim().slice(0, 60) || username,
      passwordHash: hash.toString('hex'),
      salt: salt.toString('hex'),
      createdAtISO: new Date().toISOString(),
    }
    users.push(user)
    await getStorage().write(USERS_FILE, JSON.stringify({ users }, null, 2))
    usersCache = users
    return user
  })
}

export async function verifyUser(username: string, password: string): Promise<StoredUser> {
  const users = await loadUsers()
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase())
  // Hash even when the user is missing so response time doesn't reveal which usernames exist.
  const salt = user ? Buffer.from(user.salt, 'hex') : randomBytes(16)
  const hash = await scrypt(password, salt, 64)
  if (!user || !timingSafeEqual(hash, Buffer.from(user.passwordHash, 'hex'))) throw new AuthError('invalidCredentials')
  return user
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  return (await loadUsers()).find(u => u.id === id) || null
}

/* ---- per-user app data (the browser's karmo_* keys) ---- */

export interface UserData { updatedAtISO: string | null; items: Record<string, string> }

const dataFile = (userId: string) => `userdata/${userId}.json`

export async function loadUserData(userId: string): Promise<UserData> {
  const raw = await getStorage().read(dataFile(userId))
  return raw ? JSON.parse(raw) : { updatedAtISO: null, items: {} }
}

export async function saveUserData(userId: string, items: Record<string, string>): Promise<UserData> {
  const data: UserData = { updatedAtISO: new Date().toISOString(), items }
  await withFileLock(dataFile(userId), () => getStorage().write(dataFile(userId), JSON.stringify(data)))
  return data
}
