import type { FetchOptions } from 'ofetch'
import { normalizeApiError } from '~/utils/apiError'
import type { ApiError } from '~/utils/apiError'

export interface ApiOptions extends FetchOptions {
  /** Admin calls only: no loading indicator and no automatic error toast (background/expected-failure calls). */
  silent?: boolean
  /** Set false when the caller renders every error itself and a toast would only repeat it. */
  toast?: boolean
  /** Shown as a success toast after a successful admin call. */
  successMessage?: string
}

function csrfToken(): string | undefined {
  if (import.meta.server) return undefined
  return document.cookie.match(/(?:^|; )csrftoken=([^;]+)/)?.[1]
}

/** Calls under /admin/ (except the auth endpoints, whose callers show inline errors) drive the global
 * loading indicator and error toasts (SRS ADM-07, UI-06). Storefront and customer calls never do. */
function isTracked(path: string) {
  return path.startsWith('/admin/') && !path.startsWith('/admin/auth/')
}

/** SRS ARC-05 / ARC-06 / §7. Typed API client for /api/v1. Sends cookies; adds the CSRF header on
 * unsafe methods. On a 401 from an admin call it rotates the refresh cookie once and retries
 * (access tokens live 15 min). */
export function useApi() {
  const config = useRuntimeConfig()
  const base = import.meta.server ? config.apiBaseInternal : config.public.apiBase
  // Resolved once here (inside the caller's setup/middleware context), then closed over by api().
  let ui: ReturnType<typeof useAdminUi> | null = null
  if (import.meta.client) {
    try { ui = useAdminUi() } catch { ui = null }
  }

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

  async function withRefresh<T>(path: string, opts: FetchOptions): Promise<T> {
    try {
      return await raw<T>(path, opts)
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      const isAuthCall = path.startsWith('/admin/auth/') || path.startsWith('/auth/')
      if (import.meta.client && status === 401 && !isAuthCall) {
        // Admin and customer sessions each rotate their own refresh cookie once, then retry.
        const refresh = path.startsWith('/admin/') ? '/admin/auth/refresh/' : (path.startsWith('/me') || path.startsWith('/orders') ? '/auth/refresh/' : null)
        if (refresh) {
          try {
            await raw(refresh, { method: 'POST' })
          } catch {
            // Session is gone: send staff to the sign-in page instead of leaving a broken screen.
            // window.location, not useRoute(): the Nuxt context is gone after the awaits above.
            if (path.startsWith('/admin/') && window.location.pathname !== '/admin/login') await navigateTo('/admin/login')
            throw e
          }
          return await raw<T>(path, opts)
        }
      }
      throw e
    }
  }

  function notifyFailure(e: unknown, method: string) {
    if (!ui) return
    const er = normalizeApiError(e)
    if (er.status === 401) return // already redirected to sign-in
    // Failed reads are shown by the page itself; only surface unexpected ones (server/network) here.
    if (method === 'GET' && er.status && er.status < 500) return
    ui.error(er.message, er.flat.slice(0, 3))
  }

  async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
    const { silent, toast: wantToast, successMessage, ...fetchOpts } = opts
    const tracked = !!ui && isTracked(path) && !silent
    const method = String(fetchOpts.method ?? 'GET').toUpperCase()
    if (tracked) ui!.begin()
    try {
      const res = await withRefresh<T>(path, fetchOpts)
      if (tracked && successMessage) ui!.success(successMessage)
      return res
    } catch (e) {
      if (tracked && wantToast !== false) notifyFailure(e, method)
      throw e
    } finally {
      if (tracked) ui!.end()
    }
  }

  /** Pull the {code,message,fields} body out of a failed call (SRS §7 error shape), normalised. */
  function errorOf(e: unknown): ApiError {
    return normalizeApiError(e)
  }

  /** Manual toasts for multi-step flows (no-ops on the server). */
  const toast = {
    success: (title: string, lines?: string[]) => ui?.success(title, lines),
    info: (title: string, lines?: string[]) => ui?.info(title, lines),
    error: (title: string, lines?: string[]) => ui?.error(title, lines),
    fromError: (e: unknown) => { if (ui) { const er = normalizeApiError(e); ui.error(er.message, er.flat.slice(0, 3)) } }
  }
  return { api, errorOf, toast }
}
