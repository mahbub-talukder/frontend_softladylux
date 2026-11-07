// SRS §7 error shape {code, message, fields}. Pure helpers shared by useApi, the toast store and forms.
// The backend can answer with strings, lists of strings, nested dicts and lists of dicts (e.g. `variants`),
// or with no JSON at all (HTML 500, nginx 413, network down). Everything is normalised here so pages never
// render a character per letter or "[object Object]" (SRS UI-06: inline, accessible error text).

export interface ApiError {
  code: string
  message: string
  /** Always string[] per key. Nested errors use row-indexed keys, e.g. `variants[1].sku`. */
  fields: Record<string, string[]>
  /** De-duplicated, human-readable lines for toasts/summaries (message alone when there are no fields). */
  flat: string[]
  status?: number
}

type Raw = { statusCode?: number; status?: number; data?: unknown; response?: unknown }

const VALIDATION_MESSAGE = 'Please correct the highlighted fields.'

/** `variants[1].sku` -> `Variants, row 2: sku`; `compare_at_price` -> `Compare at price`. */
export function humanizeKey(key: string): string {
  const parts: string[] = []
  const re = /([^.[\]]+)|\[(\d+)\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(key))) {
    if (m[2] !== undefined) parts.push(`row ${Number(m[2]) + 1}`)
    else parts.push(m[1].replace(/_/g, ' '))
  }
  const text = parts.join(', ').replace(/, (row \d+), /, ', $1: ').replace(/, (row \d+)$/, ', $1')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function collect(value: unknown, key: string, out: Record<string, string[]>) {
  if (value == null) return
  if (typeof value === 'string') {
    if (value.trim()) (out[key] ||= []).push(value.trim())
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      if (typeof item === 'string') collect(item, key, out)
      else collect(item, `${key}[${i}]`, out)
    })
    return
  }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) collect(v, `${key}.${k}`, out)
  }
}

/** Turn any backend `fields` payload into Record<string, string[]>; parents also get the child lines. */
export function normalizeFields(fields: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  if (!fields || typeof fields !== 'object') return out
  for (const [k, v] of Object.entries(fields as Record<string, unknown>)) {
    const sub: Record<string, string[]> = {}
    collect(v, k, sub)
    for (const [sk, lines] of Object.entries(sub)) out[sk] = lines
    if (!out[k]) {
      // Nested: give the parent key a readable roll-up so `fieldErr('variants')` still shows something.
      const roll = Object.entries(sub).flatMap(([sk, lines]) => lines.map((l) => `${humanizeKey(sk)}: ${l}`))
      if (roll.length) out[k] = roll
    }
  }
  return out
}

function messageForStatus(status: number | undefined, networkDown: boolean): string {
  if (networkDown) return "Can't reach the server. Check your connection and try again."
  if (status === 401) return 'Your session has expired. Please sign in again.'
  if (status === 403) return "You don't have permission to do that."
  if (status === 404) return 'That item no longer exists.'
  if (status === 413) return 'The upload is too large for the server.'
  if (status === 429) return 'Too many requests. Please wait a moment and try again.'
  if (status && status >= 500) return 'The server had a problem. Please try again in a moment.'
  return 'Something went wrong. Please try again.'
}

/** Normalise a failed $fetch/ofetch error into the shape every admin page uses. */
export function normalizeApiError(e: unknown): ApiError {
  const err = (e ?? {}) as Raw
  const status = err.statusCode ?? err.status
  const data = err.data && typeof err.data === 'object' ? (err.data as Record<string, unknown>) : undefined
  const networkDown = !status && !err.response && !data
  const fields = normalizeFields(data?.fields)
  const hasFields = Object.keys(fields).length > 0
  const raw = typeof data?.message === 'string' && data.message.trim() ? data.message.trim() : ''
  // DRF uses `detail` for auth/throttle errors that bypass our handler.
  const detail = typeof data?.detail === 'string' ? data.detail : ''
  const message = raw || detail || (hasFields ? VALIDATION_MESSAGE : messageForStatus(status, networkDown))
  const lines = new Set<string>()
  if (hasFields) {
    // Prefer leaf keys: skip a parent whose children are present as separate keys.
    const keys = Object.keys(fields)
    for (const k of keys) {
      if (keys.some((o) => o !== k && o.startsWith(`${k}[`))) continue
      for (const l of fields[k]) lines.add(k === 'non_field_errors' || k === 'detail' ? l : `${humanizeKey(k)}: ${l}`)
    }
  } else {
    lines.add(message)
  }
  return {
    code: typeof data?.code === 'string' ? data.code : networkDown ? 'network' : 'error',
    message,
    fields,
    flat: [...lines],
    status
  }
}
