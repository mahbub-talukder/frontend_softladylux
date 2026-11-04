// SRS INS-05: dataLayer events. The consent-gated GTM loader and the full contract arrive in M5;
// until then pushing is a harmless no-op that never carries personal data.
export function useTrack() {
  function push(event: string, data: Record<string, unknown> = {}) {
    if (import.meta.server) return
    const w = window as unknown as { dataLayer?: Record<string, unknown>[] }
    ;(w.dataLayer ||= []).push({ event, ...data })
  }
  return { push }
}
