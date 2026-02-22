import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#00B894',
          dark: '#00a381',
          light: '#00d4ab',
        },
        surface: {
          DEFAULT: '#0f172a',
          raised: '#1e293b',
          overlay: '#263347',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
