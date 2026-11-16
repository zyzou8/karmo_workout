import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Localization from 'expo-localization'
import { DICTIONARIES, Dictionary, Locale } from './translations'

const STORAGE_KEY = 'karmo_locale'

function detectDefaultLocale(): Locale {
  const tag = Localization.getLocales()[0]?.languageTag || ''
  if (tag.toLowerCase().startsWith('zh')) {
    return /^zh-(TW|HK|MO)/i.test(tag) ? 'zh-TW' : 'zh-CN'
  }
  const base = tag.slice(0, 2).toLowerCase()
  if (base === 'fr' || base === 'ja' || base === 'ko' || base === 'es' || base === 'de') return base
  return 'en'
}

function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

interface LanguageContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (path: string) => string
  tList: (path: string) => string[]
  dict: Dictionary
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(saved => {
        if (saved && saved in DICTIONARIES) {
          setLocaleState(saved as Locale)
        } else {
          setLocaleState(detectDefaultLocale())
        }
      })
      .catch(() => setLocaleState(detectDefaultLocale()))
  }, [])

  const setLocale = (next: Locale) => {
    setLocaleState(next)
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {})
  }

  const value = useMemo<LanguageContextValue>(() => {
    const dict = DICTIONARIES[locale]
    const en = DICTIONARIES.en
    const t = (path: string) => {
      const val = getByPath(dict, path) ?? getByPath(en, path)
      return typeof val === 'string' ? val : path
    }
    const tList = (path: string) => {
      const val = getByPath(dict, path) ?? getByPath(en, path)
      return Array.isArray(val) ? (val as string[]) : []
    }
    return { locale, setLocale, t, tList, dict }
  }, [locale])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useTranslation() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useTranslation must be used within a LanguageProvider')
  return ctx
}
