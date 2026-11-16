'use client'

import { ReactNode } from 'react'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { ThemeProvider } from '@/lib/theme/ThemeContext'
import { RegistrationGate } from '@/components/RegistrationGate'
import { AuthProvider } from '@/lib/auth/AuthContext'
import { AppTabBar } from '@/components/AppTabBar'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <RegistrationGate>
            {children}
            <AppTabBar />
          </RegistrationGate>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
