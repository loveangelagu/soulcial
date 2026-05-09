import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        purple: {
          primary: '#a78bfa',
          deep:    '#7c3aed',
          dark:    '#4a2a8a',
        },
        lavender: {
          DEFAULT: '#c4b5fd',
          light:   '#f3f0ff',
          pale:    '#e9e0ff',
        },
        cream:  '#faf8f5',
        paper:  '#fffdf8',
        ink:    '#1a1a2e',
        muted:  '#6a6a80',
        pink:     { DEFAULT: '#f9a8d4', pale: '#fbcfe8' },
        gold:     '#fde68a',
        green:    '#bbf7d0',
        peach:    '#fed7aa',
      },
      fontFamily: {
        pixel: ['VT323', 'monospace'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
