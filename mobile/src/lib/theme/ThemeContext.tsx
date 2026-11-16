import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { darkColors, lightColors, ThemeColors } from '../../theme'

/** The resolved theme actually shown. */
export type Theme = 'light' | 'dark'
/** The user's choice: a fixed theme, or follow the system. */
export type ThemeMode = Theme | 'system'

const STORAGE_KEY = 'karmo_theme'

interface ThemeContextValue {
  theme: Theme
  mode: ThemeMode
  colors: ThemeColors
  setTheme: (theme: Theme) => void
  setMode: (mode: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme()
  const [mode, setModeState] = useState<ThemeMode>('system')

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(saved => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') setModeState(saved)
      })
      .catch(() => {})
  }, [])

  const theme: Theme = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode

  const setMode = (next: ThemeMode) => {
    setModeState(next)
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {})
  }

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    mode,
    colors: theme === 'dark' ? darkColors : lightColors,
    setTheme: setMode,
    setMode,
    toggleTheme: () => setMode(theme === 'dark' ? 'light' : 'dark'),
  }), [theme, mode])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
