<script setup lang="ts">
// Design: AdminSettings board. SRS ADM-05, SET-01..05, SET-09, ACC-02 (SMS key is write-only).
// Placeholders show in brackets until the owner supplies real values (SET-08).
// UI-06 / §10: every field is validated inline against the API's limits; the tab holding a problem is flagged and opened.
import type { Dict, Media } from '~/types/api'
import type { Rule } from '~/utils/validators'

definePageMeta({ layout: 'admin', permission: 'settings.manage' })
const { api, errorOf, toast } = useApi()

type Kind = 'email' | 'url' | 'money' | 'int'
type Field = { key: string; label: string; ph?: string; type?: 'text' | 'textarea' | 'number' | 'password' | 'switch' | 'list'; note?: string; req?: boolean; max?: number; kind?: Kind; rule?: Rule }
const jsonObject: Rule = (x) => {
  if (x === '' || x == null) return null
  try { const j = JSON.parse(String(x)); return j && typeof j === 'object' && !Array.isArray(j) ? null : 'Use a JSON object, e.g. {"to":"…"}.' } catch { return 'This is not valid JSON.' }
}
const TABS: { id: string; label: string; title: string; fields: Field[]; note?: string }[] = [
  { id: 'company', label: 'Company', title: 'Company', fields: [
    { key: 'company_name', label: 'Business name', req: true, max: 120 },
    { key: 'tagline', label: 'Tagline', ph: '[TAGLINE]', max: 200 },
    { key: 'address_line1', label: 'Address line 1', ph: '[STORE ADDRESS]', max: 200 },
    { key: 'address_line2', label: 'Address line 2', max: 200 },
    { key: 'city', label: 'City', ph: '[CITY]', max: 80 },
    { key: 'country', label: 'Country', max: 80 },
    { key: 'footer_about', label: 'Footer about text', type: 'textarea', ph: '[ABOUT TEXT]' },
    { key: 'copyright_text', label: 'Copyright text', ph: '[COPYRIGHT]', max: 200 }] },
  { id: 'contact', label: 'Contact & social', title: 'Contact & social', note: 'WhatsApp, Messenger and support hours appear in the website footer.', fields: [
    { key: 'support_phones', label: 'Support phone(s), comma separated', type: 'list', ph: '[PHONE NUMBER]' },
    { key: 'support_email', label: 'Support email', ph: '[EMAIL ADDRESS]', kind: 'email' },
    { key: 'working_hours', label: 'Support hours', ph: '[SUPPORT HOURS]', max: 200 },
    { key: 'whatsapp_number', label: 'WhatsApp number', ph: '[WHATSAPP NUMBER]', max: 20 },
    { key: 'messenger_link', label: 'Messenger link', ph: 'https://m.me/[PAGE]', kind: 'url', max: 200 },
    { key: 'facebook_url', label: 'Facebook URL', kind: 'url', max: 200 }, { key: 'instagram_url', label: 'Instagram URL', kind: 'url', max: 200 },
    { key: 'youtube_url', label: 'YouTube URL', kind: 'url', max: 200 }, { key: 'tiktok_url', label: 'TikTok URL', kind: 'url', max: 200 }] },
  { id: 'payment', label: 'Payment', title: 'Payment', note: 'No gateway is connected. bKash/Nagad payments are matched by transaction ID and verified manually.', fields: [
    { key: 'bkash_number', label: 'bKash merchant number', ph: '[MERCHANT NUMBER]', max: 20 },
    { key: 'bkash_account_type', label: 'bKash account type', ph: 'Personal / Merchant', max: 20 },
    { key: 'nagad_number', label: 'Nagad merchant number', ph: '[MERCHANT NUMBER]', max: 20 },
    { key: 'nagad_account_type', label: 'Nagad account type', ph: 'Personal / Merchant', max: 20 },
    { key: 'payment_instructions', label: 'Payment instructions (shown at checkout)', type: 'textarea' },
    { key: 'cod_enabled', label: 'Cash on delivery enabled', type: 'switch' }] },
  { id: 'delivery', label: 'Delivery fees', title: 'Delivery fees', fields: [
    { key: 'delivery_fee_inside_dhaka', label: 'Inside Dhaka (৳)', type: 'number', kind: 'money', req: true },
    { key: 'delivery_fee_outside_dhaka', label: 'Outside Dhaka (৳)', type: 'number', kind: 'money', req: true },
    { key: 'delivery_time_inside_dhaka', label: 'Delivery time text, inside Dhaka', ph: '[DELIVERY TIME]', max: 80 },
    { key: 'delivery_time_outside_dhaka', label: 'Delivery time text, outside Dhaka', ph: '[DELIVERY TIME]', max: 80 }] },
  { id: 'rules', label: 'Order rules', title: 'Order rules', note: 'Drafts hold no stock and are never auto-cancelled. Stock is deducted at Confirm and restored on cancel-after-confirm or return.', fields: [
    { key: 'stale_draft_hours', label: 'Highlight Draft orders older than (hours)', type: 'number', kind: 'int', req: true },
    { key: 'low_stock_threshold', label: 'Low-stock alert at', type: 'number', kind: 'int', req: true },
    { key: 'order_number_prefix', label: 'Order number prefix', max: 10 }] },
  { id: 'analytics', label: 'Analytics', title: 'Analytics', note: 'GTM loads only after the visitor accepts the cookie banner. GA4 is configured inside GTM.', fields: [
    { key: 'gtm_id', label: 'Google Tag Manager ID', ph: 'GTM-XXXXXXX', max: 20, rule: (x) => (x && !String(x).trim().startsWith('GTM-') ? 'A Tag Manager ID starts with GTM-.' : null) }] },
  { id: 'sms', label: 'SMS', title: 'SMS provider (MiMSMS)', note: 'Used for OTP messages. Environment variables take priority. The key is never shown again after saving.', fields: [
    { key: 'mimsms_api_key', label: 'MiMSMS API key', type: 'password', ph: 'Leave blank to keep the saved key', max: 200 },
    { key: 'mimsms_sender_id', label: 'Sender ID', max: 40 },
    { key: 'mimsms_endpoint', label: 'API endpoint URL', ph: 'From your MiMSMS documentation', kind: 'url' },
    { key: 'mimsms_method', label: 'HTTP method', ph: 'POST or GET', max: 4, rule: (x) => (x && !/^(GET|POST)$/i.test(String(x).trim()) ? 'Use POST or GET.' : null) },
    { key: 'mimsms_params', label: 'Parameter names (JSON)', type: 'textarea', ph: '{"api_key":"…","to":"…","text":"…","sender":"…"}', note: 'Names of the fields your MiMSMS API expects.', rule: jsonObject },
    { key: 'mimsms_success_contains', label: 'Success marker in the response', max: 80 }] },
  { id: 'seo', label: 'SEO', title: 'SEO', fields: [
    { key: 'seo_title', label: 'Default page title', max: 120 },
    { key: 'seo_description', label: 'Default description', type: 'textarea', max: 300 }] }
]

// Rules mirror AdminSettingsSerializer; number inputs give '' when cleared, which the server rejects for required numbers.
const R = rules
function rulesFor(f: Field): Rule[] {
  const r: Rule[] = []
  if (f.req) r.push(R.required(`Enter ${f.label.replace(/ \(৳\)$/, '').toLowerCase()}.`))
  if (f.kind === 'email') r.push(R.email())
  if (f.kind === 'url') r.push(R.url())
  if (f.kind === 'money') r.push(R.min(0, 'Cannot be negative.'), R.max(999999.99, 'Too large.'), R.decimal(2))
  if (f.kind === 'int') r.push(R.integer(), R.min(0), R.max(32767, 'Use 32767 or less.'))
  if (f.max) r.push(R.maxLength(f.max))
  if (f.rule) r.push(f.rule)
  return r
}
const schema: Record<string, Rule[]> = {}
for (const t of TABS) for (const f of t.fields) if (f.type !== 'switch') schema[f.key] = rulesFor(f)

const tab = ref(TABS[0].id)
const current = computed(() => TABS.find((t) => t.id === tab.value)!)
const form = ref<Dict>({})
const logo = ref<Media | null>(null)
const favicon = ref<Media | null>(null)
const share = ref<Media | null>(null)
const keySet = ref(false)
const error = ref('')
const busy = ref(false)
const v = useFormValidation(() => form.value, schema)
const tabHasError = (t: (typeof TABS)[number]) => t.fields.some((f) => !!v.errorFor(f.key))

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

/** Open the first tab that has a problem and focus its first bad field. */
async function showFirstProblem() {
  const t = TABS.find((x) => tabHasError(x))
  if (!t) return
  tab.value = t.id
  await nextTick()
  const f = t.fields.find((x) => v.errorFor(x.key))
  if (f) { const el = document.getElementById(`f-${f.key}`); el?.scrollIntoView({ block: 'center', behavior: 'smooth' }); el?.focus({ preventScroll: true }) }
}

async function save() {
  error.value = ''
  if (!v.validateAll()) {
    await showFirstProblem()
    toast.error('Please fix the highlighted fields', v.summary.value.slice(0, 3))
    return
  }
  const body: Dict = { ...form.value }
  body.support_phones = String(body.support_phones || '').split(',').map((s) => s.trim()).filter(Boolean)
  body.mimsms_params = JSON.parse(String(body.mimsms_params || '{}'))
  if (!body.mimsms_api_key) delete body.mimsms_api_key
  body.logo = logo.value?.id ?? null; body.favicon = favicon.value?.id ?? null
  body.seo_share_image = share.value?.id ?? null
  // Not edited here: sending these back could overwrite changes made meanwhile on the Website content page.
  delete body.id; delete body.mimsms_api_key_set; delete body.home_sections
  busy.value = true
  try {
    await api('/admin/settings/', { method: 'PATCH', body, successMessage: 'Settings saved' })
    await load()
    await refreshNuxtData('site-settings') // the admin tab title and storefront text use the business name
  } catch (e) {
    const er = errorOf(e); error.value = er.message; v.setServerErrors(er)
    await showFirstProblem()
  } finally { busy.value = false }
}
</script>

<template>
  <section>
    <AdminHeading eyebrow="Settings" title="Business settings">
      <button class="btn btn-spin" :disabled="busy" :aria-busy="busy" data-track="settings_save" @click="save">Save changes</button>
    </AdminHeading>
    <p class="hint mb-3"><span class="text-accent" aria-hidden="true">*</span> marks mandatory fields. Everything else is optional.</p>
    <div class="mb-4 flex flex-wrap border-b border-border" role="tablist">
      <button v-for="t in TABS" :key="t.id" class="tab" :aria-pressed="tab === t.id" @click="tab = t.id">{{ t.label }}<span v-if="tabHasError(t)" class="ml-1.5 text-accent" aria-label="has errors">●</span></button>
    </div>
    <form class="card max-w-4xl md:grid md:grid-cols-2 md:gap-x-6 [&>*:not(.fld)]:col-span-2 [&>.fld:has(textarea)]:col-span-2 [&>.fld:has(input[type=file])]:col-span-2" novalidate @submit.prevent="save">
      <h2 class="text-2xl">{{ current.title }}</h2>
      <template v-if="tab === 'company'">
        <AdminMediaField v-model="logo" kind="logo" label="Logo" hint="SVG-like PNG with transparent background, about 400 × 120 px" />
        <AdminMediaField v-model="favicon" kind="logo" label="Favicon" hint="Square, 64 × 64 px" />
      </template>
      <template v-if="tab === 'seo'">
        <AdminMediaField v-model="share" kind="page" label="Default share image" hint="1200 × 630 px" />
      </template>
      <template v-for="f in current.fields" :key="f.key">
        <div v-if="f.type === 'switch'" class="fld">
          <label :for="`f-${f.key}`">{{ f.label }}</label>
          <button :id="`f-${f.key}`" type="button" role="switch" class="switch" :aria-checked="!!form[f.key]" @click="form[f.key] = !form[f.key]" />
        </div>
        <AdminFormField
          v-else :name="f.key" :label="f.label" :required="!!f.req"
          :hint="f.key === 'mimsms_api_key' && keySet ? 'A key is saved.' : (f.note ?? '')" :error="v.errorFor(f.key)"
          :counter="f.max && f.max >= 80 ? { value: String(form[f.key] ?? ''), max: f.max } : undefined"
        >
          <template #default="s">
            <textarea v-if="f.type === 'textarea'" :id="s.id" v-model="form[f.key]" class="inp" :placeholder="f.ph" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="v.onInput(f.key)" @blur="v.touch(f.key)" />
            <input
              v-else :id="s.id" v-model="form[f.key]" class="inp" :type="f.type === 'number' ? 'number' : f.type === 'password' ? 'password' : 'text'"
              :step="f.kind === 'money' ? '0.01' : f.kind === 'int' ? '1' : undefined" :min="f.type === 'number' ? 0 : undefined" :placeholder="f.ph" :autocomplete="f.type === 'password' ? 'off' : undefined"
              :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="v.onInput(f.key)" @blur="v.touch(f.key)"
            >
          </template>
        </AdminFormField>
      </template>
      <p v-if="current.note" class="hint">{{ current.note }}</p>
      <p v-if="error" class="err" role="alert">{{ error }}</p>
    </form>
  </section>
</template>
