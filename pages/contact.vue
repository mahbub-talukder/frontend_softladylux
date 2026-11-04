<script setup lang="ts">
// Design: Contact board. SRS NTF-01 (stored, emailed to support, honeypot + rate limit), NTF-05
// (WhatsApp/Messenger in the footer), SET-08 (address, phone, email from Settings).
useSeoMeta({ title: 'Contact us' })
definePageMeta({ layout: 'bleed' })
const { api, errorOf } = useApi()
const { data: s } = await useSiteSettings()
const f = reactive({ name: '', phone: '', email: '', subject: '', message: '', website: '' })
const errors = ref<Record<string, string>>({})
const message = ref('')
const sent = ref(false)
const busy = ref(false)
const social = computed(() => ([['Facebook', s.value?.facebook_url], ['Instagram', s.value?.instagram_url], ['YouTube', s.value?.youtube_url], ['TikTok', s.value?.tiktok_url]] as [string, string | undefined][]).filter(([, u]) => u))

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
        <div v-else class="flex flex-col items-start gap-4 bg-cream px-6 py-12 md:px-11 md:py-14" role="status"><div class="eyebrow">Message sent</div><h2 class="font-display text-[34px] leading-[1.05] md:text-[44px]">Thank you for reaching out</h2><p class="max-w-[440px] text-base leading-[1.7] text-body">We have received your message and notified our team by email. You will hear back soon.</p><button class="btn-secondary" @click="again">Send another message</button></div>
      </div>
      <aside class="min-w-0 lg:w-[400px] lg:flex-none">
        <div class="relative flex aspect-[16/10] items-center justify-center bg-tile-6">
          <div class="absolute inset-0 bg-[linear-gradient(var(--color-field)_1px,transparent_1px),linear-gradient(90deg,var(--color-field)_1px,transparent_1px)] bg-[length:48px_48px] opacity-50" />
          <div class="relative flex flex-col items-center gap-2 text-accent"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg><span class="text-[11px] uppercase tracking-[0.2em] text-gold">Our location</span></div>
        </div>
        <div class="border-b border-border py-7"><div class="sf-lbl mb-2.5">Visit us</div><p class="text-base leading-[1.7] text-body">{{ s?.address_line1 || '[STORE ADDRESS]' }}<br>{{ s?.city || '[CITY]' }}, {{ s?.country }}</p></div>
        <div class="py-7" :class="social.length ? 'border-b border-border' : ''"><div class="sf-lbl mb-2.5">Call or write</div><p class="text-base leading-[1.7] text-body">{{ s?.support_phones?.[0] || '[PHONE NUMBER]' }}<br>{{ s?.support_email || '[EMAIL ADDRESS]' }}</p><p v-if="s?.working_hours" class="mt-1 text-sm text-muted">Support: {{ s.working_hours }}</p></div>
        <div v-if="social.length" class="py-7"><div class="sf-lbl mb-3">Follow</div><div class="flex gap-2.5"><a v-for="[n, u] in social" :key="n" :href="u" target="_blank" rel="noopener" :aria-label="n" class="flex h-11 w-11 items-center justify-center border border-ink text-xs font-medium transition-colors hover:bg-ink hover:text-bg">{{ n.slice(0, 2) }}</a></div></div>
      </aside>
    </section>
  </div>
</template>
