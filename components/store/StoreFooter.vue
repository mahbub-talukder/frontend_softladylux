<script setup lang="ts">
// Design: Footer board. SRS SET-08 / NTF-05: contact, support hours, WhatsApp and Messenger links
// live here (the header also has WhatsApp/Call icons since v1.6; no floating button). Values come from Settings; brackets mark
// placeholders shown until the owner supplies real data. Compact layout (amendment v1.6): tighter rows,
// 36 px link targets (WCAG 2.2 minimum is 24 px), smaller logo.
import type { StaticPage } from '~/types/api'
import { SOCIAL_ICON_PATHS } from '~/utils/socialIcons'

const { data: s } = await useSiteSettings()
const { api } = useApi()
const { data: pages } = await useAsyncData('footer-pages', async () => {
  const slugs = ['about', 'delivery-returns', 'privacy', 'terms']
  const out = await Promise.all(slugs.map((x) => api<StaticPage>(`/pages/${x}/`).catch(() => null)))
  return out.filter((p): p is StaticPage => !!p)
})
const ph = (v: string | undefined, label: string) => v || `[${label}]`
const wa = computed(() => waLink(s.value?.whatsapp_number)) // 01… is turned into 8801… for wa.me
// STF-UI-02 (v1.11): an icon for every configured social link (incl. Messenger and WhatsApp), brand colour on hover.
const social = computed(() => ([
  ['Facebook', s.value?.facebook_url, 'facebook'], ['Instagram', s.value?.instagram_url, 'instagram'],
  ['YouTube', s.value?.youtube_url, 'youtube'], ['TikTok', s.value?.tiktok_url, 'tiktok'],
  ['Messenger', s.value?.messenger_link, 'messenger'], ['WhatsApp', wa.value, 'whatsapp']
] as [string, string | undefined, string][]).filter(([, u]) => u) as [string, string, string][])
const { data: cats } = await useCategories()
const { errorOf } = useApi()
// Newsletter band is hidden for now (owner request); flip to show it again.
const showNewsletter = false
const email = ref('')
const nlMsg = ref('')
const nlErr = ref('')
async function subscribe() {
  nlMsg.value = ''; nlErr.value = ''
  try { await api('/newsletter/', { method: 'POST', body: { email: email.value } }); nlMsg.value = 'Thank you! Check your inbox for a welcome note.'; email.value = '' }
  catch (e) { nlErr.value = Object.values(errorOf(e).fields).flat().join(' ') || errorOf(e).message }
}
</script>

<template>
  <!-- Phones: bottom padding clears the fixed BottomNav (56px + safe area) so the last footer row is never hidden under it -->
  <footer class="bg-dark pb-[calc(56px+env(safe-area-inset-bottom))] text-on-dark sm:pb-0">
    <!-- Newsletter band -->
    <div v-if="showNewsletter" class="border-b border-line-dark">
      <div class="wrap grid items-center gap-6 py-10 md:grid-cols-2 md:gap-10 md:py-14">
        <div><h3 class="font-display text-[30px] font-medium text-on-dark md:text-[38px]">Join the inner circle</h3><p class="mt-2.5 text-[15px] text-text-dark-2">New collections and private offers, delivered to your inbox.</p></div>
        <form class="flex flex-col sm:flex-row" @submit.prevent="subscribe">
          <label for="ft-mail" class="sr-only">Email address</label>
          <input id="ft-mail" v-model="email" type="email" required placeholder="Your email address" class="h-[52px] min-w-0 border border-line-dark-2 bg-transparent px-[18px] text-[15px] text-on-dark outline-none transition-colors placeholder:text-text-dark-3 focus:border-champagne sm:flex-1 sm:border-r-0">
          <button class="h-[52px] border border-bg bg-bg px-[30px] text-xs font-medium uppercase tracking-[0.16em] text-ink transition-colors hover:bg-champagne hover:border-champagne" data-track="newsletter_subscribe">Subscribe</button>
        </form>
        <p v-if="nlMsg" class="text-sm md:col-start-2" role="status">{{ nlMsg }}</p><p v-if="nlErr" class="text-sm md:col-start-2" role="alert">{{ nlErr }}</p>
      </div>
    </div>

    <div class="wrap grid grid-cols-2 gap-x-6 gap-y-5 pb-4 pt-6 md:grid-cols-[4fr_2fr_3fr_3fr] md:gap-x-8 md:gap-y-4 md:pt-7">
      <div class="col-span-2 flex flex-col gap-2.5 md:col-span-1">
        <img src="/brand/logo-full-reversed.svg" :alt="s?.company_name || 'SoftLadyLux'" width="188" height="48" class="h-12 w-auto self-start" loading="lazy">
        <p class="max-w-[330px] text-[13px] leading-[1.55] text-on-dark/85">{{ s?.footer_about || "Premium women's fashion and intimates, made to feel as good as they look." }}</p>
        <ul v-if="social.length" class="mt-1 flex flex-wrap gap-2.5" aria-label="Follow us">
          <li v-for="([n, u, icon], i) in social" :key="n" class="social-in" :style="{ animationDelay: `${i * 70}ms` }">
            <a :href="u" :aria-label="n" :title="n" target="_blank" rel="noopener" class="social-btn" :style="{ '--brand': `var(--brand-${icon})` }" :data-track="`footer_social_${icon}`">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path :d="SOCIAL_ICON_PATHS[icon]" /></svg>
            </a>
          </li>
        </ul>
      </div>
      <nav class="flex flex-col gap-0.5" aria-label="Shop"><div class="mb-1 text-xs font-medium uppercase tracking-[0.22em] text-champagne">Shop</div><NuxtLink v-for="c in cats ?? []" :key="c.slug" :to="`/shop/${c.slug}`" class="flex min-h-9 items-center text-[13.5px] leading-normal transition-colors hover:text-white">{{ c.name }}</NuxtLink></nav>
      <!-- THM-31 (v1.10): two Help sub-columns only from xl; at md/lg they were too narrow and links wrapped -->
      <nav class="flex flex-col xl:grid xl:grid-cols-2 xl:content-start xl:gap-x-6" aria-label="Help"><div class="mb-1 xl:col-span-2 text-xs font-medium uppercase tracking-[0.22em] text-champagne">Help</div>
        <NuxtLink to="/size-guide" class="flex min-h-9 items-center text-[13.5px] leading-normal transition-colors hover:text-white">Size chart</NuxtLink><NuxtLink to="/size-guide" class="flex min-h-9 items-center text-[13.5px] leading-normal transition-colors hover:text-white">Size calculator</NuxtLink><NuxtLink to="/track" class="flex min-h-9 items-center text-[13.5px] leading-normal transition-colors hover:text-white">Track my order</NuxtLink><NuxtLink to="/wishlist" class="flex min-h-9 items-center text-[13.5px] leading-normal transition-colors hover:text-white">Wishlist</NuxtLink><NuxtLink to="/login" class="flex min-h-9 items-center text-[13.5px] leading-normal transition-colors hover:text-white">Login / Register</NuxtLink><NuxtLink to="/contact" class="flex min-h-9 items-center text-[13.5px] leading-normal transition-colors hover:text-white">Contact us</NuxtLink>
        <NuxtLink v-for="p in pages" :key="p.slug" :to="`/pages/${p.slug}`" class="flex min-h-9 items-center text-[13.5px] leading-normal transition-colors hover:text-white">{{ p.title }}</NuxtLink>
      </nav>
      <address class="col-span-2 flex flex-col gap-0.5 text-[13.5px] not-italic md:col-span-1"><div class="mb-1 text-xs font-medium uppercase tracking-[0.22em] text-champagne">Contact</div>
        <!-- v1.11 owner request: an icon before each contact value (line icons in champagne; WhatsApp and Messenger in
             their brand colours). Phone numbers and email are tappable links. -->
        <span class="ct-row leading-[1.6]">
          <svg class="ct-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
          <span><span class="sr-only">Address: </span>{{ ph(s?.address_line1, 'STORE ADDRESS') }}<template v-if="s?.address_line2">, {{ s.address_line2 }}</template><br>{{ ph(s?.city, 'CITY') }}, {{ s?.country || 'Bangladesh' }}</span>
        </span>
        <span class="ct-row mt-1.5">
          <svg class="ct-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.2" /><path d="M10.5 18.5h3" /></svg>
          <span class="flex flex-wrap gap-x-2"><span class="sr-only">Phone: </span><template v-if="s?.support_phones?.length"><a v-for="(ph1, k) in s.support_phones" :key="ph1" :href="`tel:${ph1.replace(/[^\d+]/g, '')}`" class="transition-colors hover:text-white">{{ ph1 }}{{ k < s.support_phones.length - 1 ? ',' : '' }}</a></template><template v-else>[PHONE NUMBER]</template></span>
        </span>
        <span class="ct-row mt-1.5">
          <svg class="ct-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 6.5 8.5-6.5" /></svg>
          <span><span class="sr-only">Email: </span><a v-if="s?.support_email" :href="`mailto:${s.support_email}`" class="break-all transition-colors hover:text-white">{{ s.support_email }}</a><template v-else>[EMAIL ADDRESS]</template></span>
        </span>
        <span class="ct-row mt-1.5">
          <svg class="ct-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="13" width="4" height="6" rx="1.5" /><rect x="17" y="13" width="4" height="6" rx="1.5" /><path d="M19 19c0 1.5-1.5 2.5-4 2.5h-2" /></svg>
          <span>Support: {{ ph(s?.working_hours, 'SUPPORT HOURS') }}</span>
        </span>
        <span class="mt-1.5 flex flex-wrap gap-x-[18px]">
          <a v-if="wa" :href="wa" target="_blank" rel="noopener" class="inline-flex min-h-9 items-center gap-2 border-b border-champagne transition-colors hover:text-white" data-track="footer_whatsapp"><svg class="h-4 w-4 flex-none text-[var(--brand-whatsapp)]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path :d="SOCIAL_ICON_PATHS.whatsapp" /></svg>WhatsApp</a><span v-else class="opacity-60">WhatsApp [NUMBER]</span>
          <a v-if="s?.messenger_link" :href="s.messenger_link" target="_blank" rel="noopener" class="inline-flex min-h-9 items-center gap-2 border-b border-champagne transition-colors hover:text-white" data-track="footer_messenger"><svg class="h-4 w-4 flex-none text-[var(--brand-messenger)]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path :d="SOCIAL_ICON_PATHS.messenger" /></svg>Messenger</a><span v-else class="opacity-60">Messenger [LINK]</span>
        </span>
        <!-- Owner request (2026-11): on phones the credit sits under Contact instead of the bottom bar -->
        <span class="mt-3 text-[12.5px] text-on-dark/75 md:hidden">Designed and Developed by <a href="https://sonetverse.com" target="_blank" rel="noopener" class="inline-flex min-h-9 items-center border-b border-champagne text-on-dark transition-colors hover:text-white" data-track="footer_credit">Sonetverse</a></span>
      </address>
    </div>

    <div class="border-t border-line-dark">
      <div class="wrap flex flex-wrap items-center justify-between gap-x-6 gap-y-0 py-1 text-[12.5px] text-on-dark/75">
        <span class="py-1.5">{{ s?.copyright_text || `© ${new Date().getFullYear()} ${s?.company_name}. All rights reserved.` }}</span>
        <span class="hidden md:inline">Designed and Developed by <a href="https://sonetverse.com" target="_blank" rel="noopener" class="inline-flex min-h-9 items-center border-b border-champagne text-on-dark transition-colors hover:text-white" data-track="footer_credit">Sonetverse</a></span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
/* STF-UI-02 (v1.11): round outline buttons; on hover they lift, fill with the network's colour and the icon turns white. */
/* v1.11: contact rows: icon + value, icon aligned to the first text line */
.ct-row { display: flex; align-items: flex-start; gap: 0.625rem; }
.ct-ico { width: 1rem; height: 1rem; flex: none; margin-top: 0.15rem; color: var(--color-champagne); }
.social-btn {
  display: flex; height: 2.5rem; width: 2.5rem; align-items: center; justify-content: center; border-radius: 9999px;
  border: 1px solid var(--color-line-dark-2); color: var(--color-on-dark);
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), background-color 0.25s, border-color 0.25s, color 0.25s, box-shadow 0.25s;
}
.social-btn:hover { transform: translateY(-3px); background-color: var(--brand); border-color: var(--brand); color: var(--color-on-dark); box-shadow: 0 8px 18px -8px var(--brand); }
.social-btn:focus-visible { outline: 2px solid var(--color-champagne); outline-offset: 3px; }
.social-btn svg { transition: transform 0.25s; }
.social-btn:hover svg { transform: scale(1.08); }
@media (prefers-reduced-motion: no-preference) {
  .social-in { animation: social-pop 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
  @keyframes social-pop { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
}
@media (prefers-reduced-motion: reduce) { .social-btn, .social-btn svg { transition: none; } .social-btn:hover { transform: none; } }
</style>
