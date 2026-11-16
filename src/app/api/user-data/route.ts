import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/server/session'
import { loadUserData, saveUserData } from '@/lib/server/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 20 * 1024 * 1024

export async function GET() {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await loadUserData(user.id))
  } catch (e) {
    console.error('load user data failed', e)
    return NextResponse.json({ error: 'server' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const text = await req.text()
  if (text.length > MAX_BYTES) return NextResponse.json({ error: 'tooLarge' }, { status: 413 })
  try {
    const { items } = JSON.parse(text)
    if (!items || typeof items !== 'object') return NextResponse.json({ error: 'badRequest' }, { status: 400 })
    const clean: Record<string, string> = {}
    for (const [k, v] of Object.entries(items)) {
      if (k.startsWith('karmo_') && typeof v === 'string') clean[k] = v
    }
    const saved = await saveUserData(user.id, clean)
    return NextResponse.json({ updatedAtISO: saved.updatedAtISO })
  } catch (e) {
    console.error('save user data failed', e)
    return NextResponse.json({ error: 'server' }, { status: 500 })
  }
}
