import React, { ReactNode, useMemo } from 'react'
import { useNavigation } from '@react-navigation/native'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from '../lib/theme/ThemeContext'
import { fonts, spacing } from '../theme'

/** Header for detail screens: back chevron, title, optional actions. */
export default function TopBar({
  icon,
  title,
  accent,
  actions,
}: {
  icon?: string
  title: string
  accent?: string
  actions?: ReactNode
}) {
  const navigation = useNavigation()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack()
    else navigation.navigate('Home' as never)
  }

  return (
    <View style={styles.bar}>
      <View style={styles.leftGroup}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} accessibilityLabel="Back">
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          {icon ? (
            <View style={[styles.iconBox, { backgroundColor: accent || colors.sageSoft }]}>
              <Text style={styles.icon}>{icon}</Text>
            </View>
          ) : null}
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>
      </View>
      {actions && <View style={styles.actions}>{actions}</View>}
    </View>
  )
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      paddingTop: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    leftGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 1 },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.cardAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backText: { color: colors.textPrimary, fontSize: 24, lineHeight: 26, marginTop: -2 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
    iconBox: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    icon: { fontSize: 14 },
    title: { color: colors.textPrimary, fontFamily: fonts.heading, fontSize: 19, flexShrink: 1 },
    actions: { flexDirection: 'row', alignItems: 'center' },
  })
}
