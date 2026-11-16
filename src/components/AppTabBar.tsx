'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { useTranslation } from '@/lib/i18n/LanguageContext'

type TabKey = 'home' | 'train' | 'insight' | 'coach' | 'me'

const TABS: { key: TabKey; href: string; match: string[] }[] = [
  { key: 'home', href: '/', match: ['/'] },
  { key: 'train', href: '/train', match: ['/train', '/motion', '/log'] },
  { key: 'insight', href: '/insight', match: ['/insight', '/body', '/nutrition', '/overview'] },
  { key: 'coach', href: '/coach', match: ['/coach'] },
  { key: 'me', href: '/profile', match: ['/profile', '/settings', '/guide'] },
]

/** Pages that are not part of the signed-in app shell. */
const HIDDEN_ON = ['/share']

export function TabIcon({ name, className = 'w-5 h-5' }: { name: TabKey | 'timer' | 'plus' | 'meal' | 'camera' | 'settings'; className?: string }) {
  const common = { className, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, viewBox: '0 0 24 24', 'aria-hidden': true }
  switch (name) {
    case 'home':
      return <svg {...common}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></svg>
    case 'train':
      return <svg {...common}><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" /></svg>
    case 'insight':
      return <svg {...common}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
    case 'coach':
      return <svg {...common}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12Z" /><path d="M8.5 11h.01M12 11h.01M15.5 11h.01" /></svg>
    case 'me':
      return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
    case 'timer':
      return <svg {...common}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9 2h6" /></svg>
    case 'plus':
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>
    case 'meal':
      return <svg {...common}><path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 3c-2 0-3 2.5-3 6s1 4 3 4v8" /></svg>
    case 'camera':
      return <svg {...common}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
    case 'settings':
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>
  }
}

/** Bottom tab bar: Home · Train · Insight · Coach · Me (karmo-olive-app.pptx). */
export function AppTabBar() {
  const { t } = useTranslation()
  const pathname = usePathname() || '/'
  const hidden = HIDDEN_ON.includes(pathname)

  useEffect(() => {
    document.body.classList.toggle('has-tabbar', !hidden)
    return () => document.body.classList.remove('has-tabbar')
  }, [hidden])

  if (hidden) return null

  const active = TABS.find(tab => tab.match.some(m => (m === '/' ? pathname === '/' : pathname.startsWith(m))))?.key

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 inset-x-0 z-[60] pb-[env(safe-area-inset-bottom)] sm:bottom-4 sm:pb-0 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-md sm:rounded-2xl border-t sm:border border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-lg shadow-gray-900/5 grid grid-cols-5">
        {TABS.map(tab => {
          const isActive = tab.key === active
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold tracking-wide transition-colors ${
                isActive ? 'text-olive-800 dark:text-sage-300' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <span className={`flex items-center justify-center w-10 h-7 rounded-full transition-colors ${isActive ? 'bg-sage-300/50 dark:bg-sage-300/15' : ''}`}>
                <TabIcon name={tab.key} />
              </span>
              {t(`tabs.${tab.key}`)}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
