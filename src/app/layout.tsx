import type { Metadata, Viewport } from 'next'
import { Lato, Marcellus } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const marcellus = Marcellus({ subsets: ['latin'], weight: '400', variable: '--font-marcellus', display: 'swap' })
const lato = Lato({ subsets: ['latin'], weight: ['400', '700', '900'], variable: '--font-lato', display: 'swap' })

export const metadata: Metadata = {
  title: 'Karmo Workout — AI Fitness Coach',
  description: 'Form camera, workout log, nutrition and an AI coach — one profile feeds every module.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F9FAF8' },
    { media: '(prefers-color-scheme: dark)', color: '#13170F' },
  ],
}

// Theme is 'light' | 'dark' | 'system' (default). Applied before paint to avoid a flash.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem('karmo_theme');
    var dark = saved === 'dark' || ((!saved || saved === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${marcellus.variable} ${lato.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
