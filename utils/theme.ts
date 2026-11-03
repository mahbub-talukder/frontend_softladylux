export interface ThemeTokens {
  [name: string]: string
}

// Built-in Signature fallback if the API is unreachable (THM-06). Values mirror tokens.css.
export const DEFAULT_THEME: ThemeTokens = {}

const TOKEN_RE = /^--color-[a-z-]+$/
const VALUE_RE = /^#[0-9A-Fa-f]{6}$/

/** SRS THM-06: build a `:root{...}` block from API tokens, accepting only safe names/values. */
export function tokensToCss(tokens: ThemeTokens | null | undefined): string {
  if (!tokens) return ''
  const rules = Object.entries(tokens)
    .filter(([k, val]) => TOKEN_RE.test(k) && VALUE_RE.test(val))
    .map(([k, val]) => `${k}:${val};`)
  return rules.length ? `:root{${rules.join('')}}` : ''
}
