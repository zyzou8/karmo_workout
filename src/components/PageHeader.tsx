'use client'

import Link from 'next/link'
import { ReactNode } from 'react'
import { TabIcon } from './AppTabBar'

/** Phone-first page header: optional back link, Marcellus title, settings shortcut. */
export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: string
  subtitle?: string
  back?: { href: string; label: string }
  actions?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-50 bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-xl border-b border-gray-200/70 dark:border-gray-800/70">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-4 pb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {back && (
            <Link href={back.href} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-1">
              ‹ {back.label}
            </Link>
          )}
          <h1 className="text-[28px] leading-tight text-olive-800 dark:text-gray-50 truncate">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0 pb-1">
          {actions}
          <Link
            href="/settings"
            aria-label="Settings"
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:text-olive-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <TabIcon name="settings" />
          </Link>
        </div>
      </div>
    </header>
  )
}

/** Small "AI estimate" / "AI cue" label required on every AI number. */
export function AiLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sage-300/40 dark:bg-sage-300/15 text-olive-700 dark:text-sage-300 text-[11px] font-bold tracking-wide">
      ✦ {children}
    </span>
  )
}
