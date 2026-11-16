import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native'
import { useTheme } from '../lib/theme/ThemeContext'
import { useTranslation } from '../lib/i18n/LanguageContext'
import { fonts, radius, spacing } from '../theme'

const PRESETS = [30, 60, 90, 120]

function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Rest timer: 30/60/90/120 s presets, ±5 s, start / pause / reset. */
export default function RestTimerModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [total, setTotal] = useState(90)
  const [left, setLeft] = useState(90)
  const [running, setRunning] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!running) return
    timer.current = setInterval(() => {
      setLeft(prev => {
        if (prev <= 1) {
          setRunning(false)
          Vibration.vibrate(400)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [running])

  const pick = (sec: number) => {
    setTotal(sec)
    setLeft(sec)
    setRunning(false)
  }
  const adjust = (delta: number) => {
    setLeft(prev => Math.max(0, prev + delta))
    setTotal(prev => Math.max(5, prev + delta))
  }
  const reset = () => {
    setRunning(false)
    setLeft(total)
  }

  const progress = total ? left / total : 0

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <Text style={styles.title}>{t('restTimer.title')}</Text>

          <View style={styles.clockWrap}>
            <Text style={styles.clock} accessibilityLiveRegion="polite">{fmt(left)}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            {left === 0 && <Text style={styles.done}>{t('restTimer.done')}</Text>}
          </View>

          <View style={styles.row}>
            {PRESETS.map(sec => (
              <TouchableOpacity
                key={sec}
                onPress={() => pick(sec)}
                style={[styles.preset, total === sec && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              >
                <Text style={[styles.presetText, total === sec && { color: colors.onPrimary }]}>{sec}s</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            <TouchableOpacity style={styles.adjust} onPress={() => adjust(-5)}>
              <Text style={styles.adjustText}>−5s</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.main, { backgroundColor: colors.primary }]} onPress={() => (left === 0 ? reset() : setRunning(r => !r))}>
              <Text style={[styles.mainText, { color: colors.onPrimary }]}>
                {running ? t('restTimer.pause') : t('restTimer.start')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.adjust} onPress={() => adjust(5)}>
              <Text style={styles.adjustText}>+5s</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <TouchableOpacity style={styles.ghost} onPress={reset}>
              <Text style={styles.ghostText}>{t('restTimer.reset')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghost} onPress={onClose}>
              <Text style={styles.ghostText}>{t('restTimer.close')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.xl,
      paddingBottom: spacing.xxl + spacing.lg,
      gap: spacing.lg,
    },
    title: { fontFamily: fonts.heading, fontSize: 22, color: colors.textPrimary },
    clockWrap: { alignItems: 'center', gap: spacing.md },
    clock: { fontFamily: fonts.heading, fontSize: 64, color: colors.textPrimary },
    track: { width: '100%', height: 8, borderRadius: 4, backgroundColor: colors.cardAlt, overflow: 'hidden' },
    fill: { height: '100%', backgroundColor: colors.leaf },
    done: { fontFamily: fonts.bodyBold, color: colors.olive, fontSize: 14 },
    row: { flexDirection: 'row', gap: spacing.sm },
    preset: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardAlt,
      alignItems: 'center',
    },
    presetText: { fontFamily: fonts.bodyBold, color: colors.textSecondary, fontSize: 15 },
    adjust: {
      width: 72,
      paddingVertical: 16,
      borderRadius: radius.md,
      backgroundColor: colors.cardAlt,
      alignItems: 'center',
    },
    adjustText: { fontFamily: fonts.bodyBold, color: colors.textPrimary, fontSize: 15 },
    main: { flex: 1, paddingVertical: 16, borderRadius: radius.md, alignItems: 'center' },
    mainText: { fontFamily: fonts.bodyBold, fontSize: 16 },
    ghost: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    ghostText: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 14 },
  })
}
