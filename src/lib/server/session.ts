import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { findUserById, StoredUser } from './users'

const COOKIE = 'karmo_session'
const MAX_AGE_S = 60 * 60 * 24 * 30 // 30 days

function secret(): string {
  const s = process.env.SESSION_SECRET
  if (!s || s.length < 32) throw new Error('SESSION_SECRET must be set (32+ chars) in .env.local')
  return s
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export async function startSession(userId: string) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + MAX_AGE_S * 1000 })).toString('base64url')
  const jar = await cookies()
  jar.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: MAX_AGE_S,
    // Plain-HTTP LAN deployments can't use Secure cookies; set COOKIE_SECURE=true when served over HTTPS.
    secure: process.env.COOKIE_SECURE === 'true',
  })
}

export async function endSession() {
  (await cookies()).delete(COOKIE)
}

export async function currentUser(): Promise<StoredUser | null> {
  const value = (await cookies()).get(COOKIE)?.value
  if (!value) return null
  const [payload, sig] = value.split('.')
  if (!payload || !sig) return null
  const expected = Buffer.from(sign(payload))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof exp !== 'number' || exp < Date.now()) return null
    return await findUserById(uid)
  } catch {
    return null
  }
}
