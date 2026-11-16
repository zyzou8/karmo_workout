import React, { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from '../lib/theme/ThemeContext'
import { useTranslation } from '../lib/i18n/LanguageContext'
import { LOCALES, Locale } from '../lib/i18n/translations'
import { spacing, radius } from '../theme'
import { DisclaimerAcceptance, loadDisclaimerAcceptance } from '../lib/disclaimer'
import DisclaimerSummary from './DisclaimerSummary'

export default function SettingsSheet() {
  const [open, setOpen] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [acceptance, setAcceptance] = useState<DisclaimerAcceptance | null>(null)
  const { theme, setTheme, colors } = useTheme()
  const { locale, setLocale, t } = useTranslation()

  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} style={styles.trigger} accessibilityLabel={t('settings.label')}>
        <Text style={styles.triggerIcon}>⚙️</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('settings.appearance')}</Text>
            <View style={styles.row}>
              <TouchableOpacity
                onPress={() => setTheme('light')}
                style={[
                  styles.pill,
                  { backgroundColor: theme === 'light' ? colors.violet : colors.cardAlt },
                ]}
              >
                <Text style={{ color: theme === 'light' ? '#fff' : colors.textSecondary, fontSize: 13, fontWeight: '500' }}>
                  ☀️ {t('settings.light')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTheme('dark')}
                style={[
                  styles.pill,
                  { backgroundColor: theme === 'dark' ? colors.violet : colors.cardAlt },
                ]}
              >
                <Text style={{ color: theme === 'dark' ? '#fff' : colors.textSecondary, fontSize: 13, fontWeight: '500' }}>
                  🌙 {t('settings.dark')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('settings.language')}</Text>
            {LOCALES.map((l: { value: Locale; label: string }) => (
              <TouchableOpacity
                key={l.value}
                onPress={() => { setLocale(l.value); setOpen(false) }}
                style={[
                  styles.langRow,
                  { backgroundColor: locale === l.value ? colors.cardAlt : 'transparent' },
                ]}
              >
                <Text style={{ color: locale === l.value ? colors.textPrimary : colors.textSecondary, fontSize: 14 }}>
                  {l.label}
                </Text>
                {locale === l.value && <Text style={{ color: colors.violet }}>✓</Text>}
              </TouchableOpacity>
            ))}

            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              onPress={() => {
                setOpen(false)
                loadDisclaimerAcceptance().then(setAcceptance)
                setShowDisclaimer(true)
              }}
              style={styles.langRow}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>📄 {t('settings.viewDisclaimer')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showDisclaimer} animationType="slide" transparent onRequestClose={() => setShowDisclaimer(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, styles.disclaimerSheet, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <ScrollView contentContainerStyle={{ paddingBottom: spacing.lg }}>
              <Text style={[styles.disclaimerTitle, { color: colors.textPrimary }]}>{t('disclaimer.title')}</Text>
              {acceptance && (
                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: spacing.md }}>
                  {t('disclaimer.acceptedOn')}: {new Date(acceptance.acceptedAtISO).toLocaleDateString(locale)}
                </Text>
              )}
              <DisclaimerSummary />
            </ScrollView>
            <TouchableOpacity
              onPress={() => setShowDisclaimer(false)}
              style={[styles.pill, { backgroundColor: colors.cardAlt, flex: 0 }]}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>{t('disclaimer.closeButton')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  trigger: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerIcon: {
    fontSize: 16,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
  },
  disclaimerSheet: {
    maxHeight: '90%',
    paddingBottom: spacing.xl,
  },
  disclaimerTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
})
