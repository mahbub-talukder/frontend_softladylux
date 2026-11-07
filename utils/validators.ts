// SRS UI-06 / §10: pure, composable field rules mirroring the backend constraints (server stays authoritative).
// A rule returns an error message or null. Every rule except `required` skips empty values, so optional
// fields are only checked when filled in.

export type Rule = (value: unknown, all: Record<string, unknown>) => string | null

export const isEmpty = (v: unknown): boolean =>
  v === null || v === undefined || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0)

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : String(v))
const num = (v: unknown) => (typeof v === 'number' ? v : Number(str(v)))
const skip = (v: unknown) => isEmpty(v)

const required = (msg = 'This field is required.'): Rule => (v) => (isEmpty(v) ? msg : null)
const maxLength = (n: number, msg?: string): Rule => (v) => (skip(v) || str(v).length <= n ? null : msg ?? `Use at most ${n} characters.`)
const minLength = (n: number, msg?: string): Rule => (v) => (skip(v) || str(v).length >= n ? null : msg ?? `Use at least ${n} characters.`)
const between = (min: number, max: number, msg?: string): Rule => (v) => {
  if (skip(v)) return null
  const l = str(v).length
  return l >= min && l <= max ? null : msg ?? `Use ${min}-${max} characters.`
}
const pattern = (re: RegExp, msg: string): Rule => (v) => (skip(v) || re.test(str(v)) ? null : msg)
const email = (msg = 'Enter a valid email address.'): Rule => pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, msg)
const url = (msg = 'Enter a full link starting with http:// or https://.'): Rule => (v) => {
  if (skip(v)) return null
  try { const u = new URL(str(v)); return u.protocol === 'http:' || u.protocol === 'https:' ? null : msg } catch { return msg }
}
const slug = (msg = 'Use lowercase letters, digits and dashes only.'): Rule => pattern(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, msg)
const hex = (msg = 'Use a colour like #RRGGBB.'): Rule => pattern(/^#[0-9A-Fa-f]{6}$/, msg)
const phoneBD = (msg = 'Enter a valid mobile number, e.g. 017XXXXXXXX.'): Rule => (v) => {
  if (skip(v)) return null
  const d = str(v).replace(/[\s-]/g, '').replace(/^\+?880/, '0')
  return /^01[3-9]\d{8}$/.test(d) ? null : msg
}
const integer = (msg = 'Enter a whole number.'): Rule => (v) => (skip(v) || Number.isInteger(num(v)) ? null : msg)
const decimal = (places = 2, msg?: string): Rule => (v) => {
  if (skip(v)) return null
  if (!Number.isFinite(num(v))) return 'Enter a valid number.'
  const frac = str(v).split('.')[1] ?? ''
  return frac.length <= places ? null : msg ?? `Use at most ${places} decimal places.`
}
const min = (n: number, msg?: string): Rule => (v) => (skip(v) || (Number.isFinite(num(v)) && num(v) >= n) ? null : msg ?? `Must be ${n} or more.`)
const max = (n: number, msg?: string): Rule => (v) => (skip(v) || (Number.isFinite(num(v)) && num(v) <= n) ? null : msg ?? `Must be ${n} or less.`)
const gt = (n: number, msg?: string): Rule => (v) => (skip(v) || (Number.isFinite(num(v)) && num(v) > n) ? null : msg ?? `Must be greater than ${n}.`)
/** Cross-field rule: `fn` receives the whole form. */
const custom = (fn: (value: unknown, all: Record<string, unknown>) => string | null): Rule => (v, all) => fn(v, all)

/** All rules under one name (`rules.required()`), so short names like min/max/url are not auto-imported globally. */
export const rules = { required, maxLength, minLength, between, pattern, email, url, slug, hex, phoneBD, integer, decimal, min, max, gt, custom }

/** First failing rule's message, or null. */
export function firstError(rules: Rule[], value: unknown, all: Record<string, unknown>): string | null {
  for (const r of rules) { const m = r(value, all); if (m) return m }
  return null
}
