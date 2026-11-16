import React, { useEffect, useState } from 'react'
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import HomeScreen from '../screens/HomeScreen'
import TrainScreen from '../screens/TrainScreen'
import InsightScreen from '../screens/InsightScreen'
import CoachScreen from '../screens/CoachScreen'
import SettingsScreen from '../screens/SettingsScreen'
import WorkoutLogScreen from '../screens/WorkoutLogScreen'
import MotionScreen from '../screens/MotionScreen'
import BodyScreen from '../screens/BodyScreen'
import NutritionScreen from '../screens/NutritionScreen'
import ProfileScreen from '../screens/ProfileScreen'
import RegistrationScreen from '../screens/RegistrationScreen'
import OverviewScreen from '../screens/OverviewScreen'
import SharedSummaryScreen from '../screens/SharedSummaryScreen'
import { BodySummary } from '../lib/bodySummaryCore'
import { useTheme } from '../lib/theme/ThemeContext'
import { loadDisclaimerAcceptance } from '../lib/disclaimer'
import { hasSavedProfile } from '../lib/profile'

export type RootStackParamList = {
  // Tabs: Home · Train · Insight · Coach · Me (Profile)
  Home: undefined
  Train: undefined
  Insight: undefined
  Coach: { question?: string } | undefined
  Profile: { date?: string } | undefined
  // Detail screens
  Motion: undefined
  Body: undefined
  Nutrition: undefined
  WorkoutLog: { exercise?: string } | undefined
  Settings: undefined
  Overview: undefined
  SharedSummary: { summary: BodySummary }
}

const Stack = createNativeStackNavigator<RootStackParamList>()

const TAB_ROUTES = new Set(['Home', 'Train', 'Insight', 'Coach', 'Profile'])

export default function RootNavigator() {
  const { theme, colors } = useTheme()
  const [registration, setRegistration] = useState<'checking' | 'needed' | 'done'>('checking')

  useEffect(() => {
    // Onboarding = disclaimer & privacy + profile details; both must be done before the app.
    Promise.all([loadDisclaimerAcceptance(), hasSavedProfile()]).then(([acceptance, hasProfile]) =>
      setRegistration(acceptance && hasProfile ? 'done' : 'needed'),
    )
  }, [])

  if (registration === 'checking') return null
  if (registration === 'needed') return <RegistrationScreen onAccepted={() => setRegistration('done')} />

  const base = theme === 'dark' ? DarkTheme : DefaultTheme
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.bg,
      card: colors.bg,
      border: colors.border,
      text: colors.textPrimary,
      primary: colors.olive,
    },
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          // Switching tabs shouldn't slide like a push.
          animation: TAB_ROUTES.has(route.name) ? 'fade' : 'default',
        })}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Train" component={TrainScreen} />
        <Stack.Screen name="Insight" component={InsightScreen} />
        <Stack.Screen name="Coach" component={CoachScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Motion" component={MotionScreen} />
        <Stack.Screen name="Body" component={BodyScreen} />
        <Stack.Screen name="Nutrition" component={NutritionScreen} />
        <Stack.Screen name="WorkoutLog" component={WorkoutLogScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Overview" component={OverviewScreen} />
        <Stack.Screen name="SharedSummary" component={SharedSummaryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
