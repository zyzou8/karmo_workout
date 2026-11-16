import React, { useEffect, useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '../lib/theme/ThemeContext'
import { useTranslation } from '../lib/i18n/LanguageContext'
import { BodySummary, ShareSection, encodeShareFragment, scopeSummary } from '../lib/bodySummaryCore'
import { API_BASE_URL } from '../lib/api'
import { radius, spacing } from '../theme'

const NAME_KEY = 'karmo_share_name'
const SECTIONS: ShareSection[] = ['form', 'body', 'fuel']

/** Share links open the web app's read-only /share page; override the host for production builds. */
const SHARE_BASE_URL = process.env.EXPO_PUBLIC_SHARE_BASE_URL || API_BASE_URL

interface Props {
  summary: BodySummary
  visible: boolean
  onClose: () => void
  onPreview: (scoped: BodySummary) => void
}

export default function ShareSheet({ summary, visible, onClose, onPreview }: Props) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [name, setName] = useState('')
  const [include, setInclude] = useState<Record<ShareSection, boolean>>({ form: true, body: false, fuel: true })

  useEffect(() => {
    AsyncStorage.getItem(NAME_KEY).then(saved => { if (saved) setName(saved) }).catch(() => {})
  }, [])

  const scoped = useMemo(() => scopeSummary(summary, include, name), [summary, include, name])
  const url = `${SHARE_BASE_URL}/share#${encodeShareFragment(scoped)}`

  const rememberName = () => AsyncStorage.setItem(NAME_KEY, name.trim()).catch(() => {})

  const share = async () => {
    rememberName()
    try {
      await Share.share({ message: `${t('share.title')}\n${url}`, url })
    } catch {}
  }

  const sectionLabel: Record<ShareSection, string> = {
    form: t('overview.form'),
    body: `${t('overview.weight')} / ${t('overview.bodyFat')}`,
    fuel: t('overview.fuel'),
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{t('share.title')}</Text>
            <Text style={styles.subtitle}>{t('share.subtitle')}</Text>

            <Text style={styles.label}>{t('share.nameLabel')}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={40}
              placeholder={t('share.namePlaceholder')}
              placeholderTextColor={colors.textFaint}
              style={styles.input}
            />

            <Text style={styles.label}>{t('share.include')}</Text>
            {SECTIONS.map(section => (
              <View key={section} style={styles.toggleRow}>
                <Text style={styles.toggleText}>{sectionLabel[section]}</Text>
                <Switch
                  value={include[section]}
                  onValueChange={v => setInclude(prev => ({ ...prev, [section]: v }))}
                  trackColor={{ true: colors.violet, false: colors.borderLight }}
                />
              </View>
            ))}
            <Text style={styles.hint}>{t('share.alwaysIncluded')}</Text>
            <Text style={[styles.hint, { color: colors.amber }]}>{t('share.privacyNote')}</Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={share}>
                <Text style={styles.primaryText}>{t('share.shareNative')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => { rememberName(); onPreview(scoped) }}>
                <Text style={styles.secondaryText}>{t('share.preview')}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.hint}>{t('share.close')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
      maxHeight: '90%',
      backgroundColor: colors.card,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.border,
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    subtitle: { fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginTop: spacing.xs },
    label: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: spacing.lg, marginBottom: spacing.sm },
    input: {
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.textPrimary,
      backgroundColor: colors.cardAlt,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cardAlt,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      marginBottom: spacing.sm,
    },
    toggleText: { fontSize: 14, color: colors.textSecondary },
    hint: { fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'left' },
    buttonRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
    primaryBtn: { backgroundColor: colors.violet, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center' },
    primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    secondaryBtn: {
      borderRadius: radius.md,
      paddingVertical: 13,
      paddingHorizontal: spacing.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
      backgroundColor: colors.cardAlt,
    },
    secondaryText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
    closeBtn: { alignItems: 'center', paddingVertical: spacing.md },
  })
}
