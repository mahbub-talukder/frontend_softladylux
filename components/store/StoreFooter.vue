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
const social = computed(() => [
  ['Facebook', s.value?.facebook_url], ['Instagram', s.value?.instagram_url],
  ['YouTube', s.value?.youtube_url], ['TikTok', s.value?.tiktok_url]
].filter(([, u]) => u) as [string, string][])
</script>

<template>
  <footer class="bg-dark px-4 py-10 text-sm text-on-dark">
    <div class="mx-auto grid max-w-screen-xl gap-8 md:grid-cols-4">
      <div>
        <div class="font-display text-2xl">{{ s?.company_name }}</div>
        <p class="mt-2 opacity-80">{{ ph(s?.footer_about, 'ABOUT TEXT') }}</p>
        <div class="mt-3 flex flex-wrap gap-3"><a v-for="[n, u] in social" :key="n" :href="u" rel="noopener" target="_blank">{{ n }}</a></div>
      </div>
      <div>
        <div class="cap text-on-dark">Help</div>
        <ul class="mt-2 flex flex-col gap-1 opacity-90">
          <li v-for="p in pages" :key="p.slug"><NuxtLink :to="`/pages/${p.slug}`">{{ p.title }}</NuxtLink></li>
          <li><NuxtLink to="/track">Track my order</NuxtLink></li>
          <li><NuxtLink to="/contact">Contact us</NuxtLink></li>
        </ul>
      </div>
      <div>
        <div class="cap text-on-dark">Contact</div>
        <address class="mt-2 flex flex-col gap-1 not-italic opacity-90">
          <span>{{ ph(s?.address_line1, 'STORE ADDRESS') }}<template v-if="s?.address_line2">, {{ s.address_line2 }}</template></span>
          <span>{{ ph(s?.city, 'CITY') }}, {{ s?.country }}</span>
          <span>{{ s?.support_phones?.length ? s.support_phones.join(', ') : '[PHONE NUMBER]' }}</span>
          <span>{{ ph(s?.support_email, 'EMAIL ADDRESS') }}</span>
          <span>Support: {{ ph(s?.working_hours, 'SUPPORT HOURS') }}</span>
        </address>
        <div class="mt-3 flex gap-4">
          <a v-if="wa" :href="wa" target="_blank" rel="noopener" data-track="footer_whatsapp">WhatsApp</a>
          <a v-else class="opacity-60">WhatsApp [NUMBER]</a>
          <a v-if="s?.messenger_link" :href="s.messenger_link" target="_blank" rel="noopener" data-track="footer_messenger">Messenger</a>
          <a v-else class="opacity-60">Messenger [LINK]</a>
        </div>
      </div>
      <div>
        <div class="cap text-on-dark">Payment</div>
        <p class="mt-2 opacity-90">We accept <b>bKash</b>, <b>Nagad</b><template v-if="s?.cod_enabled"> and cash on delivery</template>.</p>
      </div>
    </div>
    <div class="mx-auto mt-8 max-w-screen-xl border-t border-primary-hover pt-4 opacity-70">{{ s?.copyright_text || `© ${s?.company_name}. All rights reserved.` }}</div>
  </footer>
</template>
