import { defineStore } from 'pinia'
import { CONSENT_DENIED, CONSENT_GRANTED_ANALYTICS, CONSENT_KEY, gtmUrl, parseConsent, validGtmId, type Consent } from '~/utils/consent'

type W = Window & { dataLayer?: unknown[]; google_tag_manager?: unknown }

// SRS INS-03/INS-04: GTM and GA4 stay unloaded until the visitor accepts; Decline keeps analytics off
// and is remembered. Google Consent Mode starts as denied.
export const useConsentStore = defineStore('consent', {
  state: () => ({ choice: null as Consent | null, ready: false, gtmId: '', loaded: false }),
  getters: { needsChoice: (s) => s.ready && !!s.gtmId && s.choice === null },
  actions: {
    gtag(...args: unknown[]) {
      const w = window as W
      ;(w.dataLayer ||= []).push(args as unknown) // Google's gtag() pushes the arguments object
    },
    init(gtmId: string) {
      this.gtmId = validGtmId(gtmId) ? gtmId.trim() : ''
      this.gtag('consent', 'default', { ...CONSENT_DENIED, wait_for_update: 500 }) // before anything else
      try { this.choice = parseConsent(window.localStorage.getItem(CONSENT_KEY)) } catch { this.choice = null }
      this.ready = true
      if (this.choice === 'granted') this.loadGtm()
    },
    remember(c: Consent) {
      this.choice = c
      try { window.localStorage.setItem(CONSENT_KEY, c) } catch { /* private mode: remembered for this visit only */ }
    },
    accept() {
      this.remember('granted')
      this.gtag('consent', 'update', CONSENT_GRANTED_ANALYTICS)
      this.loadGtm()
    },
    decline() { this.remember('denied') }, // nothing from Google is loaded
    loadGtm() {
      if (this.loaded || !this.gtmId || this.choice !== 'granted') return
      this.loaded = true
      this.gtag('consent', 'update', CONSENT_GRANTED_ANALYTICS)
      const w = window as W
      ;(w.dataLayer ||= []).push({ 'gtm.start': Date.now(), event: 'gtm.js' })
      const s = document.createElement('script')
      s.async = true; s.src = gtmUrl(this.gtmId)
      document.head.appendChild(s)
    }
  }
})
