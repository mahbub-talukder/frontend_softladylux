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

/** SRS ARC-05 / ARC-06 / §7. Typed API client for /api/v1. Sends cookies; adds the CSRF header on
 * unsafe methods. On a 401 from an admin call it rotates the refresh cookie once and retries
 * (access tokens live 15 min). */
export function useApi() {
  const config = useRuntimeConfig()
  const base = import.meta.server ? config.apiBaseInternal : config.public.apiBase

  async function raw<T>(path: string, opts: FetchOptions): Promise<T> {
    const method = String(opts.method ?? 'GET').toUpperCase()
    const headers: Record<string, string> = { ...(opts.headers as Record<string, string>) }
    if (method !== 'GET' && method !== 'HEAD') {
      const t = csrfToken()
      if (t) headers['X-CSRFToken'] = t
    }
    if (import.meta.server) {
      Object.assign(headers, useRequestHeaders(['cookie']))
      // Server-side calls go straight to Django over the private network: say the original request was
      // HTTPS so production's SSL redirect doesn't bounce them (nginx did the TLS).
      headers['X-Forwarded-Proto'] = 'https'
    }
    return (await $fetch(path, { baseURL: base, credentials: 'include', ...opts, headers } as never)) as T
  }

  async function api<T>(path: string, opts: FetchOptions = {}): Promise<T> {
    try {
      return await raw<T>(path, opts)
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      const isAuthCall = path.startsWith('/admin/auth/') || path.startsWith('/auth/')
      if (import.meta.client && status === 401 && !isAuthCall) {
        // Admin and customer sessions each rotate their own refresh cookie once, then retry.
        const refresh = path.startsWith('/admin/') ? '/admin/auth/refresh/' : (path.startsWith('/me') || path.startsWith('/orders') ? '/auth/refresh/' : null)
        if (refresh) {
          await raw(refresh, { method: 'POST' })
          return await raw<T>(path, opts)
        }
      }
      throw e
    }
  }

  /** Pull the {code,message,fields} body out of a failed call (SRS §7 error shape). */
  function errorOf(e: unknown): ApiError {
    const data = (e as { data?: Partial<ApiError> }).data
    return {
      code: data?.code ?? 'error',
      message: data?.message ?? 'Something went wrong. Please try again.',
      fields: data?.fields ?? {}
    }
  }
  return { api, errorOf }
}
