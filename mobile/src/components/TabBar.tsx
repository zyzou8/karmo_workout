import React, { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../lib/theme/ThemeContext'
import { useTranslation } from '../lib/i18n/LanguageContext'
import { fonts } from '../theme'
import type { RootStackParamList } from '../navigation'

export type TabRoute = 'Home' | 'Train' | 'Insight' | 'Coach' | 'Profile'

const TABS: { route: TabRoute; icon: string; labelKey: string }[] = [
  { route: 'Home', icon: '⌂', labelKey: 'tabs.home' },
  { route: 'Train', icon: '◎', labelKey: 'tabs.train' },
  { route: 'Insight', icon: '◔', labelKey: 'tabs.insight' },
  { route: 'Coach', icon: '❝', labelKey: 'tabs.coach' },
  { route: 'Profile', icon: '◯', labelKey: 'tabs.me' },
]

/** Bottom tab bar: Home · Train · Insight · Coach · Me. Rendered by each tab screen. */
export default function TabBar({ active }: { active: TabRoute }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { colors } = useTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map(tab => {
        const isActive = tab.route === active
        return (
          <TouchableOpacity
            key={tab.route}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={t(tab.labelKey)}
            onPress={() => {
              if (isActive) return
              // Tabs replace each other so the back stack doesn't grow with every tap.
              navigation.reset({ index: 0, routes: [{ name: tab.route }] })
            }}
          >
            <View style={[styles.iconWrap, isActive && { backgroundColor: colors.sageSoft }]}>
              <Text style={[styles.icon, { color: isActive ? colors.primary : colors.textMuted }]}>{tab.icon}</Text>
            </View>
            <Text style={[styles.label, { color: isActive ? colors.textPrimary : colors.textMuted }, isActive && { fontFamily: fonts.bodyBold }]}>
              {t(tab.labelKey)}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 6,
    },
    tab: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 2 },
    iconWrap: { width: 44, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    icon: { fontSize: 17 },
    label: { fontSize: 11, fontFamily: fonts.body },
  })
}
