<script setup lang="ts">
// Design: Footer board. SRS SET-08 / STF: contact, support hours, WhatsApp and Messenger links
// live here (no header bar, no floating button). Values come from Settings; brackets mark
// placeholders shown until the owner supplies real data.
import type { StaticPage } from '~/types/api'

const { data: s } = await useSiteSettings()
const { api } = useApi()
const { data: pages } = await useAsyncData('footer-pages', async () => {
  const slugs = ['about', 'delivery-returns', 'privacy', 'terms']
  const out = await Promise.all(slugs.map((x) => api<StaticPage>(`/pages/${x}/`).catch(() => null)))
  return out.filter((p): p is StaticPage => !!p)
})
const ph = (v: string | undefined, label: string) => v || `[${label}]`
const wa = computed(() => {
  const n = (s.value?.whatsapp_number || '').replace(/\D/g, '')
  return n ? `https://wa.me/${n}` : ''
})
const social = computed(() => ([['Facebook', s.value?.facebook_url, 'Fb'], ['Instagram', s.value?.instagram_url, 'Ig'], ['YouTube', s.value?.youtube_url, 'Yt'], ['TikTok', s.value?.tiktok_url, 'Tt']] as [string, string | undefined, string][]).filter(([, u]) => u) as [string, string, string][])
const { data: cats } = await useCategories()
const words = computed(() => { const n = s.value?.company_name || 'SoftLadyLux'; const i = n.search(/[A-Z][a-z]+$/); return i > 0 ? [n.slice(0, i), n.slice(i)] : [n, ''] })
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
  <footer class="bg-dark text-text-dark">
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

    <div class="wrap grid grid-cols-2 gap-x-6 gap-y-8 pb-8 pt-9 md:grid-cols-[4fr_2fr_3fr_3fr] md:gap-10 md:pt-11">
      <div class="col-span-2 flex flex-col gap-3.5 md:col-span-1">
        <div class="font-display text-[30px] leading-none tracking-[0.06em] text-on-dark">{{ words[0] }}<span v-if="words[1]" class="italic text-rose-soft">{{ words[1] }}</span></div>
        <p class="max-w-[330px] text-sm leading-[1.6] text-text-dark-2">{{ s?.footer_about || "Premium women's fashion and intimates, made to feel as good as they look." }}</p>
        <div class="mt-1 flex gap-2.5"><a v-for="[n, u, t] in social" :key="n" :href="u" :aria-label="n" target="_blank" rel="noopener" class="flex h-11 w-11 items-center justify-center border border-line-dark-2 text-xs font-medium tracking-[0.06em] text-on-dark/90 transition-colors hover:border-champagne hover:text-champagne">{{ t }}</a></div>
      </div>
      <nav class="flex flex-col gap-0.5" aria-label="Shop"><div class="mb-2 text-[11.5px] font-medium uppercase tracking-[0.22em] text-champagne">Shop</div><NuxtLink v-for="c in cats ?? []" :key="c.slug" :to="`/shop/${c.slug}`" class="text-sm leading-normal transition-colors hover:text-white inline-block py-[3px]">{{ c.name }}</NuxtLink></nav>
      <nav class="flex flex-col md:grid md:grid-cols-2 md:content-start md:gap-x-6" aria-label="Help"><div class="mb-2 md:col-span-2 text-[11.5px] font-medium uppercase tracking-[0.22em] text-champagne">Help</div>
        <NuxtLink to="/size-guide" class="text-sm leading-normal transition-colors hover:text-white inline-block py-[3px]">Size chart</NuxtLink><NuxtLink to="/size-guide" class="text-sm leading-normal transition-colors hover:text-white inline-block py-[3px]">Size calculator</NuxtLink><NuxtLink to="/track" class="text-sm leading-normal transition-colors hover:text-white inline-block py-[3px]">Track my order</NuxtLink><NuxtLink to="/wishlist" class="text-sm leading-normal transition-colors hover:text-white inline-block py-[3px]">Wishlist</NuxtLink><NuxtLink to="/login" class="text-sm leading-normal transition-colors hover:text-white inline-block py-[3px]">Login / Register</NuxtLink><NuxtLink to="/contact" class="text-sm leading-normal transition-colors hover:text-white inline-block py-[3px]">Contact us</NuxtLink>
        <NuxtLink v-for="p in pages" :key="p.slug" :to="`/pages/${p.slug}`" class="text-sm leading-normal transition-colors hover:text-white inline-block py-[3px]">{{ p.title }}</NuxtLink>
      </nav>
      <address class="col-span-2 flex flex-col gap-1 text-sm not-italic md:col-span-1"><div class="mb-2 text-[11.5px] font-medium uppercase tracking-[0.22em] text-champagne">Contact</div>
        <span class="leading-[1.6]">{{ ph(s?.address_line1, 'STORE ADDRESS') }}<template v-if="s?.address_line2">, {{ s.address_line2 }}</template><br>{{ ph(s?.city, 'CITY') }}, {{ s?.country || 'Bangladesh' }}</span>
        <span class="mt-1">{{ s?.support_phones?.length ? s.support_phones.join(', ') : '[PHONE NUMBER]' }}</span><span>{{ ph(s?.support_email, 'EMAIL ADDRESS') }}</span>
        <span class="mt-1">Support: {{ ph(s?.working_hours, 'SUPPORT HOURS') }}</span>
        <span class="mt-1.5 flex gap-[18px]"><a v-if="wa" :href="wa" target="_blank" rel="noopener" class="min-h-6 border-b border-champagne transition-colors hover:text-white" data-track="footer_whatsapp">WhatsApp</a><span v-else class="opacity-60">WhatsApp [NUMBER]</span><a v-if="s?.messenger_link" :href="s.messenger_link" target="_blank" rel="noopener" class="min-h-6 border-b border-champagne transition-colors hover:text-white" data-track="footer_messenger">Messenger</a><span v-else class="opacity-60">Messenger [LINK]</span></span>
      </address>
    </div>

    <div class="border-t border-line-dark">
      <div class="wrap flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4 text-[13px] text-text-dark-3">
        <span>{{ s?.copyright_text || `© ${new Date().getFullYear()} ${s?.company_name}. All rights reserved.` }}</span>
        <span>Designed and Developed by <a href="https://sonetverse.com" target="_blank" rel="noopener" class="border-b border-champagne text-text-dark transition-colors hover:text-white" data-track="footer_credit">Sonetverse</a></span>
      </div>
    </div>
  </footer>
</template>
