<script setup lang="ts">
// Design: Contact board. SRS NTF-01 (stored, emailed to support, honeypot + rate limit), NTF-05
// (WhatsApp/Messenger in the footer), SET-08 (address, phone, email from Settings).
useSeoMeta({ title: 'Contact us' })
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
    <div class="cap">We are here to help</div><h1 class="text-4xl">Contact us</h1>
    <p class="mt-2 max-w-xl text-muted">Questions about sizing, an order or a gift? Send us a message and our team will reply by email.</p>
    <div class="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <form v-if="!sent" class="card" @submit.prevent="send">
        <div class="fld"><label for="cn">Your name</label><input id="cn" v-model="f.name" class="inp" autocomplete="name" required><p v-if="errors.name" class="err">{{ errors.name }}</p></div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="fld"><label for="cp">Mobile</label><input id="cp" v-model="f.phone" class="inp" inputmode="tel" autocomplete="tel"></div>
          <div class="fld"><label for="ce">Email</label><input id="ce" v-model="f.email" type="email" class="inp" autocomplete="email" required><p v-if="errors.email" class="err">{{ errors.email }}</p></div>
        </div>
        <div class="fld"><label for="cs">Subject</label><input id="cs" v-model="f.subject" class="inp"></div>
        <div class="fld"><label for="cm">Message</label><textarea id="cm" v-model="f.message" class="inp" required /><p v-if="errors.message" class="err">{{ errors.message }}</p></div>
        <!-- Honeypot: hidden from people; bots that fill it are ignored (NTF-01) -->
        <div class="absolute -left-[9999px]" aria-hidden="true"><label for="hw">Leave this empty</label><input id="hw" v-model="f.website" tabindex="-1" autocomplete="off"></div>
        <p v-if="message" class="err" role="alert">{{ message }}</p>
        <button class="btn" :disabled="busy" data-track="contact_submit">Send message</button>
        <p class="hint">Your message is emailed to our team instantly.</p>
      </form>
      <div v-else class="card" role="status"><div class="cap">Message sent</div><h2 class="text-3xl">Thank you for reaching out</h2><p>We have received your message and notified our team by email. You will hear back soon.</p><button class="btn-secondary self-start" @click="again">Send another message</button></div>
      <aside class="flex flex-col gap-4">
        <div class="card"><div class="cap">Visit us</div><p>{{ s?.address_line1 || '[STORE ADDRESS]' }}<br>{{ s?.city || '[CITY]' }}, {{ s?.country }}</p></div>
        <div class="card"><div class="cap">Call or write</div><p>{{ s?.support_phones?.[0] || '[PHONE NUMBER]' }}<br>{{ s?.support_email || '[EMAIL ADDRESS]' }}</p><p v-if="s?.working_hours" class="hint">Support: {{ s.working_hours }}</p></div>
        <div v-if="social.length" class="card"><div class="cap">Follow</div><div class="flex gap-3"><a v-for="[n, u] in social" :key="n" :href="u" target="_blank" rel="noopener" class="underline">{{ n }}</a></div></div>
      </aside>
    </div>
  </div>
</template>
