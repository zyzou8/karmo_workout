'use client'

import { useState } from 'react'
import { useTranslation } from '@/lib/i18n/LanguageContext'
import { AIResponseSection, formatAIResponse, splitAIResponse } from '@/lib/formatAIResponse'

/** Responses shorter than this are shown in full without collapsible sections. */
const COLLAPSE_THRESHOLD_CHARS = 600

interface Props {
  text: string
  className?: string
}

export function CollapsibleAIResponse({ text, className = '' }: Props) {
  const { t } = useTranslation()
  const [toggled, setToggled] = useState<Set<string>>(new Set())

  if (text.length < COLLAPSE_THRESHOLD_CHARS) {
    return (
      <div className={`ai-response ${className}`}>
        <div dangerouslySetInnerHTML={{ __html: formatAIResponse(text) }} />
        <AINotice />
      </div>
    )
  }

  const sections = splitAIResponse(text)

  // The first section (title + intro) starts open; everything else starts collapsed.
  const isOpen = (id: string, defaultOpen: boolean) => toggled.has(id) !== defaultOpen
  const toggle = (id: string) =>
    setToggled(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const renderSection = (section: AIResponseSection, id: string, defaultOpen: boolean) => {
    const open = section.heading === null || isOpen(id, defaultOpen)
    const HeadingTag = section.level === 2 ? 'h2' : 'h3'
    return (
      <div key={id} className={section.level === 3 ? 'pl-3' : undefined}>
        {section.heading !== null && (
          <button
            type="button"
            onClick={() => toggle(id)}
            aria-expanded={open}
            className="w-full flex items-baseline justify-between gap-3 text-left group"
          >
            <HeadingTag dangerouslySetInnerHTML={{ __html: formatAIResponse(section.heading) }} />
            <span className="shrink-0 text-xs font-medium text-violet-600 dark:text-violet-400 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
              {open ? `${t('common.showLess')} ▴` : `${t('common.showMore')} ▾`}
            </span>
          </button>
        )}
        {open && (
          <>
            {section.body.trim() && <div dangerouslySetInnerHTML={{ __html: formatAIResponse(section.body.trim()) }} />}
            {section.children.map((child, ci) => renderSection(child, `${id}.${ci}`, false))}
          </>
        )}
      </div>
    )
  }

  return (
    <div className={`ai-response ${className}`}>
      {sections.map((section, i) => renderSection(section, String(i), i === 0))}
      <AINotice />
    </div>
  )
}

function AINotice() {
  const { t } = useTranslation()
  return (
    <p className="!mt-4 !mb-0 pt-3 border-t border-gray-200 dark:border-gray-800 text-xs !text-gray-400 dark:!text-gray-500">
      {t('disclaimer.aiNotice')}
    </p>
  )
}
