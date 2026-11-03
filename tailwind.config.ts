import type { Config } from 'tailwindcss'

// SRS THM-03, THM-05: Tailwind theme mapped to CSS variables. Every colour is a CSS variable from assets/css/tokens.css (THM-05). No raw colour literals here.
const v = (name: string) => `var(--color-${name})`

export default <Partial<Config>>{
  content: [],
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
        'on-dark': v('on-dark')
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Jost', 'system-ui', 'sans-serif']
      },
      borderRadius: { DEFAULT: '0', sm: '0', md: '0', lg: '0' },
      minHeight: { touch: '44px' },
      minWidth: { touch: '44px' }
    }
  }
}
