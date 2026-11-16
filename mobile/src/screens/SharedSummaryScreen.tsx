import React, { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useTheme } from '../lib/theme/ThemeContext'
import { useTranslation } from '../lib/i18n/LanguageContext'
import { RootStackParamList } from '../navigation'
import TopBar from '../components/TopBar'
import BodySummaryView from '../components/BodySummaryView'
import { spacing, fonts } from '../theme'

/** Read-only, Apple Fitness–style view of a scoped snapshot — what the recipient of a share link sees. */
export default function SharedSummaryScreen({ route }: NativeStackScreenProps<RootStackParamList, 'SharedSummary'>) {
  const { summary } = route.params
  const { colors } = useTheme()
  const { t, locale } = useTranslation()
  const styles = useMemo(() => createStyles(colors), [colors])
  const rangeFmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  const initial = summary.name?.trim().charAt(0).toUpperCase()

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar icon="↗" title={t('share.preview')} accent={colors.violetDark} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.via}>{t('share.sharedVia')}</Text>
        <View style={styles.header}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial || '🏋️'}</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.h1}>
              {summary.name ? t('share.weekOf').replace('{name}', summary.name) : t('share.anonymousWeek')}
            </Text>
            <Text style={styles.subtitle}>
              {rangeFmt.format(new Date(summary.fromISO))} – {rangeFmt.format(new Date(summary.toISO))}
            </Text>
          </View>
        </View>

        <BodySummaryView summary={summary} mode="shared" />

        <Text style={styles.note}>
          {t('share.snapshotNote').replace('{date}', dateFmt.format(new Date(summary.toISO)))}
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
    via: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.md },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
    avatarRing: { width: 56, height: 56, borderRadius: 28, padding: 3, backgroundColor: colors.violet },
    avatar: { flex: 1, borderRadius: 25, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    h1: { fontSize: 24, fontFamily: fonts.heading, color: colors.textPrimary },
    subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    note: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  })
}
