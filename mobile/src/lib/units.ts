import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Display-unit preferences. Data is always stored in kg / cm; these only change
 * what the user sees and types. North-America default: lb and in.
 */
export type WeightUnit = 'lb' | 'kg'
export type LengthUnit = 'in' | 'cm'
export type EnergyUnit = 'kcal'

export interface UnitPrefs {
  weight: WeightUnit
  length: LengthUnit
  energy: EnergyUnit
}

export const DEFAULT_UNITS: UnitPrefs = { weight: 'lb', length: 'in', energy: 'kcal' }

const UNITS_KEY = 'karmo_units'
const KG_PER_LB = 0.45359237
const CM_PER_IN = 2.54

export async function loadUnits(): Promise<UnitPrefs> {
  try {
    const saved = await AsyncStorage.getItem(UNITS_KEY)
    if (saved) return { ...DEFAULT_UNITS, ...JSON.parse(saved) }
  } catch {
    // fall through to defaults
  }
  return DEFAULT_UNITS
}

export async function saveUnits(units: UnitPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(UNITS_KEY, JSON.stringify(units))
  } catch {
    // best-effort persistence
  }
}

const round1 = (n: number) => Math.round(n * 10) / 10

export function kgToDisplay(kg: number, unit: WeightUnit): number {
  return round1(unit === 'lb' ? kg / KG_PER_LB : kg)
}

export function displayToKg(value: number, unit: WeightUnit): number {
  return unit === 'lb' ? value * KG_PER_LB : value
}

export function cmToDisplay(cm: number, unit: LengthUnit): number {
  return round1(unit === 'in' ? cm / CM_PER_IN : cm)
}

export function displayToCm(value: number, unit: LengthUnit): number {
  return unit === 'in' ? value * CM_PER_IN : value
}

export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${kgToDisplay(kg, unit)} ${unit}`
}

/** Units preference with live save; screens re-read on mount. */
export function useUnits(): [UnitPrefs, (next: UnitPrefs) => void] {
  const [units, setUnitsState] = useState<UnitPrefs>(DEFAULT_UNITS)
  useEffect(() => {
    loadUnits().then(setUnitsState)
  }, [])
  const setUnits = useCallback((next: UnitPrefs) => {
    setUnitsState(next)
    saveUnits(next)
  }, [])
  return [units, setUnits]
}
