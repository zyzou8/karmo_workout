import type { Config } from 'tailwindcss'

/**
 * Olive Form theme (karmo-olive-app.pptx): cream, deep olive and sage.
 * The stock gray / violet / purple / blue / cyan / indigo scales are remapped onto
 * olive-tinted scales, so every existing utility class picks up the theme.
 */
const neutral = {
  50: '#F9FAF8',
  100: '#F0F2EC',
  200: '#E2E6DA',
  300: '#C9D0BD',
  400: '#9EA68F',
  500: '#737B65',
  600: '#565D4A',
  700: '#3F4636',
  800: '#2F3627',
  900: '#1E2318',
  950: '#13170F',
}

const olive = {
  50: '#F3F6EE',
  100: '#E4EBD8',
  200: '#CEDABB',
  300: '#B9C9A5',
  400: '#8DA76C',
  500: '#647849',
  600: '#4B5C35',
  700: '#3A4729',
  800: '#2D3621',
  900: '#232A1A',
  950: '#161B10',
}

const sage = {
  50: '#F4F7F1',
  100: '#E6EDE0',
  200: '#D2DEC6',
  300: '#B9C9A5',
  400: '#9DB485',
  500: '#7F9867',
  600: '#647849',
  700: '#4E5E3A',
  800: '#3D4A2F',
  900: '#2D3621',
  950: '#1A2013',
}

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gray: neutral,
        violet: olive,
        purple: { ...olive, 600: '#3A4729', 700: '#2D3621' },
        indigo: olive,
        blue: sage,
        cyan: { ...sage, 500: '#8DA76C' },
        cream: '#F9FAF8',
        olive,
        sage,
      },
      fontFamily: {
        display: ['var(--font-marcellus)', 'Georgia', 'serif'],
        sans: ['var(--font-lato)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 2s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
