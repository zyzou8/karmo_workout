import React, { useMemo, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from '../lib/theme/ThemeContext'
import { radius, spacing } from '../theme'

interface CalendarPickerProps {
  locale: string
  selected: Date
  onSelect: (date: Date) => void
  getDots: (date: Date) => string[]
}

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString()
}

export function CalendarPicker({ locale, selected, onSelect, getDots }: CalendarPickerProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [viewDate, setViewDate] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1))

  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' })
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2021, 7, i + 1)))
  }, [locale])

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(viewDate),
    [locale, viewDate]
  )

  const cells = useMemo(() => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const firstWeekday = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const result: { date: Date; inMonth: boolean }[] = []
    for (let i = firstWeekday - 1; i >= 0; i--) {
      result.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      result.push({ date: new Date(year, month, d), inMonth: true })
    }
    while (result.length % 7 !== 0 || result.length < 42) {
      const last = result[result.length - 1].date
      result.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false })
    }
    return result
  }, [viewDate])

  const today = new Date()

  return (
    <View>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          style={styles.navBtn}
        >
          <Text style={styles.navBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity
          onPress={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          style={styles.navBtn}
        >
          <Text style={styles.navBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {weekdayLabels.map((label, i) => (
          <Text key={i} style={styles.weekdayLabel}>{label}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map(({ date, inMonth }, i) => {
          const dots = getDots(date)
          const isSelected = sameDay(date, selected)
          const isToday = sameDay(date, today)
          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.cell,
                isSelected && { backgroundColor: colors.violet },
                !isSelected && isToday && { backgroundColor: colors.violetSoft },
              ]}
              onPress={() => onSelect(date)}
            >
              <Text
                style={[
                  styles.cellText,
                  !inMonth && { color: colors.textFaint },
                  isSelected && { color: '#fff', fontWeight: '700' },
                  !isSelected && isToday && { color: colors.violet, fontWeight: '600' },
                ]}
              >
                {date.getDate()}
              </Text>
              <View style={styles.dotsRow}>
                {dots.slice(0, 3).map((c, di) => (
                  <View key={di} style={[styles.dot, { backgroundColor: isSelected ? '#fff' : c }]} />
                ))}
              </View>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
    navBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    navBtnText: { color: colors.textSecondary, fontSize: 18 },
    monthLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
    weekdayRow: { flexDirection: 'row', marginBottom: 4 },
    weekdayLabel: { flex: 1, textAlign: 'center', color: colors.textFaint, fontSize: 11, fontWeight: '500', paddingVertical: 4 },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      gap: 2,
    },
    cellText: { color: colors.textSecondary, fontSize: 13 },
    dotsRow: { flexDirection: 'row', gap: 2, height: 4 },
    dot: { width: 4, height: 4, borderRadius: 2 },
  })
}
