import React from 'react'
import { StyleSheet, Text, TouchableOpacity } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '../lib/theme/ThemeContext'
import { useTranslation } from '../lib/i18n/LanguageContext'

/** Header action on detail screens: opens Settings (units, theme, language, coach, account). */
export default function HeaderActions() {
  const navigation = useNavigation()
  const { colors } = useTheme()
  const { t } = useTranslation()

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Settings' as never)}
      style={[styles.btn, { backgroundColor: colors.cardAlt }]}
      accessibilityLabel={t('settingsScreen.title')}
    >
      <Text style={[styles.icon, { color: colors.textPrimary }]}>⚙︎</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  btn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 17 },
})
