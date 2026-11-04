<script setup lang="ts">
// Design: AdminCoupons board. SRS CPN-01..CPN-05: table with usage, status and a quick enable switch,
// plus a create/edit form with every CPN-01 field (scope, cap, dates, limits, discounted items).
import type { Dict } from '~/types/api'

definePageMeta({ layout: 'admin', permission: 'coupons.manage' })
const { api, errorOf } = useApi()
const coupons = ref<Dict[]>([])
const cats = ref<Dict[]>([])
const form = ref<Dict | null>(null)
const used = ref<Dict[]>([])
const error = ref('')
const message = ref('')

async function load() { coupons.value = await api<Dict[]>('/admin/coupons/') }
cats.value = await api<Dict[]>('/admin/categories/')
await load()

const blank = (): Dict => ({ code: '', description: '', type: 'percent', value: '', max_discount: '', min_subtotal: '0', starts_at: '', ends_at: '', usage_limit: '', per_customer_limit: '', scope: 'all', categories: [], products: [], includes_discounted: false, is_active: true })
const local = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : '')
function edit(c: Dict | null) {
  error.value = ''; message.value = ''; used.value = []
  form.value = c ? { ...c, max_discount: c.max_discount ?? '', usage_limit: c.usage_limit ?? '', per_customer_limit: c.per_customer_limit ?? '', starts_at: local(c.starts_at), ends_at: local(c.ends_at) } : blank()
  if (c) api<Dict[]>(`/admin/coupons/${c.id}/orders/`).then((r) => { used.value = r })
}
edit(null) // the create form is always on screen, as in the board
function gen() { form.value!.code = Array.from({ length: 8 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('') }
async function toggle(c: Dict) { await api(`/admin/coupons/${c.id}/`, { method: 'PATCH', body: { is_active: !c.is_active } }); await load() }
async function save() {
  const c = form.value!
  error.value = ''; message.value = ''
  const iso = (v: string) => (v ? new Date(v).toISOString() : null)
  const body: Dict = { ...c, max_discount: c.max_discount === '' ? null : c.max_discount, usage_limit: c.usage_limit === '' ? null : Number(c.usage_limit), per_customer_limit: c.per_customer_limit === '' ? null : Number(c.per_customer_limit), starts_at: iso(c.starts_at), ends_at: iso(c.ends_at), categories: c.scope === 'categories' ? c.categories : [], products: [] }
  delete body.used_count
  try {
    const saved = c.id ? await api<Dict>(`/admin/coupons/${c.id}/`, { method: 'PATCH', body }) : await api<Dict>('/admin/coupons/', { method: 'POST', body })
    message.value = 'Saved.'; await load(); edit(saved)
  } catch (e) { const er = errorOf(e); error.value = Object.values(er.fields).flat().join(' ') || er.message }
}
const disc = (c: Dict) => (c.type === 'percent' ? `${Number(c.value)}%${c.max_discount ? ` (max ${taka(c.max_discount)})` : ''}` : taka(c.value))
const until = (c: Dict) => (c.ends_at ? new Date(c.ends_at).toLocaleDateString('en-GB') : '—')
function toggleCat(id: number) { const l = form.value!.categories as number[]; form.value!.categories = l.includes(id) ? l.filter((x) => x !== id) : [...l, id] }
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
      <form v-if="form" class="card" @submit.prevent="save">
        <h2 class="text-2xl">{{ form.id ? `Edit ${form.code}` : 'Create coupon' }}</h2>
        <div class="fld"><label for="cc">Code</label><div class="flex gap-2"><input id="cc" v-model="form.code" class="inp uppercase" required><button v-if="!form.id" type="button" class="btn-secondary !px-4" @click="gen">Generate</button></div></div>
        <div class="fld"><label for="cd">Description</label><input id="cd" v-model="form.description" class="inp"></div>
        <div class="grid grid-cols-2 border border-ink" role="group" aria-label="Discount type"><button v-for="t in ([['percent', 'Percentage %'], ['fixed', 'Fixed ৳']] as const)" :key="t[0]" type="button" class="h-11 text-xs font-medium uppercase tracking-[0.14em] transition-colors" :class="form.type === t[0] ? 'bg-ink text-bg' : 'hover:bg-cream'" :aria-pressed="form.type === t[0]" @click="form.type = t[0]">{{ t[1] }}</button></div>
        <div class="grid grid-cols-2 gap-3">
          <div class="fld"><label for="cv">Value</label><input id="cv" v-model="form.value" type="number" step="0.01" class="inp" required></div>
          <div v-if="form.type === 'percent'" class="fld"><label for="cx">Max discount (৳)</label><input id="cx" v-model="form.max_discount" type="number" class="inp" placeholder="No cap"></div>
          <div class="fld"><label for="cm">Min. order (৳)</label><input id="cm" v-model="form.min_subtotal" type="number" class="inp"></div>
          <div class="fld"><label for="cl">Usage limit</label><input id="cl" v-model="form.usage_limit" type="number" class="inp" placeholder="Unlimited"></div>
          <div class="fld"><label for="cp">Per-customer limit</label><input id="cp" v-model="form.per_customer_limit" type="number" class="inp" placeholder="Unlimited"></div>
          <div class="fld"><label for="cs">Starts</label><input id="cs" v-model="form.starts_at" type="datetime-local" class="inp"></div>
          <div class="fld"><label for="ce">Valid until</label><input id="ce" v-model="form.ends_at" type="datetime-local" class="inp"></div>
        </div>
        <div class="fld"><label for="sc">Applies to</label><select id="sc" v-model="form.scope" class="inp"><option value="all">All products</option><option value="categories">Selected categories</option></select></div>
        <div v-if="form.scope === 'categories'" class="flex flex-wrap gap-2"><button v-for="c in cats" :key="c.id" type="button" class="min-h-11 border px-3 text-sm transition-colors" :class="(form.categories as number[]).includes(c.id) ? 'border-ink bg-ink text-bg' : 'border-field'" :aria-pressed="(form.categories as number[]).includes(c.id)" @click="toggleCat(c.id)">{{ c.name }}</button></div>
        <label class="flex items-center gap-2 text-sm"><input v-model="form.includes_discounted" type="checkbox">Also applies to already-discounted items</label>
        <label class="flex items-center gap-3 text-sm">Active <button type="button" role="switch" class="switch" :aria-checked="form.is_active" @click="form.is_active = !form.is_active" /></label>
        <p v-if="error" class="err" role="alert">{{ error }}</p><p v-if="message" class="hint" role="status">{{ message }}</p>
        <button class="btn" data-track="coupon_save">{{ form.id ? 'Save coupon' : 'Create coupon' }}</button>
        <div v-if="form.id"><h3 class="text-xl">Used by</h3><ul class="text-sm"><li v-for="o in used" :key="o.id"><NuxtLink :to="`/admin/orders?open=${o.id}`" class="underline">{{ o.number }}</NuxtLink> · {{ o.name }} · −{{ taka(o.discount) }} · {{ o.status }}</li><li v-if="!used.length" class="hint">Not used yet.</li></ul></div>
      </form>
    </div>
  </section>
</template>
