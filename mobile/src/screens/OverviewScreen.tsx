import React, { useCallback, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTheme } from '../lib/theme/ThemeContext'
import { useTranslation } from '../lib/i18n/LanguageContext'
import { BodySummary, buildBodySummary } from '../lib/bodySummary'
import { RootStackParamList } from '../navigation'
import TopBar from '../components/TopBar'
import HeaderActions from '../components/HeaderActions'
import BodySummaryView from '../components/BodySummaryView'
import ShareSheet from '../components/ShareSheet'
import { radius, spacing, fonts } from '../theme'

export default function OverviewScreen() {
  const { colors } = useTheme()
  const { t, locale } = useTranslation()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [summary, setSummary] = useState<BodySummary | null>(null)
  const [sharing, setSharing] = useState(false)

  // Rebuild whenever the screen regains focus so newly logged workouts and meals show up.
  useFocusEffect(useCallback(() => {
    buildBodySummary().then(setSummary)
  }, []))

  const rangeFmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopBar icon="🫀" title={t('overview.title')} accent={colors.violetDark} actions={<HeaderActions />} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.h1}>{t('overview.title')}</Text>
            <Text style={styles.subtitle}>
              {t('overview.subtitle')}
              {summary && ` · ${rangeFmt.format(new Date(summary.fromISO))} – ${rangeFmt.format(new Date(summary.toISO))}`}
            </Text>
          </View>
          <TouchableOpacity style={[styles.shareBtn, !summary && { opacity: 0.4 }]} disabled={!summary} onPress={() => setSharing(true)}>
            <Text style={styles.shareText}>↗ {t('overview.shareButton')}</Text>
          </TouchableOpacity>
        </View>
        {summary && <BodySummaryView summary={summary} mode="owner" />}
      </ScrollView>

      {summary && (
        <ShareSheet
          summary={summary}
          visible={sharing}
          onClose={() => setSharing(false)}
          onPreview={scoped => {
            setSharing(false)
            navigation.navigate('SharedSummary', { summary: scoped })
          }}
        />
      )}
    </SafeAreaView>
  )
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
    header: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, marginBottom: spacing.lg },
    h1: { fontSize: 26, fontFamily: fonts.heading, color: colors.textPrimary },
    subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    shareBtn: { backgroundColor: colors.violet, borderRadius: radius.md, paddingVertical: 9, paddingHorizontal: spacing.lg },
    shareText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  })
}
