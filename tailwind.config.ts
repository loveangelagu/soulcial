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
        muted:  '#4a4a5c',
        pink:     { DEFAULT: '#f9a8d4', pale: '#fbcfe8' },
        gold:     '#fde68a',
        green:    '#bbf7d0',
        peach:    '#fed7aa',
      },
      fontFamily: {
        pixel: ['VT323', 'monospace'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
      // VT323 is visually ~30% smaller than its nominal size. These tokens
      // are sized so `text-pixel-base` reads roughly like `text-base` Inter,
      // `text-pixel-lg` like `text-lg`, etc. Use them on `.font-pixel` text.
      fontSize: {
        'pixel-xs':   ['0.95rem', { lineHeight: '1.05' }],
        'pixel-sm':   ['1.15rem', { lineHeight: '1.05' }],
        'pixel-base': ['1.35rem', { lineHeight: '1.05' }],
        'pixel-lg':   ['1.6rem',  { lineHeight: '1.05' }],
        'pixel-xl':   ['2rem',    { lineHeight: '1.05' }],
        'pixel-2xl':  ['2.5rem',  { lineHeight: '1.05' }],
        'pixel-3xl':  ['3.25rem', { lineHeight: '1' }],
        'pixel-4xl':  ['4rem',    { lineHeight: '0.95' }],
        'pixel-5xl':  ['5.25rem', { lineHeight: '0.95' }],
      },
      boxShadow: {
        card:    '0 6px 0 0 #e9e0ff',
        'card-sm': '0 3px 0 0 #e9e0ff',
        press:   '0 3px 0 0 #4a2a8a',
      },
    },
  },
  plugins: [],
}
export default config
