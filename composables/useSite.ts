import type { Home, PublicSettings } from '~/types/api'

/** SRS SET-08: every company-specific value comes from the Settings API (server-rendered, shared key). */
export function useSiteSettings() {
  const { api } = useApi()
  return useAsyncData('site-settings', () => api<PublicSettings>('/settings/'))
}

/** SRS WEB-06: fixed home layout content from GET /home/. */
export function useHome() {
  const { api } = useApi()
  return useAsyncData('home', () => api<Home>('/home/'))
}

/** SRS CAT-01 / CAT-17: active categories with nested sub-categories and counts. */
export function useCategories() {
  const { api } = useApi()
  return useAsyncData('categories', () => api<import('~/types/api').PublicCategory[]>('/categories/'))
}
