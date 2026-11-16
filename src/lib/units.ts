'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Display units. Data is always stored in kg / cm / kcal; these only change what the user sees and types.
 * North-America default is lbs and inches (karmo-olive-app.pptx, Settings & units).
 */
export interface UnitPrefs {
  weight: 'lb' | 'kg'
  length: 'in' | 'cm'
  energy: 'kcal'
}

export const DEFAULT_UNITS: UnitPrefs = { weight: 'lb', length: 'in', energy: 'kcal' }

const UNITS_KEY = 'karmo_units'
const CHANGE_EVENT = 'karmo-units-change'
const LB_PER_KG = 2.20462
const CM_PER_IN = 2.54

export function loadUnits(): UnitPrefs {
  try {
    const saved = localStorage.getItem(UNITS_KEY)
    if (saved) return { ...DEFAULT_UNITS, ...JSON.parse(saved) }
  } catch {}
  return DEFAULT_UNITS
}

export function saveUnits(units: UnitPrefs) {
  try {
    localStorage.setItem(UNITS_KEY, JSON.stringify(units))
  } catch {}
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** Current unit preferences, updated live when Settings changes them. */
export function useUnits(): [UnitPrefs, (next: UnitPrefs) => void] {
  const [units, setUnits] = useState<UnitPrefs>(DEFAULT_UNITS)
  useEffect(() => {
    const sync = () => setUnits(loadUnits())
    sync()
    window.addEventListener(CHANGE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  const update = useCallback((next: UnitPrefs) => {
    setUnits(next)
    saveUnits(next)
  }, [])
  return [units, update]
}

const round1 = (n: number) => Math.round(n * 10) / 10

export const kgToDisplay = (kg: number, unit: UnitPrefs['weight']) => round1(unit === 'lb' ? kg * LB_PER_KG : kg)
export const displayToKg = (value: number, unit: UnitPrefs['weight']) => (unit === 'lb' ? value / LB_PER_KG : value)
export const cmToDisplay = (cm: number, unit: UnitPrefs['length']) => round1(unit === 'in' ? cm / CM_PER_IN : cm)
export const displayToCm = (value: number, unit: UnitPrefs['length']) => (unit === 'in' ? value * CM_PER_IN : value)

export function formatWeight(kg: number, unit: UnitPrefs['weight']): string {
  return `${kgToDisplay(kg, unit)} ${unit === 'lb' ? 'lbs' : 'kg'}`
}

export const weightLabel = (unit: UnitPrefs['weight']) => (unit === 'lb' ? 'lbs' : 'kg')
