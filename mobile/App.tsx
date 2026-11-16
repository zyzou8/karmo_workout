import 'react-native-gesture-handler'
import React from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts } from 'expo-font'
import { Marcellus_400Regular } from '@expo-google-fonts/marcellus'
import { Lato_400Regular, Lato_700Bold } from '@expo-google-fonts/lato'
import { ThemeProvider } from './src/lib/theme/ThemeContext'
import { LanguageProvider } from './src/lib/i18n/LanguageContext'
import RootNavigator from './src/navigation'

export default function App() {
  // Olive Form type: Marcellus headings, Lato body. Render nothing until they load.
  const [fontsLoaded] = useFonts({ Marcellus_400Regular, Lato_400Regular, Lato_700Bold })
  if (!fontsLoaded) return null

  return (
    <ThemeProvider>
      <LanguageProvider>
        <SafeAreaProvider>
          <RootNavigator />
        </SafeAreaProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
