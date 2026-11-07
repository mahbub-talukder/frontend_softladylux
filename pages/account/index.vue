<script setup lang="ts">
// Design: My account board. SRS ACC-04..ACC-08: orders with a tracking timeline (customer-safe
// wording), cancel while Draft/Confirmed, reorder, printable invoice; wishlist; profile + up to
// 5 saved addresses (SRS wins over the board's single "Default address"); account deletion.
import type { Address, CardProduct, CustomerOrder, Paged } from '~/types/api'
import type { CartLine } from '~/utils/cart'

useSeoMeta({ title: 'My account', robots: 'noindex' })
definePageMeta({ layout: 'bleed' })
const route = useRoute()
const router = useRouter()
const customer = useCustomerStore()
const cart = useCartStore()
const { api, errorOf } = useApi()

const tab = computed(() => String(route.query.tab || 'orders'))
const go = (t: string) => router.push({ query: { tab: t } })
const orders = ref<CustomerOrder[]>([])
const sel = ref<CustomerOrder | null>(null)
const wishlist = ref<CardProduct[]>([])
const addresses = ref<Address[]>([])
const profile = reactive({ full_name: '', email: '', birthday: '' })
const newAddr = reactive({ label: '', recipient_name: '', phone: '', area: 'inside_dhaka', district: '', thana: '', address_line: '' })
const msg = ref('')
const err = ref('')
const cancelling = ref(false)
const reason = ref('')

async function load() {
  const [o, w, a] = await Promise.all([api<Paged<CustomerOrder>>('/orders/'), api<CardProduct[]>('/me/wishlist/'), api<Address[]>('/me/addresses/')])
  orders.value = o.results; wishlist.value = w; addresses.value = a
  sel.value = orders.value.find((x) => x.number === sel.value?.number) ?? orders.value[0] ?? null
  Object.assign(profile, { full_name: customer.me?.full_name ?? '', email: customer.me?.email ?? '', birthday: customer.me?.birthday ?? '' })
}
await load().catch(() => undefined)
const flash = (m: string) => { msg.value = m; err.value = '' }
function fail(e: unknown) { const er = errorOf(e); err.value = Object.values(er.fields).flat().join(' ') || er.message; msg.value = '' }
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

async function cancel() {
  try { await api(`/orders/${sel.value!.number}/cancel/`, { method: 'POST', body: { reason: reason.value } }); cancelling.value = false; reason.value = ''; await load(); flash('Order cancelled.') } catch (e) { fail(e) }
}
// ACC-06 reorder: put the items back in the bag; the cart re-validates price and stock (CRT-03)
function reorder(o: CustomerOrder) {
  let n = 0
  for (const i of o.items) {
    const line: CartLine = { variant: i.variant, quantity: i.quantity, addedAt: Date.now(), name: i.product_name, label: i.variant_label, sku: i.sku, price: i.unit_price, image: null, slug: '' }
    if (cart.add(line, i.quantity) !== 'full') n++
  }
  navigateTo('/cart')
  return n
}
async function saveProfile() {
  try { const me = await api<typeof customer.me>('/me/', { method: 'PATCH', body: { full_name: profile.full_name, email: profile.email, birthday: profile.birthday || '' } }); customer.setMe(me!); flash('Profile saved.') } catch (e) { fail(e) }
}
async function addAddress() {
  try { await api('/me/addresses/', { method: 'POST', body: { ...newAddr } }); Object.assign(newAddr, { label: '', recipient_name: '', phone: '', district: '', thana: '', address_line: '' }); await load(); flash('Address saved.') } catch (e) { fail(e) }
}
async function makeDefault(a: Address) { await api(`/me/addresses/${a.id}/`, { method: 'PATCH', body: { is_default: true } }); await load() }
async function removeAddress(a: Address) { if (confirm(`Delete “${a.label}”?`)) { await api(`/me/addresses/${a.id}/`, { method: 'DELETE' }); await load() } }
async function unwish(p: CardProduct) { await customer.toggleWish(p.id, p.slug); await load() }
async function logout() { await customer.logout(); await navigateTo('/') }
const delOpen = ref(false)
const delPw = ref('')
async function deleteAccount() {
  if (!delPw.value) return
  try { await api('/me/', { method: 'DELETE', body: { password: delPw.value } }); customer.me = null; await navigateTo('/') } catch (e) { fail(e) }
}
const STEPS = ['draft', 'confirmed', 'shipping', 'delivered']
const stepAt = (st: string) => STEPS.indexOf(st)
</script>

<template>
  <div>
    <StorePageBand eyebrow="My account" :title="`Hello, ${customer.me?.full_name?.split(' ')[0] ?? ''}`" />
    <section class="wrap flex flex-col gap-8 pb-16 pt-8 md:pb-24 md:pt-12 lg:flex-row lg:items-start lg:gap-14">
      <nav class="flex overflow-x-auto border-t border-ink lg:w-[240px] lg:flex-none lg:flex-col lg:overflow-visible" aria-label="Account">
        <button v-for="t in ([['orders', 'Orders & tracking', orders.length], ['wishlist', 'Wishlist', wishlist.length], ['profile', 'Profile & addresses', '']] as const)" :key="t[0]" class="flex min-h-[58px] flex-none items-center justify-between gap-3 whitespace-nowrap border-b border-border px-4 text-left text-[12.5px] font-medium uppercase tracking-[0.16em] transition-colors hover:text-accent lg:px-0" :class="tab === t[0] ? 'text-accent' : ''" :aria-current="tab === t[0] ? 'page' : undefined" @click="go(t[0])"><span>{{ t[1] }}</span><span class="text-[13px] text-muted">{{ t[2] }}</span></button>
        <button class="min-h-[58px] flex-none px-4 text-left text-[12.5px] font-medium uppercase tracking-[0.16em] text-accent lg:px-0" @click="logout">Log out</button>
      </nav>

      <div class="min-w-0 flex-1">
        <p v-if="msg" class="mb-5 border-l-[3px] border-success bg-surface px-3.5 py-2.5 text-sm" role="status">{{ msg }}</p><p v-if="err" class="mb-5 border-l-[3px] border-accent bg-surface px-3.5 py-2.5 text-sm" role="alert">{{ err }}</p>

        <div v-if="tab === 'orders'" class="flex flex-col gap-10 xl:flex-row xl:items-start">
          <div class="flex min-w-0 flex-col gap-2.5 xl:w-[380px] xl:flex-none">
            <h2 class="mb-3 font-display text-h2 md:text-h2-lg">My orders</h2>
            <div v-if="!orders.length" class="bg-cream p-8 text-center"><p class="text-body">No orders yet.</p><NuxtLink to="/" class="btn mt-4">Start shopping</NuxtLink></div>
            <button v-for="o in orders" :key="o.number" class="flex w-full flex-col gap-2 border px-[18px] py-5 text-left transition-colors" :class="sel?.number === o.number ? 'border-ink bg-surface' : 'border-border hover:border-field'" :aria-pressed="sel?.number === o.number" @click="sel = o">
              <span class="flex w-full items-baseline justify-between gap-3"><span class="font-display text-2xl">{{ o.number }}</span><span class="stage" :data-stage="o.status">{{ o.status_label }}</span></span>
              <span class="flex w-full justify-between gap-3 text-sm text-body"><span>{{ when(o.placed_at) }} · {{ o.items.reduce((n, i) => n + i.quantity, 0) }} items</span><span class="font-medium text-ink">{{ taka(o.total) }}</span></span>
            </button>
          </div>
          <div v-if="sel" :key="sel.number" class="fade-in flex min-w-0 flex-1 flex-col gap-6 border border-border bg-surface p-6 md:p-[34px]">
            <div class="flex flex-wrap items-baseline justify-between gap-2"><h2 class="font-display text-h3 md:text-h3-lg">Track {{ sel.number }}</h2><span class="stage" :data-stage="sel.status">{{ sel.status_label }}</span></div>
            <p v-if="sel.status === 'cancelled'" class="border-l-[3px] border-accent bg-cream px-5 py-[18px] text-[15px] leading-relaxed">This order was cancelled. If you already paid, we will contact you about the refund.</p>
            <ol v-else class="flex flex-col">
              <li v-for="(n, i) in STEPS" :key="n" class="flex min-h-16 gap-[18px]">
                <div class="flex flex-col items-center"><span class="mt-[3px] h-4 w-4 flex-none rounded-full border border-gold" :class="i <= stepAt(sel.status) ? 'bg-gold' : 'bg-bg'" /><span class="w-px flex-1" :class="[i < stepAt(sel.status) ? 'bg-gold' : 'bg-field', i === 3 ? 'opacity-0' : '']" /></div>
                <div class="pb-[18px]"><div class="text-[15px] uppercase tracking-[0.12em]" :class="i === stepAt(sel.status) ? 'font-semibold' : i < stepAt(sel.status) ? 'font-medium' : 'font-medium text-muted'">{{ sel.timeline.find((t) => t.status === n)?.label ?? n }}</div>
                  <div class="mt-0.5 text-sm text-muted">{{ sel.timeline.find((t) => t.status === n) ? when(sel.timeline.find((t) => t.status === n)!.at) + (sel.timeline.find((t) => t.status === n)!.detail ? ' · ' + sel.timeline.find((t) => t.status === n)!.detail : '') : 'Pending' }}</div></div>
              </li>
            </ol>
            <ul class="flex flex-col gap-2 border-t border-border pt-5 text-[15px]"><li v-for="i in sel.items" :key="i.id" class="flex justify-between gap-4"><span>{{ i.quantity }} × {{ i.product_name }} <span class="text-[13.5px] text-muted">{{ i.variant_label }}</span></span><span class="whitespace-nowrap">{{ taka(i.line_total) }}</span></li></ul>
            <div class="flex items-baseline justify-between"><span class="sf-lbl">Total</span><span class="font-display text-h3">{{ taka(sel.total) }}</span></div>
            <p class="-mt-3 text-[13.5px] text-muted">Payment: {{ sel.payment_status }}</p>
            <div class="flex flex-wrap gap-3">
              <NuxtLink :to="`/account/orders/${sel.number}/invoice`" class="btn-secondary !h-12 !px-6" target="_blank">Invoice</NuxtLink>
              <button class="btn-secondary !h-12 !px-6" data-track="reorder" @click="reorder(sel)">Reorder</button>
            </div>
            <div v-if="sel.can_cancel" class="flex flex-col gap-3 border-t border-border pt-5">
              <button v-if="!cancelling" class="h-12 border border-accent text-xs font-medium uppercase tracking-[0.16em] text-accent transition-colors hover:bg-accent hover:text-primary-contrast" @click="cancelling = true">Cancel this order</button>
              <form v-else class="flex flex-col gap-3" @submit.prevent="cancel"><div class="fld"><label class="sf-lbl" for="cr">Reason</label><input id="cr" v-model="reason" class="sf-inp" required minlength="3"></div><div class="flex gap-3"><button class="btn !h-12 flex-1">Confirm cancellation</button><button type="button" class="btn-secondary !h-12" @click="cancelling = false">Keep order</button></div></form>
              <p class="text-[13.5px] leading-relaxed text-body">You can cancel any time before the order ships.</p>
            </div>
            <div v-else-if="!['cancelled', 'returned'].includes(sel.status)" class="flex flex-col gap-3 border-t border-border pt-5"><button class="h-12 cursor-not-allowed border border-field bg-cream text-xs font-medium uppercase tracking-[0.16em] text-muted" disabled>Cancel unavailable</button><p class="text-[13.5px] text-body">Orders cannot be cancelled once they have shipped.</p></div>
          </div>
        </div>

        <div v-else-if="tab === 'wishlist'">
          <h2 class="mb-6 font-display text-h2 md:text-h2-lg">My wishlist</h2>
          <div v-if="!wishlist.length" class="bg-cream p-8 text-center"><p class="text-body">Tap the heart on any product to save it here.</p><NuxtLink to="/" class="btn mt-4">Browse products</NuxtLink></div>
          <div class="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-6 md:gap-y-9"><div v-for="p in wishlist" :key="p.id"><StoreProductCard :product="p" /><button class="mt-2 min-h-11 border-b border-ink text-xs font-medium uppercase tracking-[0.14em]" @click="unwish(p)">Remove</button></div></div>
        </div>

        <div v-else class="flex max-w-[720px] flex-col gap-12">
          <form class="grid gap-[18px] sm:grid-cols-2" @submit.prevent="saveProfile">
            <h2 class="font-display text-h2 sm:col-span-2 md:text-h2-lg">Profile</h2>
            <div class="fld"><label class="sf-lbl" for="pn">Full name</label><input id="pn" v-model="profile.full_name" class="sf-inp" required></div>
            <div class="fld"><label class="sf-lbl" for="pm">Mobile (verified)</label><input id="pm" :value="customer.me?.phone" class="sf-inp bg-cream" disabled></div>
            <div class="fld"><label class="sf-lbl" for="pe">Email (optional)</label><input id="pe" v-model="profile.email" type="email" class="sf-inp"></div>
            <div class="fld"><label class="sf-lbl" for="pb">Birthday (optional)</label><input id="pb" v-model="profile.birthday" type="date" class="sf-inp"></div>
            <div class="sm:col-span-2"><button class="btn !h-12">Save changes</button></div>
          </form>

          <div class="flex flex-col gap-5">
            <h2 class="border-b border-ink pb-3.5 font-display text-h2 md:text-h2-lg">Saved addresses <span class="text-base text-muted">({{ addresses.length }}/5)</span></h2>
            <ul class="grid gap-3 sm:grid-cols-2"><li v-for="a in addresses" :key="a.id" class="flex flex-col gap-1 border border-border bg-surface p-[18px] text-[15px] leading-relaxed"><div><b class="font-medium">{{ a.label }}</b><span v-if="a.is_default" class="ml-2 text-xs uppercase tracking-[0.14em] text-gold">Default</span></div><span class="text-body">{{ a.recipient_name }} · {{ a.phone }}<br>{{ a.address_line }}, {{ a.thana }}, {{ a.district }}</span><div class="mt-2 flex gap-4"><button v-if="!a.is_default" class="min-h-11 border-b border-ink text-xs font-medium uppercase tracking-[0.12em]" @click="makeDefault(a)">Make default</button><button class="min-h-11 text-xs font-medium uppercase tracking-[0.12em] text-accent" @click="removeAddress(a)">Delete</button></div></li></ul>
            <form v-if="addresses.length < 5" class="grid gap-[18px] bg-cream p-6 sm:grid-cols-2 md:p-7" @submit.prevent="addAddress">
              <h3 class="font-display text-2xl sm:col-span-2">Add an address</h3>
              <div class="fld"><label class="sf-lbl" for="al">Label</label><input id="al" v-model="newAddr.label" class="sf-inp" placeholder="Home, Office" required></div>
              <div class="fld"><label class="sf-lbl" for="ar">Recipient name</label><input id="ar" v-model="newAddr.recipient_name" class="sf-inp" required></div>
              <div class="fld"><label class="sf-lbl" for="ap">Phone</label><input id="ap" v-model="newAddr.phone" class="sf-inp" inputmode="tel" placeholder="01XXXXXXXXX" required></div>
              <div class="fld"><label class="sf-lbl" for="aa">Area</label><select id="aa" v-model="newAddr.area" class="sf-inp"><option value="inside_dhaka">Inside Dhaka</option><option value="outside_dhaka">Outside Dhaka</option></select></div>
              <div class="fld"><label class="sf-lbl" for="ad">District</label><input id="ad" v-model="newAddr.district" class="sf-inp" required></div>
              <div class="fld"><label class="sf-lbl" for="at">Thana / area</label><input id="at" v-model="newAddr.thana" class="sf-inp" required></div>
              <div class="fld sm:col-span-2"><label class="sf-lbl" for="af">Full address</label><input id="af" v-model="newAddr.address_line" class="sf-inp" required></div>
              <div class="sm:col-span-2"><button class="btn !h-12">Save address</button></div>
            </form>
          </div>

          <div class="flex flex-col items-start gap-3 border-t border-border pt-8"><h2 class="font-display text-h3">Delete account</h2><p class="text-[15px] text-body">Your personal details are anonymised. Order records are kept for accounting.</p>
            <button v-if="!delOpen" class="btn-secondary !h-12" @click="delOpen = true">Delete my account</button>
            <form v-else class="flex w-full max-w-[420px] flex-col gap-3" @submit.prevent="deleteAccount"><div class="fld"><label class="sf-lbl" for="dp">Enter your password to confirm</label><input id="dp" v-model="delPw" type="password" class="sf-inp" autocomplete="current-password" required></div><div class="flex gap-3"><button class="btn !h-12 flex-1">Delete permanently</button><button type="button" class="btn-secondary !h-12" @click="delOpen = false; delPw = ''">Keep account</button></div></form>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
