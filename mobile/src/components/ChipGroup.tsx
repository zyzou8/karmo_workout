import React, { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { radius, spacing } from '../theme'
import { useTheme } from '../lib/theme/ThemeContext'

export default function ChipGroup({
  options,
  value,
  onChange,
  accent,
}: {
  options: string[]
  value: string
  onChange: (v: string) => void
  accent?: string
}) {
  const { colors } = useTheme()
  const resolvedAccent = accent || colors.violet
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <View style={styles.wrap}>
      {options.map(opt => {
        const active = opt === value
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            style={[
              styles.chip,
              active
                ? { backgroundColor: resolvedAccent, borderColor: resolvedAccent }
                : { backgroundColor: colors.cardAlt, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: radius.full,
      borderWidth: 1,
    },
    chipText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    chipTextActive: {
      color: '#ffffff',
      fontWeight: '600',
    },
  })
}
