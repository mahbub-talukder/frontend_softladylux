import type { ApiError } from '~/utils/apiError'
import { firstError } from '~/utils/validators'
import type { Rule } from '~/utils/validators'

type Schema = Record<string, Rule[] | (() => Rule[])>

/** SRS UI-06: inline validation that keeps user input and focuses the first problem.
 *  - `schema` maps a field key to rules (or a function returning rules, for conditional fields).
 *  - `values` is a getter returning the current form values (a plain object, ref value or reactive).
 *  - Server errors from `errorOf()` land on the same keys via `setServerErrors`, so one `errorFor(key)` drives the UI.
 *  Client rules only mirror the backend; the server remains the authority. */
export function useFormValidation(values: () => Record<string, unknown>, schema: Schema) {
  const client = reactive<Record<string, string>>({})
  const server = reactive<Record<string, string[]>>({})
  const touched = reactive<Record<string, boolean>>({})

  const rulesOf = (k: string): Rule[] => { const s = schema[k]; return typeof s === 'function' ? s() : s ?? [] }

  function validateField(k: string): boolean {
    const m = firstError(rulesOf(k), values()[k], values())
    if (m) client[k] = m
    else Reflect.deleteProperty(client, k)
    return !m
  }

  function touch(k: string) { touched[k] = true; validateField(k) }
  /** Call on input/change: drops the stale server message and re-checks once the field was touched. */
  function onInput(k: string) {
    Reflect.deleteProperty(server, k)
    Object.keys(server).filter((s) => s.startsWith(`${k}[`) || s.startsWith(`${k}.`)).forEach((s) => Reflect.deleteProperty(server, s))
    if (touched[k]) validateField(k)
  }

  function focusFirst(keys: string[]) {
    if (!import.meta.client) return
    nextTick(() => {
      for (const k of keys) {
        const wrap = document.querySelector<HTMLElement>(`[data-field="${CSS.escape(k)}"]`)
        const el = wrap?.matches('input,select,textarea,button') ? wrap : wrap?.querySelector<HTMLElement>('input:not([type=hidden]),select,textarea,button')
        if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.focus({ preventScroll: true }); return }
        if (wrap) { wrap.scrollIntoView({ block: 'center', behavior: 'smooth' }); return }
      }
    })
  }

  /** Validates every field; marks all touched; focuses the first invalid one. Returns true when valid. */
  function validateAll(): boolean {
    const bad: string[] = []
    for (const k of Object.keys(schema)) { touched[k] = true; if (!validateField(k)) bad.push(k) }
    if (bad.length) focusFirst(bad)
    return bad.length === 0
  }

  function setServerErrors(er: Pick<ApiError, 'fields'>) {
    for (const k of Object.keys(server)) Reflect.deleteProperty(server, k)
    Object.assign(server, er.fields)
    const keys = Object.keys(er.fields)
    if (keys.length) focusFirst(keys.sort((a, b) => Object.keys(schema).indexOf(a) - Object.keys(schema).indexOf(b)).map((k) => k.replace(/\[.*$/, '')))
  }

  /** The single message a field shows: client rule first (immediate), then the server's. */
  function errorFor(k: string): string {
    if (touched[k] && client[k]) return client[k]
    return server[k]?.join(' ') ?? ''
  }
  const hasErrors = computed(() => Object.keys(client).length > 0 || Object.keys(server).length > 0)
  const summary = computed(() => [...new Set([...Object.keys(client).map((k) => client[k]), ...Object.values(server).flat()])])

  function reset() {
    for (const o of [client, server, touched] as Record<string, unknown>[]) for (const k of Object.keys(o)) Reflect.deleteProperty(o, k)
  }

  return { errorFor, touch, onInput, validateField, validateAll, setServerErrors, reset, hasErrors, summary, server, client, touched }
}
