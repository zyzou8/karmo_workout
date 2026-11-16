import React, { useMemo, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from '../lib/theme/ThemeContext'
import { useTranslation } from '../lib/i18n/LanguageContext'

type Block =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'li'; text: string }
  | { type: 'tr'; cells: string[] }
  | { type: 'p'; text: string }

function isSeparatorRow(cells: string[]) {
  return cells.every(c => /^:?-+:?$/.test(c))
}

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = []
  let paragraph: string[] = []

  const flush = () => {
    if (paragraph.length) {
      blocks.push({ type: 'p', text: paragraph.join(' ') })
      paragraph = []
    }
  }

  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) {
      flush()
      continue
    }
    if (line.startsWith('## ')) {
      flush()
      blocks.push({ type: 'h2', text: line.slice(3) })
      continue
    }
    if (line.startsWith('### ')) {
      flush()
      blocks.push({ type: 'h3', text: line.slice(4) })
      continue
    }
    if (line.startsWith('- ')) {
      flush()
      blocks.push({ type: 'li', text: line.slice(2) })
      continue
    }
    if (line.startsWith('|') && line.endsWith('|')) {
      flush()
      const cells = line.split('|').map(c => c.trim()).filter(Boolean)
      if (isSeparatorRow(cells)) continue
      blocks.push({ type: 'tr', cells })
      continue
    }
    paragraph.push(line)
  }
  flush()
  return blocks
}

function renderInline(text: string, key: string, baseStyle: object, boldStyle: object) {
  const parts = text.split(/(\*\*.+?\*\*)/g).filter(Boolean)
  return (
    <Text key={key} style={baseStyle}>
      {parts.map((part, i) => {
        const isBold = part.startsWith('**') && part.endsWith('**')
        return (
          <Text key={i} style={isBold ? boldStyle : undefined}>
            {isBold ? part.slice(2, -2) : part}
          </Text>
        )
      })}
    </Text>
  )
}

/** Responses shorter than this are shown in full without collapsible sections. */
const COLLAPSE_THRESHOLD_CHARS = 600

interface Section {
  heading: Block | null
  body: Block[]
  children: Section[]
}

/** Groups blocks into `##` sections, each holding its intro blocks and `###` subsections. */
function groupSections(blocks: Block[]): Section[] {
  const sections: Section[] = []
  let current: Section = { heading: null, body: [], children: [] }
  let target = current
  const pushCurrent = () => {
    if (current.heading || current.body.length || current.children.length) sections.push(current)
  }
  for (const block of blocks) {
    if (block.type === 'h2') {
      pushCurrent()
      current = { heading: block, body: [], children: [] }
      target = current
    } else if (block.type === 'h3') {
      target = { heading: block, body: [], children: [] }
      current.children.push(target)
    } else {
      target.body.push(block)
    }
  }
  pushCurrent()
  return sections
}

export default function MarkdownText({ text, accent }: { text: string; accent?: string }) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const resolvedAccent = accent || colors.violet
  const styles = useMemo(() => createStyles(colors), [colors])
  const [toggled, setToggled] = useState<Set<string>>(new Set())
  const blocks = parseBlocks(text)

  const renderBlocks = (list: Block[], keyPrefix: string) => {
    const nodes: React.ReactNode[] = []
    let tableBuffer: string[][] = []

    const flushTable = (key: string) => {
      if (!tableBuffer.length) return
      nodes.push(
        <View key={key} style={[styles.table, { borderColor: colors.border }]}>
          {tableBuffer.map((cells, r) => (
            <View key={r} style={[styles.tr, r % 2 === 1 && { backgroundColor: colors.cardAlt }]}>
              {cells.map((c, ci) => (
                <Text
                  key={ci}
                  style={[styles.td, ci === 0 && styles.tdFirst, { flex: ci === 0 ? 1.3 : 1 }]}
                >
                  {c}
                </Text>
              ))}
            </View>
          ))}
        </View>,
      )
      tableBuffer = []
    }

    list.forEach((block, idx) => {
      const i = `${keyPrefix}-${idx}`
      if (block.type === 'tr') {
        tableBuffer.push(block.cells)
        return
      }
      flushTable(`table-${i}`)

      if (block.type === 'h2') {
        nodes.push(
          <Text key={i} style={[styles.h2, { color: resolvedAccent }]}>
            {block.text}
          </Text>,
        )
      } else if (block.type === 'h3') {
        nodes.push(
          <Text key={i} style={styles.h3}>
            {block.text}
          </Text>,
        )
      } else if (block.type === 'li') {
        nodes.push(
          <View key={i} style={styles.liRow}>
            <View style={[styles.bullet, { backgroundColor: resolvedAccent }]} />
            {renderInline(block.text, `li-${i}`, styles.liText, styles.bold)}
          </View>,
        )
      } else {
        nodes.push(renderInline(block.text, `p-${i}`, styles.p, styles.bold))
      }
    })
    flushTable(`table-${keyPrefix}-end`)
    return nodes
  }

  const notice = <Text style={[styles.notice, { borderTopColor: colors.border }]}>{t('disclaimer.aiNotice')}</Text>

  if (text.length < COLLAPSE_THRESHOLD_CHARS) {
    return (
      <View>
        {renderBlocks(blocks, 'all')}
        {notice}
      </View>
    )
  }

  // The first section (title + intro) starts open; everything else starts collapsed.
  const isOpen = (id: string, defaultOpen: boolean) => toggled.has(id) !== defaultOpen
  const toggle = (id: string) =>
    setToggled(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const renderSection = (section: Section, id: string, defaultOpen: boolean): React.ReactNode => {
    const open = !section.heading || isOpen(id, defaultOpen)
    const heading = section.heading
    const isH2 = heading?.type === 'h2'
    return (
      <View key={id} style={!isH2 && heading ? styles.subsection : undefined}>
        {heading && (heading.type === 'h2' || heading.type === 'h3') && (
          <TouchableOpacity onPress={() => toggle(id)} style={styles.headingRow} accessibilityState={{ expanded: open }}>
            <Text style={[isH2 ? styles.h2 : styles.h3, isH2 && { color: resolvedAccent }, styles.headingText]}>
              {heading.text}
            </Text>
            <Text style={[styles.toggleLabel, { color: colors.violet }]}>
              {open ? `${t('common.showLess')} ▴` : `${t('common.showMore')} ▾`}
            </Text>
          </TouchableOpacity>
        )}
        {open && (
          <>
            {renderBlocks(section.body, id)}
            {section.children.map((child, ci) => renderSection(child, `${id}.${ci}`, false))}
          </>
        )}
      </View>
    )
  }

  return (
    <View>
      {groupSections(blocks).map((section, i) => renderSection(section, String(i), i === 0))}
      {notice}
    </View>
  )
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    h2: {
      fontSize: 17,
      fontWeight: '700',
      marginTop: 14,
      marginBottom: 6,
    },
    h3: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
      marginTop: 10,
      marginBottom: 4,
    },
    p: {
      fontSize: 14,
      lineHeight: 21,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    liRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 6,
      gap: 8,
    },
    bullet: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginTop: 7,
    },
    liText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    bold: {
      fontWeight: '700',
      color: colors.textPrimary,
    },
    table: {
      borderWidth: 1,
      borderRadius: 8,
      overflow: 'hidden',
      marginVertical: 8,
    },
    tr: {
      flexDirection: 'row',
    },
    td: {
      flex: 1,
      fontSize: 13,
      color: colors.textSecondary,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    tdFirst: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    headingRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 12,
    },
    headingText: {
      flex: 1,
    },
    toggleLabel: {
      fontSize: 12,
      fontWeight: '600',
    },
    subsection: {
      paddingLeft: 10,
    },
    notice: {
      fontSize: 12,
      color: colors.textMuted,
      borderTopWidth: 1,
      paddingTop: 10,
      marginTop: 12,
    },
  })
}
