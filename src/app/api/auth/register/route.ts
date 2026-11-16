import { NextResponse } from 'next/server'
import { AuthError, createUser, toPublicUser } from '@/lib/server/users'
import { startSession } from '@/lib/server/session'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { username, password, displayName } = await req.json()
    if (typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'invalidCredentials' }, { status: 400 })
    }
    const user = await createUser(username.trim(), password, typeof displayName === 'string' ? displayName : '')
    await startSession(user.id)
    return NextResponse.json({ user: toPublicUser(user) })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: e.code === 'usernameTaken' ? 409 : 400 })
    console.error('register failed', e)
    return NextResponse.json({ error: 'server' }, { status: 500 })
  }
}
