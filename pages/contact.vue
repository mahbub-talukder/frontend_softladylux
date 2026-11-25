<script setup lang="ts">
import { SOCIAL_ICON_PATHS } from '~/utils/socialIcons'
// Design: Contact board. SRS NTF-01 (stored, emailed to support, honeypot + rate limit), NTF-05
// (WhatsApp/Messenger in the footer), SET-08 (address, phone, email from Settings).
definePageMeta({ layout: 'bleed' })
const { api, errorOf } = useApi()
const { data: s } = await useSiteSettings()
// SEO copy v1 (docs/seo-copy.md): phone, email and area come from Settings.
useSeoMeta({
  title: () => `Contact Us: ${[s.value?.address_line1?.split(',').at(-2)?.trim(), s.value?.city].filter(Boolean).join(', ') || 'Dhaka'}`,
  description: () => [
    s.value?.support_phones?.[0] ? `Call or WhatsApp ${s.value.support_phones[0]}` : '',
    s.value?.support_email ? `email ${s.value.support_email}` : '',
    s.value?.city ? `or visit us in ${s.value.city}` : ''
  ].filter(Boolean).join(', ') + '.' + (s.value?.working_hours ? ` ${s.value.working_hours}.` : '')
})
const f = reactive({ name: '', phone: '', email: '', subject: '', message: '', website: '' })
const errors = ref<Record<string, string>>({})
const message = ref('')
const sent = ref(false)
const busy = ref(false)
const social = computed(() => ([['Facebook', s.value?.facebook_url, 'facebook'], ['Instagram', s.value?.instagram_url, 'instagram'], ['YouTube', s.value?.youtube_url, 'youtube'], ['TikTok', s.value?.tiktok_url, 'tiktok'], ['Messenger', s.value?.messenger_link, 'messenger']] as [string, string | undefined, string][]).filter(([, u]) => u))
// v1.11 owner request: Google map from the coordinates in Admin → Settings → Contact & social (no API key needed).
const map = computed(() => {
  const lat = Number(s.value?.map_latitude), lng = Number(s.value?.map_longitude)
  if (!s.value?.map_latitude || !s.value?.map_longitude || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { embed: `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`, open: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` }
})
const tel = (n: string) => `tel:${n.replace(/[^\d+]/g, '')}`

async function send() {
  busy.value = true; errors.value = {}; message.value = ''
  try { await api('/contact/', { method: 'POST', body: f }); sent.value = true }
  catch (e) {
    const er = errorOf(e); const flat: Record<string, string> = {}
    for (const [k, v] of Object.entries(er.fields)) flat[k] = Array.isArray(v) ? v.join(' ') : String(v)
    errors.value = flat; message.value = Object.keys(flat).length ? '' : er.message
  } finally { busy.value = false }
}
function again() { Object.assign(f, { name: '', phone: '', email: '', subject: '', message: '', website: '' }); sent.value = false }
</script>

<template>
  <div>
    <StorePageBand eyebrow="We are here to help" title="Contact us" blurb="Questions about sizing, an order or a gift? Send us a message and our team will reply by email." />
    <section class="wrap flex flex-col gap-12 pb-16 pt-10 md:pb-24 md:pt-16 lg:flex-row lg:items-start lg:gap-[72px]">
      <div class="min-w-0 flex-1">
        <form v-if="!sent" class="relative grid gap-5 sm:grid-cols-2" @submit.prevent="send">
          <div class="fld"><label class="sf-lbl" for="cn">Your name</label><input id="cn" v-model="f.name" class="sf-inp" autocomplete="name" required><p v-if="errors.name" class="err">{{ errors.name }}</p></div>
          <div class="fld"><label class="sf-lbl" for="cp">Mobile</label><input id="cp" v-model="f.phone" class="sf-inp" inputmode="tel" autocomplete="tel"></div>
          <div class="fld sm:col-span-2"><label class="sf-lbl" for="ce">Email</label><input id="ce" v-model="f.email" class="sf-inp" type="email" autocomplete="email" required><p v-if="errors.email" class="err">{{ errors.email }}</p></div>
          <div class="fld sm:col-span-2"><label class="sf-lbl" for="cs">Subject</label><input id="cs" v-model="f.subject" class="sf-inp" ></div>
          <div class="fld sm:col-span-2"><label class="sf-lbl" for="cm">Message</label><textarea id="cm" v-model="f.message" class="sf-inp" required /><p v-if="errors.message" class="err">{{ errors.message }}</p></div>
          <!-- Honeypot: hidden from people; bots that fill it are ignored (NTF-01) -->
          <div class="absolute -left-[9999px]" aria-hidden="true"><label for="hw">Leave this empty</label><input id="hw" v-model="f.website" tabindex="-1" autocomplete="off"></div>
          <p v-if="message" class="border-l-[3px] border-accent bg-surface px-3.5 py-2.5 text-sm sm:col-span-2" role="alert">{{ message }}</p>
          <div class="flex flex-wrap items-center gap-x-5 gap-y-3 sm:col-span-2"><button class="btn !h-[54px] w-full sm:w-auto" :disabled="busy" data-track="contact_submit"><span v-if="busy" class="btn-spin" />Send message</button><span class="text-[13.5px] text-muted">Your message is emailed to our team instantly.</span></div>
        </form>
        <div v-else class="flex flex-col items-start gap-4 bg-cream px-6 py-12 md:px-11 md:py-14" role="status"><div class="eyebrow">Message sent</div><h2 class="font-display text-h2 leading-[1.05] md:text-h2-lg">Thank you for reaching out</h2><p class="max-w-[440px] text-base leading-[1.7] text-body">We have received your message and notified our team by email. You will hear back soon.</p><button class="btn-secondary" @click="again">Send another message</button></div>
      </div>
      <aside class="min-w-0 lg:w-[400px] lg:flex-none">
        <!-- v1.11: live Google map when the owner has set the coordinates; the drawn placeholder otherwise -->
        <div v-if="map" class="relative aspect-[16/10] overflow-hidden bg-tile-6">
          <iframe :src="map.embed" :title="`Map: ${s?.company_name || 'our shop'}`" class="absolute inset-0 h-full w-full border-0" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen />
        </div>
        <div v-else class="relative flex aspect-[16/10] items-center justify-center bg-tile-6">
          <div class="absolute inset-0 bg-[linear-gradient(var(--color-field)_1px,transparent_1px),linear-gradient(90deg,var(--color-field)_1px,transparent_1px)] bg-[length:48px_48px] opacity-50" />
          <div class="relative flex flex-col items-center gap-2 text-accent"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg><span class="text-xs uppercase tracking-[0.2em] text-gold">Our location</span></div>
        </div>
        <a v-if="map" :href="map.open" target="_blank" rel="noopener" class="lnk mt-3 inline-flex text-sm" data-track="contact_map_open">Open in Google Maps</a>

        <!-- v1.11 owner request: an icon for every detail -->
        <div class="border-b border-border py-7">
          <div class="sf-lbl mb-3">Visit us</div>
          <p class="ci-row"><svg class="ci-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg><span>{{ s?.address_line1 || '[STORE ADDRESS]' }}<template v-if="s?.address_line2">, {{ s.address_line2 }}</template><br>{{ s?.city || '[CITY]' }}, {{ s?.country }}</span></p>
        </div>
        <div class="flex flex-col gap-2.5 py-7" :class="social.length ? 'border-b border-border' : ''">
          <div class="sf-lbl mb-0.5">Call or write</div>
          <p class="ci-row"><svg class="ci-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.2" /><path d="M10.5 18.5h3" /></svg><span class="flex flex-wrap gap-x-2"><template v-if="s?.support_phones?.length"><a v-for="(n, k) in s.support_phones" :key="n" :href="tel(n)" class="transition-colors hover:text-accent">{{ n }}{{ k < s.support_phones.length - 1 ? ',' : '' }}</a></template><template v-else>[PHONE NUMBER]</template></span></p>
          <p class="ci-row"><svg class="ci-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 6.5 8.5-6.5" /></svg><a v-if="s?.support_email" :href="`mailto:${s.support_email}`" class="break-all transition-colors hover:text-accent">{{ s.support_email }}</a><span v-else>[EMAIL ADDRESS]</span></p>
          <p v-if="s?.working_hours" class="ci-row !text-sm !text-muted"><svg class="ci-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="13" width="4" height="6" rx="1.5" /><rect x="17" y="13" width="4" height="6" rx="1.5" /><path d="M19 19c0 1.5-1.5 2.5-4 2.5h-2" /></svg><span>Support: {{ s.working_hours }}</span></p>
        </div>
        <div v-if="social.length" class="py-7"><div class="sf-lbl mb-3">Follow</div><div class="flex flex-wrap gap-2.5"><a v-for="[n, u, icon] in social" :key="n" :href="u" target="_blank" rel="noopener" :aria-label="n" :title="n" class="flex h-11 w-11 items-center justify-center rounded-full border border-ink transition-colors hover:bg-ink hover:text-bg"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path :d="SOCIAL_ICON_PATHS[icon]" /></svg></a></div></div>
      </aside>
    </section>
  </div>
</template>

<style scoped>
/* v1.11: icon + value rows on the Contact page */
.ci-row { display: flex; align-items: flex-start; gap: 0.75rem; font-size: 1rem; line-height: 1.7; color: var(--color-body); }
.ci-ico { margin-top: 0.3rem; height: 1.125rem; width: 1.125rem; flex: none; color: var(--color-accent); }
</style>
