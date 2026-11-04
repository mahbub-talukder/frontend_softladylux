<script setup lang="ts">
// Design: AdminSettings board. SRS ADM-05, SET-01..05, SET-09, ACC-02 (SMS key is write-only).
// Placeholders show in brackets until the owner supplies real values (SET-08).
import type { Dict, Media } from '~/types/api'

definePageMeta({ layout: 'admin', permission: 'settings.manage' })
const { api, errorOf } = useApi()

type Field = { key: string; label: string; ph?: string; type?: 'text' | 'textarea' | 'number' | 'password' | 'switch' | 'list'; note?: string }
const TABS: { id: string; label: string; title: string; fields: Field[]; note?: string }[] = [
  { id: 'company', label: 'Company', title: 'Company', fields: [
    { key: 'company_name', label: 'Business name' },
    { key: 'tagline', label: 'Tagline', ph: '[TAGLINE]' },
    { key: 'address_line1', label: 'Address line 1', ph: '[STORE ADDRESS]' },
    { key: 'address_line2', label: 'Address line 2' },
    { key: 'city', label: 'City', ph: '[CITY]' },
    { key: 'country', label: 'Country' },
    { key: 'footer_about', label: 'Footer about text', type: 'textarea', ph: '[ABOUT TEXT]' },
    { key: 'copyright_text', label: 'Copyright text', ph: '[COPYRIGHT]' }] },
  { id: 'contact', label: 'Contact & social', title: 'Contact & social', note: 'WhatsApp, Messenger and support hours appear in the website footer.', fields: [
    { key: 'support_phones', label: 'Support phone(s), comma separated', type: 'list', ph: '[PHONE NUMBER]' },
    { key: 'support_email', label: 'Support email', ph: '[EMAIL ADDRESS]' },
    { key: 'working_hours', label: 'Support hours', ph: '[SUPPORT HOURS]' },
    { key: 'whatsapp_number', label: 'WhatsApp number', ph: '[WHATSAPP NUMBER]' },
    { key: 'messenger_link', label: 'Messenger link', ph: 'https://m.me/[PAGE]' },
    { key: 'facebook_url', label: 'Facebook URL' }, { key: 'instagram_url', label: 'Instagram URL' },
    { key: 'youtube_url', label: 'YouTube URL' }, { key: 'tiktok_url', label: 'TikTok URL' }] },
  { id: 'payment', label: 'Payment', title: 'Payment', note: 'No gateway is connected. bKash/Nagad payments are matched by transaction ID and verified manually.', fields: [
    { key: 'bkash_number', label: 'bKash merchant number', ph: '[MERCHANT NUMBER]' },
    { key: 'bkash_account_type', label: 'bKash account type', ph: 'Personal / Merchant' },
    { key: 'nagad_number', label: 'Nagad merchant number', ph: '[MERCHANT NUMBER]' },
    { key: 'nagad_account_type', label: 'Nagad account type', ph: 'Personal / Merchant' },
    { key: 'payment_instructions', label: 'Payment instructions (shown at checkout)', type: 'textarea' },
    { key: 'cod_enabled', label: 'Cash on delivery enabled', type: 'switch' }] },
  { id: 'delivery', label: 'Delivery fees', title: 'Delivery fees', fields: [
    { key: 'delivery_fee_inside_dhaka', label: 'Inside Dhaka (৳)', type: 'number' },
    { key: 'delivery_fee_outside_dhaka', label: 'Outside Dhaka (৳)', type: 'number' },
    { key: 'delivery_time_inside_dhaka', label: 'Delivery time text, inside Dhaka', ph: '[DELIVERY TIME]' },
    { key: 'delivery_time_outside_dhaka', label: 'Delivery time text, outside Dhaka', ph: '[DELIVERY TIME]' }] },
  { id: 'rules', label: 'Order rules', title: 'Order rules', note: 'Drafts hold no stock and are never auto-cancelled. Stock is deducted at Confirm and restored on cancel-after-confirm or return.', fields: [
    { key: 'stale_draft_hours', label: 'Highlight Draft orders older than (hours)', type: 'number' },
    { key: 'low_stock_threshold', label: 'Low-stock alert at', type: 'number' },
    { key: 'order_number_prefix', label: 'Order number prefix' }] },
  { id: 'analytics', label: 'Analytics', title: 'Analytics', note: 'GTM loads only after the visitor accepts the cookie banner. GA4 is configured inside GTM.', fields: [
    { key: 'gtm_id', label: 'Google Tag Manager ID', ph: 'GTM-XXXXXXX' }] },
  { id: 'sms', label: 'SMS', title: 'SMS provider (MiMSMS)', note: 'Used for OTP messages. Environment variables take priority. The key is never shown again after saving.', fields: [
    { key: 'mimsms_api_key', label: 'MiMSMS API key', type: 'password', ph: 'Leave blank to keep the saved key' },
    { key: 'mimsms_sender_id', label: 'Sender ID' },
    { key: 'mimsms_endpoint', label: 'API endpoint URL', ph: 'From your MiMSMS documentation' },
    { key: 'mimsms_method', label: 'HTTP method', ph: 'POST or GET' },
    { key: 'mimsms_params', label: 'Parameter names (JSON)', type: 'textarea', ph: '{"api_key":"…","to":"…","text":"…","sender":"…"}', note: 'Names of the fields your MiMSMS API expects.' },
    { key: 'mimsms_success_contains', label: 'Success marker in the response (optional)' }] },
  { id: 'seo', label: 'SEO', title: 'SEO', fields: [
    { key: 'seo_title', label: 'Default page title' },
    { key: 'seo_description', label: 'Default description', type: 'textarea' }] }
]
const tab = ref(TABS[0].id)
const current = computed(() => TABS.find((t) => t.id === tab.value)!)
const form = ref<Dict>({})
const logo = ref<Media | null>(null)
const favicon = ref<Media | null>(null)
const share = ref<Media | null>(null)
const keySet = ref(false)
const error = ref('')
const fieldErrors = ref<Record<string, string[]>>({})
const saved = ref(false)

async function load() {
  const d = await api<Dict>('/admin/settings/')
  logo.value = d.logo; favicon.value = d.favicon; share.value = d.seo_share_image
  keySet.value = d.mimsms_api_key_set
  d.support_phones = (d.support_phones || []).join(', ')
  d.mimsms_params = JSON.stringify(d.mimsms_params || {})
  d.mimsms_api_key = ''
  form.value = d
}
await load()

async function save() {
  error.value = ''; fieldErrors.value = {}; saved.value = false
  const body: Dict = { ...form.value }
  body.support_phones = String(body.support_phones || '').split(',').map((s) => s.trim()).filter(Boolean)
  try { body.mimsms_params = JSON.parse(String(body.mimsms_params || '{}')) } catch { error.value = 'Parameter names must be valid JSON.'; return }
  if (!body.mimsms_api_key) delete body.mimsms_api_key
  body.logo = logo.value?.id ?? null; body.favicon = favicon.value?.id ?? null
  body.seo_share_image = share.value?.id ?? null
  delete body.id; delete body.mimsms_api_key_set
  try {
    await api('/admin/settings/', { method: 'PATCH', body }); saved.value = true; await load()
  } catch (e) {
    const er = errorOf(e); error.value = er.message; fieldErrors.value = er.fields
  }
}
</script>

<template>
  <section>
    <AdminHeading eyebrow="Settings" title="Business settings">
      <button class="btn" data-track="settings_save" @click="save">Save changes</button>
    </AdminHeading>
    <div class="mb-4 flex flex-wrap border-b border-border" role="tablist">
      <button v-for="t in TABS" :key="t.id" class="tab" :aria-pressed="tab === t.id" @click="tab = t.id">{{ t.label }}</button>
    </div>
    <div class="card max-w-4xl md:grid md:grid-cols-2 md:gap-x-6 [&>*:not(.fld)]:col-span-2 [&>.fld:has(textarea)]:col-span-2 [&>.fld:has(input[type=file])]:col-span-2">
      <h2 class="text-2xl">{{ current.title }}</h2>
      <template v-if="tab === 'company'">
        <AdminMediaField v-model="logo" kind="logo" label="Logo" hint="SVG-like PNG with transparent background, about 400 × 120 px" />
        <AdminMediaField v-model="favicon" kind="logo" label="Favicon" hint="Square, 64 × 64 px" />
      </template>
      <template v-if="tab === 'seo'">
        <AdminMediaField v-model="share" kind="page" label="Default share image" hint="1200 × 630 px" />
      </template>
      <div v-for="f in current.fields" :key="f.key" class="fld">
        <template v-if="f.type === 'switch'">
          <label :for="f.key">{{ f.label }}</label>
          <button :id="f.key" type="button" role="switch" class="switch" :aria-checked="!!form[f.key]" @click="form[f.key] = !form[f.key]" />
        </template>
        <template v-else>
          <label :for="f.key">{{ f.label }}</label>
          <textarea v-if="f.type === 'textarea'" :id="f.key" v-model="form[f.key]" class="inp" :placeholder="f.ph" />
          <input v-else :id="f.key" v-model="form[f.key]" class="inp" :type="f.type === 'number' ? 'number' : f.type === 'password' ? 'password' : 'text'" :placeholder="f.ph" :autocomplete="f.type === 'password' ? 'off' : undefined">
          <p v-if="f.key === 'mimsms_api_key' && keySet" class="hint">A key is saved.</p>
        </template>
        <p v-for="m in fieldErrors[f.key] || []" :key="m" class="err">{{ m }}</p>
      </div>
      <p v-if="current.note" class="hint">{{ current.note }}</p>
      <p v-if="error" class="err" role="alert">{{ error }}</p>
      <p v-if="saved" class="hint" role="status">Saved.</p>
    </div>
  </section>
</template>
