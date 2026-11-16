'use client'

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { startUserSync, stopUserSync } from './userSync'

export interface AuthUser { id: string; username: string; displayName: string; createdAtISO: string }

/** loading → checking the session; syncing → signed in, loading the user's data; ready → usable. */
type Status = 'loading' | 'signedOut' | 'syncing' | 'ready' | 'error'

interface AuthContextValue {
  user: AuthUser | null
  status: Status
  login: (username: string, password: string) => Promise<string | null>
  register: (username: string, password: string, displayName: string) => Promise<string | null>
  logout: () => Promise<void>
  retry: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [attempt, setAttempt] = useState(0)

  const enter = useCallback(async (u: AuthUser) => {
    setUser(u)
    setStatus('syncing')
    try {
      await startUserSync(u.id)
      setStatus('ready')
    } catch (e) {
      console.error('karmo: user data sync failed', e)
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' })
        if (!res.ok) throw new Error(String(res.status))
        const { user: u } = await res.json()
        if (cancelled) return
        if (u) await enter(u)
        else setStatus('signedOut')
      } catch (e) {
        console.error('karmo: session check failed', e)
        if (!cancelled) setStatus('error')
      }
    })()
    return () => { cancelled = true }
  }, [enter, attempt])

  const submit = useCallback(async (url: string, body: object): Promise<string | null> => {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return json.error || 'server'
      await enter(json.user)
      return null
    } catch {
      return 'network'
    }
  }, [enter])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    status,
    login: (username, password) => submit('/api/auth/login', { username, password }),
    register: (username, password, displayName) => submit('/api/auth/register', { username, password, displayName }),
    logout: async () => {
      await stopUserSync()
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
      // Full reload so no page keeps the previous user's data in React state.
      window.location.href = '/'
    },
    retry: () => { setStatus('loading'); setAttempt(a => a + 1) },
  }), [user, status, submit])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
