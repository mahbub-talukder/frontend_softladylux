// SRS v1.11 STF-UI-03: `v-reveal` marks an element for the Fade-In-Up entrance run by the inline head script
// (utils/revealScript.ts). The attribute is server-rendered (getSSRProps), so the script finds first-screen cards
// before hydration; elements created later (client navigation, "load more", lazy sections) are handed to the same
// observer from beforeMount, before they are painted, so they never flash in their final state.
import { REVEAL_SCRIPT } from '~/utils/revealScript'

declare global { interface Window { __sllReveal?: (el: Element) => void } }

export default defineNuxtPlugin((nuxtApp) => {
  useHead({ script: [{ key: 'sll-reveal', innerHTML: REVEAL_SCRIPT, tagPosition: 'head' }] })
  nuxtApp.vueApp.directive<HTMLElement>('reveal', {
    getSSRProps: () => ({ 'data-reveal': '' }),
    beforeMount(el) { el.setAttribute('data-reveal', '') },
    mounted(el) { if (import.meta.client) window.__sllReveal?.(el) }
  })
})
