'use client'

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react'

/** What the user picked. 'system' follows the OS setting live. */
export type ThemeMode = 'light' | 'dark' | 'system'
/** What is actually on screen. */
export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'karmo_theme'

function systemTheme(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

interface ThemeContextValue {
  mode: ThemeMode
  theme: Theme
  setMode: (mode: ThemeMode) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system')
  const [system, setSystem] = useState<Theme>('light')

  useEffect(() => {
    setSystem(systemTheme())
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'light' || saved === 'dark' || saved === 'system') setModeState(saved)
    } catch {}
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const onChange = () => setSystem(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const theme: Theme = mode === 'system' ? system : mode

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const value = useMemo<ThemeContextValue>(() => {
    const setMode = (next: ThemeMode) => {
      setModeState(next)
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {}
    }
    return {
      mode,
      theme,
      setMode,
      setTheme: setMode,
      toggleTheme: () => setMode(theme === 'dark' ? 'light' : 'dark'),
    }
  }, [mode, theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
