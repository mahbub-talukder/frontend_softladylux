<script setup lang="ts">
// Design: AdminCoupons board. SRS CPN-01..CPN-05: table with usage, status and a quick enable switch,
// plus a create/edit form with every CPN-01 field (scope, cap, dates, limits, discounted items).
// UI-06 / §10: inline validation (code 4-20 letters/digits, value > 0 and <= 100 for percent, end after start).
import type { Dict } from '~/types/api'

definePageMeta({ layout: 'admin', permission: 'coupons.manage' })
const { api, errorOf, toast } = useApi()
const coupons = ref<Dict[]>([])
const cats = ref<Dict[]>([])
const form = ref<Dict>({})
const used = ref<Dict[]>([])
const error = ref('')
const busy = ref(false)

async function load() { coupons.value = await api<Dict[]>('/admin/coupons/') }
cats.value = await api<Dict[]>('/admin/categories/')
await load()

const { required, pattern, min, gt, decimal, integer, maxLength, custom } = rules
const v = useFormValidation(() => form.value, {
  code: [required('Enter a coupon code.'), pattern(/^[A-Za-z0-9]{4,20}$/, 'Use 4-20 letters or digits, no spaces.')],
  description: [maxLength(200)],
  value: [required('Enter the discount value.'), gt(0, 'Must be greater than 0.'), decimal(2), custom((x, all) => (all.type === 'percent' && x !== '' && Number(x) > 100 ? 'A percentage cannot be more than 100.' : null))],
  max_discount: [min(0, 'Cannot be negative.'), decimal(2)],
  min_subtotal: [min(0, 'Cannot be negative.'), decimal(2)],
  usage_limit: [integer(), min(1, 'Use 1 or more, or leave empty for unlimited.')],
  per_customer_limit: [integer(), min(1, 'Use 1 or more, or leave empty for unlimited.')],
  ends_at: [custom((x, all) => (x && all.starts_at && new Date(String(x)) <= new Date(String(all.starts_at)) ? 'Must be after the start date.' : null))]
})

const blank = (): Dict => ({ code: '', description: '', type: 'percent', value: '', max_discount: '', min_subtotal: '', starts_at: '', ends_at: '', usage_limit: '', per_customer_limit: '', scope: 'all', categories: [], products: [], includes_discounted: false, is_active: true })
// <input type="datetime-local"> works in LOCAL time; the API stores UTC. Convert both ways (toISOString alone shifts by the offset).
const local = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
function edit(c: Dict | null) {
  error.value = ''; used.value = []; v.reset()
  form.value = c ? { ...c, max_discount: c.max_discount ?? '', usage_limit: c.usage_limit ?? '', per_customer_limit: c.per_customer_limit ?? '', min_subtotal: c.min_subtotal ?? '', starts_at: local(c.starts_at), ends_at: local(c.ends_at) } : blank()
  if (c) api<Dict[]>(`/admin/coupons/${c.id}/orders/`, { silent: true }).then((r) => { used.value = r }).catch(() => { used.value = [] })
}
edit(null) // the create form is always on screen, as in the board
function gen() { form.value.code = Array.from({ length: 8 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join(''); v.onInput('code') }
async function toggle(c: Dict) {
  try { await api(`/admin/coupons/${c.id}/`, { method: 'PATCH', body: { is_active: !c.is_active }, successMessage: c.is_active ? `${c.code} turned off` : `${c.code} turned on` }) } catch { /* toast shown */ }
  await load()
}
const asNumber = (x: unknown) => (x === '' || x == null ? null : Number(x))
async function save() {
  const c = form.value
  error.value = ''
  if (!v.validateAll()) { toast.error('Please fix the highlighted fields', v.summary.value.slice(0, 3)); return }
  const iso = (s: string) => (s ? new Date(s).toISOString() : null)
  const body: Dict = {
    ...c, code: String(c.code).trim().toUpperCase(), max_discount: c.type === 'percent' ? asNumber(c.max_discount) : null,
    min_subtotal: c.min_subtotal === '' ? '0' : c.min_subtotal, usage_limit: asNumber(c.usage_limit), per_customer_limit: asNumber(c.per_customer_limit),
    starts_at: iso(c.starts_at), ends_at: iso(c.ends_at), categories: c.scope === 'categories' ? c.categories : [], products: []
  }
  delete body.used_count
  busy.value = true
  try {
    const saved = c.id
      ? await api<Dict>(`/admin/coupons/${c.id}/`, { method: 'PATCH', body, successMessage: 'Coupon saved' })
      : await api<Dict>('/admin/coupons/', { method: 'POST', body, successMessage: 'Coupon created' })
    await load(); edit(saved)
  } catch (e) { const er = errorOf(e); v.setServerErrors(er); error.value = er.flat.join(' ') } finally { busy.value = false }
}
const disc = (c: Dict) => (c.type === 'percent' ? `${Number(c.value)}%${c.max_discount ? ` (max ${taka(c.max_discount)})` : ''}` : taka(c.value))
const until = (c: Dict) => (c.ends_at ? new Date(c.ends_at).toLocaleDateString('en-GB') : '—')
function toggleCat(id: number) { const l = form.value.categories as number[]; form.value.categories = l.includes(id) ? l.filter((x) => x !== id) : [...l, id] }
</script>

<template>
  <section>
    <AdminHeading eyebrow="Discounts" title="Coupon codes"><button class="btn" @click="edit(null)">+ Create coupon</button></AdminHeading>
    <div class="grid gap-6 xl:grid-cols-[1fr_440px]">
      <div class="overflow-x-auto border border-border bg-surface">
        <table class="w-full text-left text-sm">
          <thead><tr class="cap"><th class="p-3">Code</th><th class="p-3">Discount</th><th class="p-3">Min. order</th><th class="p-3">Used</th><th class="p-3">Valid until</th><th class="p-3">Active</th></tr></thead>
          <tbody>
            <tr v-for="c in coupons" :key="c.id" class="border-t border-border" :class="form?.id === c.id ? 'bg-primary-soft' : ''">
              <td class="p-3"><button class="font-semibold tracking-[0.08em] underline underline-offset-[3px]" @click="edit(c)">{{ c.code }}</button></td><td class="p-3">{{ disc(c) }}</td><td class="p-3">{{ taka(c.min_subtotal) }}</td>
              <td class="p-3">{{ c.used_count }}{{ c.usage_limit ? ` / ${c.usage_limit}` : '' }}</td><td class="p-3">{{ until(c) }}</td>
              <td class="p-3"><button type="button" role="switch" class="switch" :aria-checked="c.is_active" :aria-label="`${c.code} active`" @click="toggle(c)" /></td>
            </tr>
            <tr v-if="!coupons.length"><td colspan="6" class="p-6 text-center text-muted">No coupons yet.</td></tr>
          </tbody>
        </table>
      </div>
      <form class="card" novalidate @submit.prevent="save">
        <h2 class="text-2xl">{{ form.id ? `Edit ${form.code}` : 'Create coupon' }}</h2>
        <p class="hint"><span class="text-accent" aria-hidden="true">*</span> marks mandatory fields.</p>
        <AdminFormField name="code" label="Code" required hint="4-20 letters or digits." :error="v.errorFor('code')">
          <template #default="s"><div class="flex gap-2"><input :id="s.id" v-model="form.code" class="inp uppercase" maxlength="20" autocomplete="off" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="v.onInput('code')" @blur="v.touch('code')"><button v-if="!form.id" type="button" class="btn-secondary !px-4" @click="gen">Generate</button></div></template>
        </AdminFormField>
        <AdminFormField name="description" label="Description" :error="v.errorFor('description')">
          <template #default="s"><input :id="s.id" v-model="form.description" class="inp" maxlength="200" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="v.onInput('description')" @blur="v.touch('description')"></template>
        </AdminFormField>
        <div class="grid grid-cols-2 border border-ink" role="group" aria-label="Discount type"><button v-for="t in ([['percent', 'Percentage %'], ['fixed', 'Fixed ৳']] as const)" :key="t[0]" type="button" class="h-11 text-xs font-medium uppercase tracking-[0.14em] transition-colors" :class="form.type === t[0] ? 'bg-ink text-bg' : 'hover:bg-cream'" :aria-pressed="form.type === t[0]" @click="form.type = t[0]; v.onInput('value')">{{ t[1] }}</button></div>
        <div class="grid grid-cols-2 gap-3">
          <AdminFormField name="value" :label="form.type === 'percent' ? 'Value (%)' : 'Value (৳)'" required :error="v.errorFor('value')">
            <template #default="s"><input :id="s.id" v-model="form.value" type="number" step="0.01" min="0" inputmode="decimal" class="inp" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="v.onInput('value')" @blur="v.touch('value')"></template>
          </AdminFormField>
          <AdminFormField v-if="form.type === 'percent'" name="max_discount" label="Max discount (৳)" :error="v.errorFor('max_discount')">
            <template #default="s"><input :id="s.id" v-model="form.max_discount" type="number" min="0" step="0.01" class="inp" placeholder="No cap" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="v.onInput('max_discount')" @blur="v.touch('max_discount')"></template>
          </AdminFormField>
          <AdminFormField name="min_subtotal" label="Min. order (৳)" :error="v.errorFor('min_subtotal')">
            <template #default="s"><input :id="s.id" v-model="form.min_subtotal" type="number" min="0" step="0.01" class="inp" placeholder="0" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="v.onInput('min_subtotal')" @blur="v.touch('min_subtotal')"></template>
          </AdminFormField>
          <AdminFormField name="usage_limit" label="Usage limit" :error="v.errorFor('usage_limit')">
            <template #default="s"><input :id="s.id" v-model="form.usage_limit" type="number" min="1" step="1" class="inp" placeholder="Unlimited" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="v.onInput('usage_limit')" @blur="v.touch('usage_limit')"></template>
          </AdminFormField>
          <AdminFormField name="per_customer_limit" label="Per-customer limit" :error="v.errorFor('per_customer_limit')">
            <template #default="s"><input :id="s.id" v-model="form.per_customer_limit" type="number" min="1" step="1" class="inp" placeholder="Unlimited" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="v.onInput('per_customer_limit')" @blur="v.touch('per_customer_limit')"></template>
          </AdminFormField>
          <AdminFormField name="starts_at" label="Starts">
            <template #default="s"><input :id="s.id" v-model="form.starts_at" type="datetime-local" class="inp" @input="v.onInput('ends_at')"></template>
          </AdminFormField>
          <AdminFormField name="ends_at" label="Valid until" :error="v.errorFor('ends_at')">
            <template #default="s"><input :id="s.id" v-model="form.ends_at" type="datetime-local" class="inp" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="v.onInput('ends_at')" @blur="v.touch('ends_at')"></template>
          </AdminFormField>
        </div>
        <AdminFormField name="scope" label="Applies to" hide-optional>
          <template #default="s"><select :id="s.id" v-model="form.scope" class="inp"><option value="all">All products</option><option value="categories">Selected categories</option></select></template>
        </AdminFormField>
        <div v-if="form.scope === 'categories'" class="flex flex-wrap gap-2"><button v-for="c in cats" :key="c.id" type="button" class="min-h-11 border px-3 text-sm transition-colors" :class="(form.categories as number[]).includes(c.id) ? 'border-ink bg-ink text-bg' : 'border-field'" :aria-pressed="(form.categories as number[]).includes(c.id)" @click="toggleCat(c.id)">{{ c.name }}</button></div>
        <label class="flex items-center gap-2 text-sm"><input v-model="form.includes_discounted" type="checkbox">Also applies to already-discounted items</label>
        <label class="flex items-center gap-3 text-sm">Active <button type="button" role="switch" class="switch" :aria-checked="form.is_active" @click="form.is_active = !form.is_active" /></label>
        <p v-if="error" class="err" role="alert">{{ error }}</p>
        <button class="btn btn-spin" :disabled="busy" :aria-busy="busy" data-track="coupon_save">{{ form.id ? 'Save coupon' : 'Create coupon' }}</button>
        <div v-if="form.id"><h3 class="text-xl">Used by</h3><ul class="text-sm"><li v-for="o in used" :key="o.id"><NuxtLink :to="`/admin/orders?open=${o.id}`" class="underline">{{ o.number }}</NuxtLink> · {{ o.name }} · −{{ taka(o.discount) }} · {{ o.status }}</li><li v-if="!used.length" class="hint">Not used yet.</li></ul></div>
      </form>
    </div>
  </section>
</template>
