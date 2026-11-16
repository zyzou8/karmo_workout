import React, { useMemo, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from '../lib/theme/ThemeContext'
import { useTranslation } from '../lib/i18n/LanguageContext'
import { DISCLAIMER_SECTION_KEYS } from '../lib/disclaimer'
import { spacing, radius } from '../theme'

/** Emergency banner plus one expandable row per disclaimer section. */
export default function DisclaimerSummary() {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.emergency} accessibilityRole="alert">
        <Text style={styles.emergencyText}>🚨 {t('disclaimer.emergency')}</Text>
      </View>
      <View style={styles.list}>
        {DISCLAIMER_SECTION_KEYS.map((key, i) => {
          const open = expanded.has(key)
          return (
            <View key={key} style={i > 0 ? styles.rowDivider : undefined}>
              <TouchableOpacity onPress={() => toggle(key)} style={styles.row} accessibilityState={{ expanded: open }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{t(`disclaimer.sections.${key}.title`)}</Text>
                  <Text style={styles.summary}>{t(`disclaimer.sections.${key}.summary`)}</Text>
                </View>
                <Text style={styles.toggle}>
                  {open ? `${t('common.showLess')} ▴` : `${t('common.showMore')} ▾`}
                </Text>
              </TouchableOpacity>
              {open && <Text style={styles.details}>{t(`disclaimer.sections.${key}.details`)}</Text>}
            </View>
          )
        })}
      </View>
    </View>
  )
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    emergency: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
      borderWidth: 1,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    emergencyText: { color: colors.red, fontSize: 14, fontWeight: '600', lineHeight: 20 },
    list: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md },
    title: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    summary: { fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
    toggle: { fontSize: 12, fontWeight: '600', color: colors.violet, marginTop: 2 },
    details: {
      fontSize: 13,
      lineHeight: 20,
      color: colors.textSecondary,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
  })
}
