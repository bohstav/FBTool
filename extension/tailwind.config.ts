import type { Config } from 'tailwindcss'

// Carbon Design System — Gray scale (dark theme g100)
// g10=#f4f4f4  g20=#e0e0e0  g30=#c6c6c6  g40=#a8a8a8  g50=#8d8d8d
// g60=#6f6f6f  g70=#525252  g80=#393939  g90=#262626  g100=#161616

export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#00B894',
          dark:    '#009f80',
          light:   '#00cfaa',
        },
        surface: {
          DEFAULT: '#161616',  // Carbon g100
          raised:  '#262626',  // Carbon g90
          overlay: '#393939',  // Carbon g80
        },
        // Remap Tailwind slate → Carbon Gray so all existing
        // text-slate-*/bg-slate-*/border-slate-* get Carbon values
        slate: {
          50:  '#f4f4f4',  // g10
          100: '#f4f4f4',  // g10
          200: '#e0e0e0',  // g20
          300: '#c6c6c6',  // g30
          400: '#a8a8a8',  // g40
          500: '#8d8d8d',  // g50
          600: '#6f6f6f',  // g60
          700: '#525252',  // g70
          800: '#393939',  // g80
          900: '#262626',  // g90
          950: '#161616',  // g100
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
