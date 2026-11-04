<script setup lang="ts">
// Design: AdminOrders board (detail panel). SRS ORD-02..06, ORD-08..11, PAY-03/05/06. Buttons only
// show for the permission the user holds (PRM-04); the server stays authoritative (PRM-03).
import type { AdminOrder } from '~/types/api'

const props = defineProps<{ id: number }>()
const emit = defineEmits<{ changed: [] }>()
const auth = useAuthStore()
const { api, errorOf } = useApi()
const order = ref<AdminOrder | null>(null)
const error = ref('')
const busy = ref(false)
const mode = ref<'' | 'ship' | 'cancel' | 'return' | 'reject' | 'trx' | 'edit' | 'note'>('')
const f = reactive({ reason: '', courier: '', tracking: '', trx_id: '', sender_number: '', note: '', phone: '', address_line: '', thana: '', district: '', name: '' })

const canManage = computed(() => auth.can('orders.manage'))
const canVerify = computed(() => auth.can('payments.verify'))
const STAGES = ['draft', 'confirmed', 'shipping', 'delivered']
const NEXT: Record<string, { to: string; label: string } | undefined> = {
  draft: { to: 'confirmed', label: 'Confirm order' }, confirmed: { to: 'shipping', label: 'Move to Shipping' }, shipping: { to: 'delivered', label: 'Mark delivered' }
}
const next = computed(() => (order.value ? NEXT[order.value.status] : undefined))
const needsVerify = computed(() => !!order.value && ['bkash', 'nagad'].includes(order.value.payment_method) && order.value.payment?.status !== 'verified' && order.value.status === 'draft')

async function load() {
  order.value = await api<AdminOrder>(`/admin/orders/${props.id}/`)
  mode.value = ''; error.value = ''
  Object.assign(f, { reason: '', courier: '', tracking: '', trx_id: order.value.payment?.trx_id ?? '', sender_number: order.value.payment?.sender_number ?? '', note: '', phone: order.value.phone, address_line: order.value.address_line, thana: order.value.thana, district: order.value.district, name: order.value.name })
}
watch(() => props.id, load, { immediate: true })

async function run(fn: () => Promise<unknown>) {
  busy.value = true; error.value = ''
  try { await fn(); await load(); emit('changed') } catch (e) {
    const er = errorOf(e); error.value = Object.values(er.fields).flat().filter((x) => typeof x === 'string').join(' ') || er.message
  } finally { busy.value = false }
}
const transition = (to: string, extra: Record<string, string> = {}) => run(() => api(`/admin/orders/${props.id}/transition/`, { method: 'POST', body: { to, ...extra } }))
const verify = () => run(() => api(`/admin/orders/${props.id}/payment/verify/`, { method: 'POST' }))
const reject = () => run(() => api(`/admin/orders/${props.id}/payment/reject/`, { method: 'POST', body: { reason: f.reason } }))
const editTrx = () => run(() => api(`/admin/orders/${props.id}/payment/`, { method: 'PATCH', body: { trx_id: f.trx_id, sender_number: f.sender_number } }))
const saveEdit = () => run(() => api(`/admin/orders/${props.id}/`, { method: 'PATCH', body: { name: f.name, phone: f.phone, district: f.district, thana: f.thana, address_line: f.address_line } }))
const addNote = () => run(() => api(`/admin/orders/${props.id}/notes/`, { method: 'POST', body: { note: f.note } }))
function advance() {
  if (!next.value) return
  if (next.value.to === 'shipping') { mode.value = 'ship'; return }
  transition(next.value.to)
}
const when = (d: string | null) => (d ? new Date(d).toLocaleString() : '')
</script>

<template>
  <aside v-if="order" class="card" aria-label="Order detail">
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-2xl">{{ order.number }}</h2><span class="border border-border px-2 py-1 text-xs uppercase tracking-widest">{{ order.status_label }}</span>
    </div>
    <p v-if="order.is_stale" class="text-sm text-accent" role="status">Draft older than the stale limit: follow up or cancel.</p>
    <ol class="flex gap-1 text-xs">
      <li v-for="st in STAGES" :key="st" class="flex-1 border px-1 py-1 text-center uppercase" :class="STAGES.indexOf(st) <= STAGES.indexOf(order.status) ? 'border-primary bg-primary-soft' : 'border-border'">{{ st }}</li>
    </ol>
    <section>
      <div class="cap">Customer</div>
      <p>{{ order.name }} · {{ order.phone }}<span v-if="order.user_name" class="hint"> (account)</span></p>
      <p class="hint">{{ order.address_line }}, {{ order.thana }}, {{ order.district }} · {{ order.area === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka' }}</p>
      <p v-if="order.note" class="hint">Note: {{ order.note }}</p>
      <button v-if="canManage && ['draft', 'confirmed'].includes(order.status)" class="hint underline" @click="mode = mode === 'edit' ? '' : 'edit'">Edit address / phone</button>
      <form v-if="mode === 'edit'" class="mt-2 flex flex-col gap-2" @submit.prevent="saveEdit">
        <input v-model="f.name" class="inp" aria-label="Name"><input v-model="f.phone" class="inp" aria-label="Phone"><input v-model="f.address_line" class="inp" aria-label="Address"><div class="grid grid-cols-2 gap-2"><input v-model="f.thana" class="inp" aria-label="Thana"><input v-model="f.district" class="inp" aria-label="District"></div>
        <button class="btn-secondary">Save changes</button>
      </form>
    </section>
    <section>
      <div class="cap">Items</div>
      <ul class="text-sm"><li v-for="i in order.items" :key="i.id" class="flex justify-between gap-2 border-b border-border py-1"><span>{{ i.product_name }} <span class="hint">{{ i.variant_label }}</span><br><span class="hint">{{ i.sku }} × {{ i.quantity }}</span></span><span>{{ taka(i.line_total) }}</span></li></ul>
      <dl class="mt-2 text-sm">
        <div class="flex justify-between"><dt>Subtotal</dt><dd>{{ taka(order.subtotal) }}</dd></div>
        <div v-if="Number(order.coupon_discount)" class="flex justify-between"><dt>Coupon {{ order.coupon_code }}</dt><dd>− {{ taka(order.coupon_discount) }}</dd></div>
        <div class="flex justify-between"><dt>Delivery</dt><dd>{{ taka(order.delivery_fee) }}</dd></div>
        <div class="flex justify-between font-medium"><dt>Total</dt><dd>{{ taka(order.total) }}</dd></div>
      </dl>
    </section>
    <section v-if="order.payment" class="border border-border bg-cream p-3 text-sm">
      <div class="cap">Payment · {{ order.payment.method === 'cod' ? 'Cash on delivery' : order.payment.method }} · {{ order.payment.status }}</div>
      <template v-if="order.payment.method !== 'cod'">
        <p>Transaction ID <b>{{ order.payment.trx_id }}</b> · sender {{ order.payment.sender_number }}</p>
        <p>Paid <b>{{ taka(order.payment.amount) }}</b> · order total <b>{{ taka(order.total) }}</b>. Verify the amount in the merchant app before confirming.</p>
        <p v-if="order.payment.reject_reason" class="text-accent">Rejected: {{ order.payment.reject_reason }}</p>
        <p v-if="order.payment.verified_by_name" class="hint">By {{ order.payment.verified_by_name }} · {{ when(order.payment.verified_at) }}</p>
      </template>
      <p v-else class="hint">Collected by the courier at delivery.</p>
      <div v-if="canVerify && order.payment.method !== 'cod' && order.status === 'draft'" class="mt-2 flex flex-wrap gap-2">
        <button v-if="order.payment.status !== 'verified'" class="btn !px-4" :disabled="busy" data-track="payment_verify" @click="verify">Verify payment</button>
        <button v-if="order.payment.status !== 'rejected'" class="btn-secondary !px-4" @click="mode = 'reject'">Reject</button>
        <button class="btn-secondary !px-4" @click="mode = mode === 'trx' ? '' : 'trx'">Correct TrxID</button>
      </div>
      <form v-if="mode === 'reject'" class="mt-2 flex flex-col gap-2" @submit.prevent="reject"><label for="rj">Rejection reason</label><input id="rj" v-model="f.reason" class="inp" required><button class="btn-secondary">Reject payment</button></form>
      <form v-if="mode === 'trx'" class="mt-2 flex flex-col gap-2" @submit.prevent="editTrx"><input v-model="f.trx_id" class="inp uppercase" aria-label="Transaction ID"><input v-model="f.sender_number" class="inp" aria-label="Sender number"><button class="btn-secondary">Save correction</button></form>
    </section>
    <div class="flex flex-wrap gap-2">
      <NuxtLink :to="`/admin/orders/${order.id}/invoice`" class="btn-secondary !px-4" target="_blank">Print invoice</NuxtLink>
      <NuxtLink :to="`/admin/orders/${order.id}/slip`" class="btn-secondary !px-4" target="_blank">Delivery slip</NuxtLink>
    </div>
    <div v-if="canManage" class="flex flex-col gap-2">
      <button v-if="next" class="btn" :disabled="busy || needsVerify" data-track="order_advance" @click="advance">{{ next.label }}</button>
      <p v-if="needsVerify" class="hint">Verify the payment first (bKash/Nagad orders can’t be confirmed until it is verified).</p>
      <form v-if="mode === 'ship'" class="flex flex-col gap-2" @submit.prevent="transition('shipping', { courier: f.courier, tracking: f.tracking })"><input v-model="f.courier" class="inp" placeholder="Courier name (e.g. Steadfast)" aria-label="Courier"><input v-model="f.tracking" class="inp" placeholder="Tracking number" aria-label="Tracking number"><button class="btn">Move to Shipping</button></form>
      <button v-if="['draft', 'confirmed'].includes(order.status)" class="btn-secondary" @click="mode = 'cancel'">Cancel order</button>
      <button v-if="['shipping', 'delivered'].includes(order.status)" class="btn-secondary" @click="mode = 'return'">Mark whole order returned</button>
      <form v-if="mode === 'cancel' || mode === 'return'" class="flex flex-col gap-2" @submit.prevent="transition(mode === 'cancel' ? 'cancelled' : 'returned', { reason: f.reason })">
        <label for="why">{{ mode === 'cancel' ? 'Cancellation' : 'Return' }} reason (required)</label><input id="why" v-model="f.reason" class="inp" required minlength="3" maxlength="300">
        <button class="btn-secondary">{{ mode === 'cancel' ? 'Confirm cancellation' : 'Confirm return' }}</button>
      </form>
      <p v-if="['cancelled', 'returned'].includes(order.status)" class="hint">This order is closed.</p>
    </div>
    <p v-if="error" class="err" role="alert">{{ error }}</p>
    <section>
      <div class="cap">Timeline</div>
      <ol class="mt-1 flex flex-col gap-2 text-sm">
        <li v-for="l in order.logs" :key="l.id" :class="l.internal ? 'text-muted' : ''"><b v-if="!l.internal">{{ l.from_status ? `${l.from_status} → ` : '' }}{{ l.to_status }}</b><b v-else>note</b> · {{ when(l.created_at) }}<span v-if="l.user"> · {{ l.user }}</span><br>{{ l.note }}</li>
      </ol>
      <form v-if="canManage" class="mt-2 flex gap-2" @submit.prevent="addNote"><input v-model="f.note" class="inp" placeholder="Add an internal note" aria-label="Internal note"><button class="btn-secondary !px-4">Add</button></form>
    </section>
  </aside>
  <p v-else class="hint">Loading…</p>
</template>
