/**
 * Olive Form palette (karmo-olive-app.pptx): cream, deep olive, sage.
 * Legacy keys (violet*, blue*, emerald*, …) are kept so existing screens compile;
 * they now resolve to the olive / sage family. Orange/amber stay warm, red stays red.
 */
const OLIVE_DEEP = '#2D3621'
const OLIVE = '#647849'
const LEAF = '#8DA76C'
const SAGE = '#B9C9A5'

export const lightColors = {
  bg: '#F9FAF8',
  card: '#FFFFFF',
  cardAlt: '#F0F2EC',
  border: '#E2E6DA',
  borderLight: '#C9D0BD',
  textPrimary: '#2D3621',
  textSecondary: '#4B5340',
  textMuted: '#737B65',
  textFaint: '#9EA68F',
  overlay: 'rgba(249, 250, 248, 0.88)',

  // New Olive Form keys
  primary: OLIVE_DEEP,
  onPrimary: '#FFFFFF',
  olive: OLIVE,
  leaf: LEAF,
  sage: SAGE,
  sageSoft: 'rgba(185, 201, 165, 0.28)',

  // Legacy accent keys → olive family
  violet: OLIVE,
  violetDark: OLIVE_DEEP,
  violetSoft: 'rgba(100, 120, 73, 0.12)',
  violetBorder: 'rgba(100, 120, 73, 0.28)',

  blue: OLIVE,
  cyan: LEAF,
  blueSoft: 'rgba(100, 120, 73, 0.12)',
  blueBorder: 'rgba(100, 120, 73, 0.28)',

  emerald: '#5E7A45',
  teal: '#7E9A63',
  emeraldSoft: 'rgba(141, 167, 108, 0.16)',
  emeraldBorder: 'rgba(141, 167, 108, 0.32)',

  orange: '#C7783A',
  amber: '#D19A3C',
  orangeSoft: 'rgba(199, 120, 58, 0.12)',
  orangeBorder: 'rgba(199, 120, 58, 0.28)',

  red: '#C2453A',
}

export const darkColors: typeof lightColors = {
  bg: '#13170F',
  card: '#1E2318',
  cardAlt: '#262C1F',
  border: '#2F3627',
  borderLight: '#3F4636',
  textPrimary: '#F3F5EE',
  textSecondary: '#C9D0BD',
  textMuted: '#9EA68F',
  textFaint: '#737B65',
  overlay: 'rgba(19, 23, 15, 0.85)',

  primary: SAGE,
  onPrimary: '#1E2318',
  olive: LEAF,
  leaf: LEAF,
  sage: SAGE,
  sageSoft: 'rgba(185, 201, 165, 0.14)',

  // Mid olive keeps white button text readable on dark backgrounds.
  violet: OLIVE,
  violetDark: '#4B5C35',
  violetSoft: 'rgba(141, 167, 108, 0.16)',
  violetBorder: 'rgba(141, 167, 108, 0.32)',

  blue: OLIVE,
  cyan: LEAF,
  blueSoft: 'rgba(141, 167, 108, 0.16)',
  blueBorder: 'rgba(141, 167, 108, 0.32)',

  emerald: '#5E7A45',
  teal: '#7E9A63',
  emeraldSoft: 'rgba(141, 167, 108, 0.16)',
  emeraldBorder: 'rgba(141, 167, 108, 0.32)',

  orange: '#E08F4F',
  amber: '#E3AE52',
  orangeSoft: 'rgba(224, 143, 79, 0.14)',
  orangeBorder: 'rgba(224, 143, 79, 0.3)',

  red: '#E0675B',
}

export type ThemeColors = typeof lightColors

/** Marcellus for headings, Lato for body (loaded in App.tsx). */
export const fonts = {
  heading: 'Marcellus_400Regular',
  body: 'Lato_400Regular',
  bodyBold: 'Lato_700Bold',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
}

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
}
