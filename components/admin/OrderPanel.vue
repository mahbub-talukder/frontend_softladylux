<script setup lang="ts">
// Design: AdminOrders board (detail panel). SRS ORD-02..06, ORD-08..11, PAY-03/05/06. Buttons only
// show for the permission the user holds (PRM-04); the server stays authoritative (PRM-03).
import type { AdminOrder } from '~/types/api'

const props = defineProps<{ id: number }>()
const emit = defineEmits<{ changed: [] }>()
const auth = useAuthStore()
const { api, errorOf, toast } = useApi()
const order = ref<AdminOrder | null>(null)
const error = ref('')
const busy = ref(false)
const mode = ref<'' | 'ship' | 'cancel' | 'return' | 'reject' | 'trx' | 'edit' | 'note'>('')
const f = reactive({ reason: '', courier: '', tracking: '', trx_id: '', sender_number: '', note: '', phone: '', address_line: '', thana: '', district: '', name: '' })

// UI-06 / §10: reasons 3-300 characters, TrxID 8-12 letters/digits, BD mobile numbers, and the order-field lengths the
// database allows (name 150, thana/district 80, address 300), so an over-long value is caught here and not as a server error.
const { required, between, maxLength, pattern, phoneBD } = rules
const v = useFormValidation(() => f, {
  reason: [required('Enter a reason.'), between(3, 300, 'Use 3-300 characters.')],
  courier: [maxLength(80)],
  tracking: [maxLength(80)],
  trx_id: [required('Enter the transaction ID.'), pattern(/^[A-Za-z0-9]{8,12}$/, 'Use 8-12 letters or digits.')],
  sender_number: [required('Enter the sender number.'), phoneBD()],
  note: [required('Write a note first.'), between(1, 500, 'Use up to 500 characters.')],
  name: [required('Enter the customer name.'), maxLength(150)],
  phone: [required('Enter a phone number.'), phoneBD()],
  address_line: [required('Enter the address.'), maxLength(300)],
  thana: [required('Enter the thana.'), maxLength(80)],
  district: [required('Enter the district.'), maxLength(80)]
})
/** Validate just the fields of one small form; returns true when all are fine. */
function ok(keys: string[]): boolean {
  let good = true
  const bad: string[] = []
  for (const k of keys) { v.touched[k] = true; if (!v.validateField(k)) { good = false; bad.push(v.client[k]) } }
  if (!good) toast.error('Please fix the highlighted fields', bad.slice(0, 3))
  return good
}

const canManage = computed(() => auth.can('orders.manage'))
const canVerify = computed(() => auth.can('payments.verify'))
const STAGES = ['draft', 'confirmed', 'shipping', 'delivered']
const NEXT: Record<string, { to: string; label: string } | undefined> = {
  draft: { to: 'confirmed', label: 'Confirm order' }, confirmed: { to: 'shipping', label: 'Move to Shipping' }, shipping: { to: 'delivered', label: 'Mark delivered' }
}
const next = computed(() => (order.value ? NEXT[order.value.status] : undefined))
const needsVerify = computed(() => !!order.value && ['bkash', 'nagad'].includes(order.value.payment_method) && order.value.payment?.status !== 'verified' && order.value.status === 'draft')

const loadFailed = ref(false)
async function load() {
  loadFailed.value = false
  try { order.value = await api<AdminOrder>(`/admin/orders/${props.id}/`) } catch { order.value = null; loadFailed.value = true; return }
  mode.value = ''; error.value = ''; v.reset()
  if (!order.value) return
  Object.assign(f, { reason: '', courier: '', tracking: '', trx_id: order.value.payment?.trx_id ?? '', sender_number: order.value.payment?.sender_number ?? '', note: '', phone: order.value.phone, address_line: order.value.address_line, thana: order.value.thana, district: order.value.district, name: order.value.name })
}
watch(() => props.id, load, { immediate: true })

async function run(fn: () => Promise<unknown>, done = 'Order updated') {
  busy.value = true; error.value = ''
  try { await fn(); toast.success(done); await load(); emit('changed') } catch (e) {
    const er = errorOf(e); error.value = er.flat.join(' ')
  } finally { busy.value = false }
}
const DONE: Record<string, string> = { confirmed: 'Order confirmed', shipping: 'Moved to shipping', delivered: 'Marked delivered', cancelled: 'Order cancelled', returned: 'Order marked returned' }
const transition = (to: string, extra: Record<string, string> = {}) => run(() => api(`/admin/orders/${props.id}/transition/`, { method: 'POST', body: { to, ...extra }, toast: false }), DONE[to] ?? 'Order updated')
const verify = () => run(() => api(`/admin/orders/${props.id}/payment/verify/`, { method: 'POST', toast: false }), 'Payment verified')
const reject = () => ok(['reason']) && run(() => api(`/admin/orders/${props.id}/payment/reject/`, { method: 'POST', body: { reason: f.reason.trim() }, toast: false }), 'Payment rejected')
const editTrx = () => ok(['trx_id', 'sender_number']) && run(() => api(`/admin/orders/${props.id}/payment/`, { method: 'PATCH', body: { trx_id: f.trx_id.trim().toUpperCase(), sender_number: f.sender_number.trim() }, toast: false }), 'Payment details corrected')
const saveEdit = () => ok(['name', 'phone', 'address_line', 'thana', 'district']) && run(() => api(`/admin/orders/${props.id}/`, { method: 'PATCH', body: { name: f.name.trim(), phone: f.phone.trim(), district: f.district.trim(), thana: f.thana.trim(), address_line: f.address_line.trim() }, toast: false }), 'Customer details updated')
const addNote = () => ok(['note']) && run(() => api(`/admin/orders/${props.id}/notes/`, { method: 'POST', body: { note: f.note.trim() }, toast: false }), 'Note added')
function advance() {
  if (!next.value) return
  if (next.value.to === 'shipping') { mode.value = 'ship'; return }
  transition(next.value.to)
}
const when = (d: string | null) => (d ? new Date(d).toLocaleString() : '')
</script>

<template>
  <aside v-if="order" class="card fade-in !gap-[22px] !p-6 md:!p-7 xl:sticky xl:top-6" aria-label="Order detail">
    <div class="flex items-baseline justify-between gap-2">
      <h2 class="font-display !text-[28px]">{{ order.number }}</h2><span class="stage" :data-stage="order.status">{{ order.status_label }}</span>
    </div>
    <p v-if="order.is_stale" class="text-sm text-accent" role="status">Draft older than the stale limit: follow up or cancel.</p>
    <ol class="flex gap-0.5">
      <li v-for="st in STAGES" :key="st" class="flex flex-1 flex-col gap-2"><span class="h-[3px]" :class="STAGES.indexOf(st) <= STAGES.indexOf(order.status) ? 'bg-gold' : 'bg-field'" /><span class="text-[11px] uppercase tracking-[0.1em]" :class="st === order.status ? 'font-semibold' : STAGES.indexOf(st) < STAGES.indexOf(order.status) ? '' : 'text-muted'">{{ st }}</span></li>
    </ol>
    <section>
      <div class="cap">Customer</div>
      <p>{{ order.name }} · {{ order.phone }}<span v-if="order.user_name" class="hint"> (account)</span></p>
      <p class="hint">{{ order.address_line }}, {{ order.thana }}, {{ order.district }} · {{ order.area === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka' }}</p>
      <p v-if="order.note" class="hint">Note: {{ order.note }}</p>
      <button v-if="canManage && ['draft', 'confirmed'].includes(order.status)" class="hint underline" @click="mode = mode === 'edit' ? '' : 'edit'">Edit address / phone</button>
      <form v-if="mode === 'edit'" class="mt-2 flex flex-col gap-2" novalidate @submit.prevent="saveEdit">
        <input v-model="f.name" class="inp" maxlength="150" aria-label="Name" :aria-invalid="!!v.errorFor('name')" @input="v.onInput('name')" @blur="v.touch('name')"><p v-if="v.errorFor('name')" class="err" role="alert">{{ v.errorFor('name') }}</p>
        <input v-model="f.phone" class="inp" aria-label="Phone" :aria-invalid="!!v.errorFor('phone')" @input="v.onInput('phone')" @blur="v.touch('phone')"><p v-if="v.errorFor('phone')" class="err" role="alert">{{ v.errorFor('phone') }}</p>
        <input v-model="f.address_line" class="inp" maxlength="300" aria-label="Address" :aria-invalid="!!v.errorFor('address_line')" @input="v.onInput('address_line')" @blur="v.touch('address_line')"><p v-if="v.errorFor('address_line')" class="err" role="alert">{{ v.errorFor('address_line') }}</p>
        <div class="grid grid-cols-2 gap-2"><input v-model="f.thana" class="inp" maxlength="80" aria-label="Thana" :aria-invalid="!!v.errorFor('thana')" @input="v.onInput('thana')" @blur="v.touch('thana')"><input v-model="f.district" class="inp" maxlength="80" aria-label="District" :aria-invalid="!!v.errorFor('district')" @input="v.onInput('district')" @blur="v.touch('district')"></div>
        <p v-if="v.errorFor('thana') || v.errorFor('district')" class="err" role="alert">{{ v.errorFor('thana') || v.errorFor('district') }}</p>
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
    <section v-if="order.payment" class="flex flex-col gap-1.5 bg-admin-bg p-4 text-[14.5px]">
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
      <form v-if="mode === 'reject'" class="mt-2 flex flex-col gap-2" novalidate @submit.prevent="reject"><label for="rj">Rejection reason <span class="text-accent" aria-hidden="true">*</span></label><input id="rj" v-model="f.reason" class="inp" maxlength="300" :aria-invalid="!!v.errorFor('reason')" @input="v.onInput('reason')" @blur="v.touch('reason')"><p v-if="v.errorFor('reason')" class="err" role="alert">{{ v.errorFor('reason') }}</p><button class="btn-secondary">Reject payment</button></form>
      <form v-if="mode === 'trx'" class="mt-2 flex flex-col gap-2" novalidate @submit.prevent="editTrx"><input v-model="f.trx_id" class="inp uppercase" maxlength="12" aria-label="Transaction ID" :aria-invalid="!!v.errorFor('trx_id')" @input="v.onInput('trx_id')" @blur="v.touch('trx_id')"><p v-if="v.errorFor('trx_id')" class="err" role="alert">{{ v.errorFor('trx_id') }}</p><input v-model="f.sender_number" class="inp" aria-label="Sender number" :aria-invalid="!!v.errorFor('sender_number')" @input="v.onInput('sender_number')" @blur="v.touch('sender_number')"><p v-if="v.errorFor('sender_number')" class="err" role="alert">{{ v.errorFor('sender_number') }}</p><button class="btn-secondary">Save correction</button></form>
    </section>
    <div class="grid grid-cols-2 gap-2.5">
      <NuxtLink :to="`/admin/orders/${order.id}/invoice`" class="btn-secondary !px-4" target="_blank">Print invoice</NuxtLink>
      <NuxtLink :to="`/admin/orders/${order.id}/slip`" class="btn-secondary !px-4" target="_blank">Delivery slip</NuxtLink>
    </div>
    <div v-if="canManage" class="flex flex-col gap-2">
      <button v-if="next" class="btn" :disabled="busy || needsVerify" data-track="order_advance" @click="advance">{{ next.label }}</button>
      <p v-if="needsVerify" class="hint">Verify the payment first (bKash/Nagad orders can’t be confirmed until it is verified).</p>
      <form v-if="mode === 'ship'" class="flex flex-col gap-2" novalidate @submit.prevent="ok(['courier', 'tracking']) && transition('shipping', { courier: f.courier.trim(), tracking: f.tracking.trim() })"><input v-model="f.courier" class="inp" placeholder="Courier name (e.g. Steadfast)" aria-label="Courier"><input v-model="f.tracking" class="inp" placeholder="Tracking number" aria-label="Tracking number"><button class="btn">Move to Shipping</button></form>
      <button v-if="['draft', 'confirmed'].includes(order.status)" class="btn-secondary !border-accent !text-accent hover:!bg-accent hover:!text-primary-contrast" @click="mode = 'cancel'">Cancel order</button>
      <button v-if="['shipping', 'delivered'].includes(order.status)" class="btn-secondary" @click="mode = 'return'">Mark whole order returned</button>
      <form v-if="mode === 'cancel' || mode === 'return'" class="flex flex-col gap-2" novalidate @submit.prevent="ok(['reason']) && transition(mode === 'cancel' ? 'cancelled' : 'returned', { reason: f.reason.trim() })">
        <label for="why">{{ mode === 'cancel' ? 'Cancellation' : 'Return' }} reason <span class="text-accent" aria-hidden="true">*</span><span class="sr-only"> (required)</span></label><input id="why" v-model="f.reason" class="inp" maxlength="300" :aria-invalid="!!v.errorFor('reason')" @input="v.onInput('reason')" @blur="v.touch('reason')"><p v-if="v.errorFor('reason')" class="err" role="alert">{{ v.errorFor('reason') }}</p>
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
      <form v-if="canManage" class="mt-2 flex flex-wrap gap-2" novalidate @submit.prevent="addNote"><input v-model="f.note" class="inp min-w-0 flex-1" maxlength="500" placeholder="Add an internal note" aria-label="Internal note" :aria-invalid="!!v.errorFor('note')" @input="v.onInput('note')" @blur="v.touch('note')"><button class="btn-secondary !px-4">Add</button><p v-if="v.errorFor('note')" class="err w-full" role="alert">{{ v.errorFor('note') }}</p></form>
    </section>
  </aside>
  <p v-else-if="loadFailed" class="card text-sm" role="alert">This order could not be loaded. It may have been removed. <button class="underline" @click="load">Try again</button></p>
  <div v-else class="skeleton h-72" aria-busy="true" />
</template>
