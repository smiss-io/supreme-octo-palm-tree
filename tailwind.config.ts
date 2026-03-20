import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './apps/web/**/*.{ts,tsx}',
    './packages/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1B2D6B',
          50: '#E8EBF5',
          100: '#D1D7EB',
          200: '#A3AFD7',
          300: '#7587C3',
          400: '#475FAF',
          500: '#1B2D6B',
          600: '#162456',
          700: '#111B41',
          800: '#0B122C',
          900: '#060916',
        },
        sky: {
          DEFAULT: '#4BA3F5',
          50: '#EBF4FE',
          100: '#D7E9FD',
          200: '#AFD3FB',
          300: '#87BDF9',
          400: '#5FA7F7',
          500: '#4BA3F5',
          600: '#1488F0',
          700: '#0B6AC2',
          800: '#084D8E',
          900: '#04305A',
        },
        coral: {
          DEFAULT: '#F5714B',
          50: '#FEF0EC',
          100: '#FDE1D9',
          200: '#FBC3B3',
          300: '#F9A58D',
          400: '#F78B6C',
          500: '#F5714B',
          600: '#F24A17',
          700: '#C4390F',
          800: '#902A0B',
          900: '#5C1B07',
        },
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-fraunces)', 'serif'],
      },
    },
  },
  plugins: [],
}

export default config
