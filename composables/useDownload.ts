import { normalizeApiError } from '~/utils/apiError'

/** SRS CAT-15 / INV-* / RPT-*: CSV exports. A plain link would show the browser's raw JSON/HTML error page when the
 * export fails, so the file is fetched with the admin session, saved through a temporary link, and any failure is
 * reported as a toast (ADM-07, UI-06). Retries once after refreshing the session on a 401. */
export function useDownload() {
  const config = useRuntimeConfig()
  const { api, toast } = useApi()

  async function once(url: string) {
    return await fetch(url, { credentials: 'include' })
  }

  /** `path` starts with /admin/...; `query` values that are empty are dropped. Returns true when a file was saved. */
  async function download(path: string, query: Record<string, string | undefined> = {}, filename = 'export.csv'): Promise<boolean> {
    const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v) as [string, string][]).toString()
    const url = `${config.public.apiBase}${path}${qs ? `?${qs}` : ''}`
    try {
      let res = await once(url)
      if (res.status === 401) {
        await api('/admin/auth/refresh/', { method: 'POST', silent: true })
        res = await once(url)
      }
      if (!res.ok) {
        let body: unknown
        try { body = await res.json() } catch { body = undefined }
        const er = normalizeApiError({ statusCode: res.status, data: body })
        toast.error('Export failed', er.flat.slice(0, 3))
        return false
      }
      const blob = await res.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(link.href), 10_000)
      toast.success('Download started', [filename])
      return true
    } catch (e) {
      toast.error('Export failed', normalizeApiError(e).flat.slice(0, 3))
      return false
    }
  }
  return { download }
}
