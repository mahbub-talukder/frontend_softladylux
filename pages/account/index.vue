<script setup lang="ts">
// Design: My account board. SRS ACC-04..ACC-08: orders with a tracking timeline (customer-safe
// wording), cancel while Draft/Confirmed, reorder, printable invoice; wishlist; profile + up to
// 5 saved addresses (SRS wins over the board's single "Default address"); account deletion.
import type { Address, CardProduct, CustomerOrder, Paged } from '~/types/api'
import type { CartLine } from '~/utils/cart'

useSeoMeta({ title: 'My account', robots: 'noindex' })
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
async function deleteAccount() {
  const pw = prompt('Delete your account? Your personal details are removed; order records are kept. Enter your password to confirm.')
  if (!pw) return
  try { await api('/me/', { method: 'DELETE', body: { password: pw } }); customer.me = null; await navigateTo('/') } catch (e) { fail(e) }
}
</script>

<template>
  <div>
    <div class="cap">My account</div><h1 class="text-4xl">Hello, {{ customer.me?.full_name?.split(' ')[0] }}</h1>
    <div class="mt-6 grid gap-8 lg:grid-cols-[220px_1fr]">
      <nav class="flex gap-2 lg:flex-col" aria-label="Account">
        <button v-for="t in ([['orders', `Orders ${orders.length}`], ['wishlist', `Wishlist ${wishlist.length}`], ['profile', 'Profile & addresses']] as const)" :key="t[0]" class="min-h-touch border px-3 text-left text-sm" :class="tab === t[0] ? 'border-primary bg-primary-soft' : 'border-border'" :aria-pressed="tab === t[0]" @click="go(t[0])">{{ t[1] }}</button>
        <button class="min-h-touch px-3 text-left text-sm underline" @click="logout">Log out</button>
      </nav>

      <div>
        <p v-if="msg" class="hint mb-3" role="status">{{ msg }}</p><p v-if="err" class="err mb-3" role="alert">{{ err }}</p>

        <div v-if="tab === 'orders'" class="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
          <div class="flex flex-col gap-2">
            <h2 class="text-2xl">My orders</h2>
            <p v-if="!orders.length" class="hint">No orders yet. <NuxtLink to="/" class="underline">Start shopping</NuxtLink></p>
            <button v-for="o in orders" :key="o.number" class="flex flex-col border p-3 text-left" :class="sel?.number === o.number ? 'border-primary bg-primary-soft' : 'border-border'" @click="sel = o">
              <span class="flex justify-between"><b>{{ o.number }}</b><span class="text-xs uppercase tracking-widest">{{ o.status_label }}</span></span>
              <span class="hint">{{ when(o.placed_at) }} · {{ o.items.reduce((n, i) => n + i.quantity, 0) }} items · {{ taka(o.total) }}</span>
            </button>
          </div>
          <div v-if="sel" class="card">
            <div class="flex items-center justify-between"><h2 class="text-2xl">Track {{ sel.number }}</h2><span class="border border-border px-2 py-1 text-xs uppercase tracking-widest">{{ sel.status_label }}</span></div>
            <p v-if="sel.status === 'cancelled'" class="text-sm">This order was cancelled. If you already paid, we will contact you about the refund.</p>
            <ol class="flex flex-col gap-3"><li v-for="t in sel.timeline" :key="t.at + t.status" class="flex gap-3"><span class="mt-1 h-3 w-3 shrink-0 bg-primary" /><span><b>{{ t.label }}</b><br><span class="hint">{{ when(t.at) }}<template v-if="t.detail"> · {{ t.detail }}</template></span></span></li></ol>
            <ul class="border-t border-border pt-3 text-sm"><li v-for="i in sel.items" :key="i.id" class="flex justify-between"><span>{{ i.quantity }} × {{ i.product_name }} <span class="hint">{{ i.variant_label }}</span></span><span>{{ taka(i.line_total) }}</span></li></ul>
            <div class="flex justify-between font-medium"><span>Total</span><span>{{ taka(sel.total) }}</span></div>
            <p class="hint">Payment: {{ sel.payment_status }}</p>
            <div class="flex flex-wrap gap-2">
              <NuxtLink :to="`/account/orders/${sel.number}/invoice`" class="btn-secondary !px-4" target="_blank">Invoice</NuxtLink>
              <button class="btn-secondary !px-4" data-track="reorder" @click="reorder(sel)">Reorder</button>
            </div>
            <template v-if="sel.can_cancel">
              <button v-if="!cancelling" class="btn-secondary" @click="cancelling = true">Cancel this order</button>
              <form v-else class="flex flex-col gap-2" @submit.prevent="cancel"><label for="cr">Reason</label><input id="cr" v-model="reason" class="inp" required minlength="3"><button class="btn-secondary">Confirm cancellation</button></form>
              <p class="hint">You can cancel any time before the order ships.</p>
            </template>
            <template v-else-if="!['cancelled', 'returned'].includes(sel.status)"><button class="btn-secondary" disabled>Cancel unavailable</button><p class="hint">Orders cannot be cancelled once they have shipped.</p></template>
          </div>
        </div>

        <div v-else-if="tab === 'wishlist'">
          <h2 class="mb-4 text-2xl">My wishlist</h2>
          <p v-if="!wishlist.length" class="hint">Tap the heart on any product to save it here.</p>
          <div class="grid grid-cols-2 gap-4 md:grid-cols-3"><div v-for="p in wishlist" :key="p.id"><StoreProductCard :product="p" /><button class="hint mt-1 underline" @click="unwish(p)">Remove</button></div></div>
        </div>

        <div v-else class="flex flex-col gap-6">
          <form class="card max-w-xl" @submit.prevent="saveProfile">
            <h2 class="text-2xl">Profile</h2>
            <div class="fld"><label for="pn">Full name</label><input id="pn" v-model="profile.full_name" class="inp" required></div>
            <div class="fld"><label for="pm">Mobile (verified)</label><input id="pm" :value="customer.me?.phone" class="inp" disabled></div>
            <div class="fld"><label for="pe">Email (optional)</label><input id="pe" v-model="profile.email" type="email" class="inp"></div>
            <div class="fld"><label for="pb">Birthday (optional)</label><input id="pb" v-model="profile.birthday" type="date" class="inp"></div>
            <button class="btn">Save changes</button>
          </form>
          <div class="card max-w-xl">
            <h2 class="text-2xl">Saved addresses <span class="hint">({{ addresses.length }}/5)</span></h2>
            <ul class="flex flex-col gap-2"><li v-for="a in addresses" :key="a.id" class="border border-border p-3 text-sm"><b>{{ a.label }}</b><span v-if="a.is_default" class="hint"> · default</span><br>{{ a.recipient_name }} · {{ a.phone }}<br>{{ a.address_line }}, {{ a.thana }}, {{ a.district }}<div class="mt-1 flex gap-3"><button v-if="!a.is_default" class="underline" @click="makeDefault(a)">Make default</button><button class="underline" @click="removeAddress(a)">Delete</button></div></li></ul>
            <form v-if="addresses.length < 5" class="flex flex-col gap-3" @submit.prevent="addAddress">
              <h3 class="text-xl">Add an address</h3>
              <input v-model="newAddr.label" class="inp" placeholder="Label (Home, Office)" aria-label="Label" required><input v-model="newAddr.recipient_name" class="inp" placeholder="Recipient name" aria-label="Recipient name" required><input v-model="newAddr.phone" class="inp" placeholder="Phone 01XXXXXXXXX" aria-label="Phone" required>
              <select v-model="newAddr.area" class="inp" aria-label="Area"><option value="inside_dhaka">Inside Dhaka</option><option value="outside_dhaka">Outside Dhaka</option></select>
              <div class="grid grid-cols-2 gap-3"><input v-model="newAddr.district" class="inp" placeholder="District" aria-label="District" required><input v-model="newAddr.thana" class="inp" placeholder="Thana / area" aria-label="Thana" required></div>
              <input v-model="newAddr.address_line" class="inp" placeholder="Full address" aria-label="Address" required>
              <button class="btn-secondary self-start">Save address</button>
            </form>
          </div>
          <div class="card max-w-xl"><h2 class="text-2xl">Delete account</h2><p class="hint">Your personal details are anonymised. Order records are kept for accounting.</p><button class="btn-secondary self-start" @click="deleteAccount">Delete my account</button></div>
        </div>
      </div>
    </div>
  </div>
</template>
