import React, { useEffect, useMemo, useRef, useState } from 'react'
import { RouteProp, useRoute } from '@react-navigation/native'
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fonts, radius, spacing } from '../theme'
import { useTheme } from '../lib/theme/ThemeContext'
import { useTranslation } from '../lib/i18n/LanguageContext'
import { RootStackParamList } from '../navigation'
import { ChatMessage, COACH_IDS, CoachId, CoachSettings, DEFAULT_COACH_SETTINGS, loadCoachSettings, saveCoachSettings } from '../lib/coach'
import { streamAnalysis, StreamError } from '../lib/streaming'
import MarkdownText from '../components/MarkdownText'
import TabBar from '../components/TabBar'

const COACH_ICON: Record<CoachId, string> = { sage: '🌿', atlas: '⛰', pip: '·' }

/** Coach Talk: pick a coach, tap a starter question or type one. Always shows the not-medical-advice line. */
export default function CoachScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Coach'>>()
  const { colors } = useTheme()
  const { t, tList, locale } = useTranslation()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [settings, setSettings] = useState<CoachSettings>(DEFAULT_COACH_SETTINGS)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState(route.params?.question ?? '')
  const [streaming, setStreaming] = useState(false)
  const [pending, setPending] = useState('')
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null)

  useEffect(() => { loadCoachSettings().then(setSettings) }, [])

  const pickCoach = (coach: CoachId) => {
    if (coach === settings.coach) return
    const next = { ...settings, coach }
    setSettings(next)
    saveCoachSettings(next)
    setMessages([])
  }

  const send = async (text?: string) => {
    const question = (text ?? input).trim()
    if (!question || streaming) return
    const history: ChatMessage[] = [...messages, { role: 'user', text: question }]
    setMessages(history)
    setInput('')
    setStreaming(true)
    setPending('')
    try {
      const formData = new FormData()
      formData.append('messages', JSON.stringify(history))
      formData.append('coach', settings.coach)
      formData.append('gentle', String(settings.gentle))
      formData.append('encourage', String(settings.encourage))
      formData.append('brevity', String(settings.brevity))
      formData.append('locale', locale)
      const reply = await streamAnalysis('/api/coach', formData, full => {
        setPending(full)
        scrollRef.current?.scrollToEnd({ animated: true })
      })
      setMessages([...history, { role: 'model', text: reply.trim() }])
    } catch (err) {
      const msg = err instanceof StreamError
        ? err.kind === 'network' ? t('errors.network') : err.kind === 'timeout' ? t('errors.timeout') : err.message || t('errors.generic')
        : t('errors.generic')
      setMessages([...history, { role: 'model', text: `⚠️ ${msg}` }])
    } finally {
      setPending('')
      setStreaming(false)
    }
  }

  const coachName = t(`coach.names.${settings.coach}`)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>{t('coach.title')}</Text>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity onPress={() => setMessages([])} style={styles.clearBtn}>
            <Text style={styles.clearText}>{t('coach.clear')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.banner} accessibilityRole="text">
        <Text style={styles.bannerText}>{t('coach.disclaimer')}</Text>
      </View>

      <View style={styles.coachRow}>
        {COACH_IDS.map(id => {
          const active = id === settings.coach
          return (
            <TouchableOpacity key={id} onPress={() => pickCoach(id)} style={[styles.coachChip, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              <Text style={[styles.coachChipName, active && { color: colors.onPrimary }]}>{COACH_ICON[id]} {t(`coach.names.${id}`)}</Text>
              <Text style={[styles.coachChipStyle, active && { color: colors.onPrimary, opacity: 0.85 }]}>{t(`coach.styles.${id}`)}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.chat} keyboardShouldPersistTaps="handled">
          <View style={[styles.bubble, styles.modelBubble]}>
            <Text style={styles.speaker}>{coachName}</Text>
            <Text style={styles.modelText}>{t(`coach.greetings.${settings.coach}`)}</Text>
          </View>

          {messages.length === 0 && (
            <View style={styles.starters}>
              {tList('coach.defaultQuestions').map(q => (
                <TouchableOpacity key={q} onPress={() => setInput(q)} style={styles.starter}>
                  <Text style={styles.starterText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {messages.map((m, i) => (
            <View key={i} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.modelBubble]}>
              {m.role === 'model' ? (
                <>
                  <Text style={styles.speaker}>{coachName}</Text>
                  <MarkdownText text={m.text} accent={colors.olive} />
                </>
              ) : (
                <Text style={styles.userText}>{m.text}</Text>
              )}
            </View>
          ))}

          {streaming && (
            <View style={[styles.bubble, styles.modelBubble]}>
              <Text style={styles.speaker}>{coachName}</Text>
              {pending ? <MarkdownText text={pending} accent={colors.olive} /> : (
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <ActivityIndicator color={colors.olive} size="small" />
                  <Text style={styles.modelText}>{t('coach.thinking')}</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t('coach.inputPlaceholder')}
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            multiline
            accessibilityLabel={t('coach.inputPlaceholder')}
          />
          <TouchableOpacity
            onPress={() => send()}
            disabled={!input.trim() || streaming}
            style={[styles.sendBtn, { backgroundColor: colors.primary }, (!input.trim() || streaming) && { opacity: 0.4 }]}
          >
            <Text style={[styles.sendText, { color: colors.onPrimary }]}>{t('coach.send')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <TabBar active="Coach" />
    </SafeAreaView>
  )
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    h1: { fontFamily: fonts.heading, fontSize: 30, color: colors.textPrimary },
    clearBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.full, backgroundColor: colors.cardAlt },
    clearText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },
    banner: { marginHorizontal: spacing.lg, marginTop: spacing.sm, paddingVertical: 8, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.sageSoft },
    bannerText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textPrimary },
    coachRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.md },
    coachChip: { flex: 1, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
    coachChipName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
    coachChipStyle: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginTop: 2 },
    chat: { padding: spacing.lg, gap: spacing.md },
    bubble: { maxWidth: '88%', borderRadius: radius.lg, padding: spacing.md },
    modelBubble: { alignSelf: 'flex-start', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderTopLeftRadius: 4 },
    userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderTopRightRadius: 4 },
    speaker: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.olive, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
    modelText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.textPrimary },
    userText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.onPrimary },
    starters: { gap: spacing.sm },
    starter: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.full, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.bg },
    starterText: { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
    input: {
      flex: 1, minHeight: 44, maxHeight: 120, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.lg,
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, fontFamily: fonts.body, fontSize: 15, color: colors.textPrimary,
    },
    sendBtn: { height: 44, paddingHorizontal: spacing.lg, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
    sendText: { fontFamily: fonts.bodyBold, fontSize: 15 },
  })
}
