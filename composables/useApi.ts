import type { FetchOptions } from 'ofetch'

export interface ApiError {
  code: string
  message: string
  fields: Record<string, string[]>
}

function csrfToken(): string | undefined {
  if (import.meta.server) return undefined
  return document.cookie.match(/(?:^|; )csrftoken=([^;]+)/)?.[1]
}

/** SRS ARC-05 / ARC-06 / §7. Typed API client for /api/v1. Sends cookies; adds the CSRF header on unsafe methods. */
export function useApi() {
  const config = useRuntimeConfig()
  const base = import.meta.server ? config.apiBaseInternal : config.public.apiBase

  async function api<T>(path: string, opts: FetchOptions = {}): Promise<T> {
    const method = String(opts.method ?? 'GET').toUpperCase()
    const headers: Record<string, string> = { ...(opts.headers as Record<string, string>) }
    if (method !== 'GET' && method !== 'HEAD') {
      const t = csrfToken()
      if (t) headers['X-CSRFToken'] = t
    }
    if (import.meta.server) Object.assign(headers, useRequestHeaders(['cookie']))
    return await $fetch<T>(path, { baseURL: base, credentials: 'include', ...opts, headers })
  }
  return { api }
}
