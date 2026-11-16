import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/server/session'
import { toPublicUser } from '@/lib/server/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await currentUser()
    return NextResponse.json({ user: user ? toPublicUser(user) : null })
  } catch (e) {
    console.error('session check failed', e)
    return NextResponse.json({ error: 'server' }, { status: 500 })
  }
}
