import type { Config } from 'tailwindcss'

// SRS THM-03, THM-05: Tailwind theme mapped to CSS variables. Every colour is a CSS variable from assets/css/tokens.css (THM-05). No raw colour literals here.
// color-mix lets opacity modifiers (bg-dark/95, border-gold/35) work on CSS-variable colours
const v = (name: string) => `color-mix(in srgb, var(--color-${name}) calc(<alpha-value> * 100%), transparent)`

export default <Partial<Config>>{
  content: [],
  // tile tints are chosen at runtime (utils/tiles.ts), so they must be kept in the build
  safelist: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `bg-tile-${n}`),
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: v('primary'),
          hover: v('primary-hover'),
          active: v('primary-active'),
          soft: v('primary-soft'),
          contrast: v('primary-contrast')
        },
        accent: v('accent'),
        bg: v('bg'),
        surface: v('surface'),
        cream: v('cream'),
        border: v('border'),
        ink: v('ink'),
        muted: v('muted'),
        dark: v('dark'),
        'on-dark': v('on-dark'),
        gold: v('gold'), champagne: v('champagne'), 'rose-soft': v('rose-soft'), 'rose-deep': v('rose-deep'),
        field: v('field'), body: v('body'), 'line-dark': v('line-dark'), 'line-dark-2': v('line-dark-2'),
        success: v('success'),
        'text-dark': v('text-dark'), 'text-dark-2': v('text-dark-2'), 'text-dark-3': v('text-dark-3'),
        tile: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((n) => [String(n), `color-mix(in srgb, var(--tile-${n}) calc(<alpha-value> * 100%), transparent)`])),
        'tile-video': 'var(--tile-video)'
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Jost', 'system-ui', 'sans-serif']
      },
      borderRadius: { DEFAULT: '0', sm: '0', md: '0', lg: '0' },
      maxWidth: { wrap: '1320px' },
      boxShadow: { pop: 'var(--shadow-pop)' },
      minHeight: { touch: '44px' },
      minWidth: { touch: '44px' }
    }
  }
}
