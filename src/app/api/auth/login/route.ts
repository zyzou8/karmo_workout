import { NextResponse } from 'next/server'
import { AuthError, toPublicUser, verifyUser } from '@/lib/server/users'
import { startSession } from '@/lib/server/session'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json()
    if (typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'invalidCredentials' }, { status: 400 })
    }
    const user = await verifyUser(username.trim(), password)
    await startSession(user.id)
    return NextResponse.json({ user: toPublicUser(user) })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 })
    console.error('login failed', e)
    return NextResponse.json({ error: 'server' }, { status: 500 })
  }
}
