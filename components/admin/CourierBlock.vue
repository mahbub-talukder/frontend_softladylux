<script setup lang="ts">
// SRS v1.7 §4.18 courier block on admin order detail:
// CRR-05 Book / Retry, CRR-09 Steadfast status and flag, CRR-10 courier steps, CRR-11 Refresh,
// CRR-14 Ask Steadfast to return, CRR-15 customer delivery record. Buttons follow PRM-04.
import type { AdminOrder, Dict } from '~/types/api'

const props = defineProps<{ order: AdminOrder }>()
const emit = defineEmits<{ changed: [] }>()
const auth = useAuthStore()
const { api, errorOf, toast } = useApi()

const canManage = computed(() => auth.can('courier.manage'))
const ship = computed(() => props.order.shipment)
const booked = computed(() => !!ship.value?.is_booked)
const busy = ref(false)
const error = ref('')
const fieldErrors = ref<string[]>([])
const returning = ref(false)
const reason = ref('')

async function act(path: string, body: Dict | undefined, done: string) {
  busy.value = true; error.value = ''; fieldErrors.value = []
  try {
    await api(`/admin/courier/orders/${props.order.id}/${path}/`, { method: 'POST', body, toast: false })
    toast.success(done); returning.value = false; reason.value = ''
    emit('changed')
  } catch (e) {
    const er = errorOf(e)
    error.value = er.message
    fieldErrors.value = Object.entries(er.fields ?? {}).map(([k, v]) => `${k}: ${v.join(' ')}`)
  } finally { busy.value = false }
}
const book = () => act('book', undefined, 'Booked with Steadfast')
const refresh = () => act('refresh', undefined, 'Courier status updated')
function askReturn() {
  const r = reason.value.trim()
  if (r.length < 3 || r.length > 500) { error.value = 'Give a reason (3–500 characters).'; return }
  act('return', { reason: r }, 'Return requested from Steadfast')
}

// CRR-15: fetched only on the button press; null ratios mean "no record", never 0.
const record = ref<Dict | null>(null)
const recordError = ref('')
const checking = ref(false)
const showRecord = computed(() => ['draft', 'confirmed'].includes(props.order.status) && auth.can('orders.view'))
async function checkRecord() {
  checking.value = true; recordError.value = ''
  try { record.value = await api<Dict>(`/admin/courier/fraud-check/?phone=${encodeURIComponent(props.order.phone)}`, { toast: false }) } catch (e) {
    recordError.value = errorOf(e).message
  } finally { checking.value = false }
}
const pct = (x: unknown) => (x === null || x === undefined ? 'No record' : `${x}%`)
const when = (d: string | null) => (d ? new Date(d).toLocaleString() : '')
const steps = computed(() => props.order.courier_events ?? [])
</script>

<template>
  <section class="flex flex-col gap-2 border border-border p-4 text-[14.5px]" aria-label="Courier">
    <div class="flex items-baseline justify-between gap-2">
      <div class="cap">Courier · Steadfast</div>
      <span v-if="ship?.attention" class="border border-accent px-2 py-0.5 text-[12px] font-semibold text-accent">{{ ship.attention_label }}</span>
    </div>

    <template v-if="booked && ship">
      <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt class="text-muted">Consignment</dt><dd>{{ ship.consignment_id }}</dd>
        <dt class="text-muted">Tracking code</dt><dd>{{ ship.tracking_code || '—' }}</dd>
        <dt class="text-muted">Steadfast status</dt><dd>{{ ship.courier_status || '—' }} <span v-if="ship.status_at" class="hint">· {{ when(ship.status_at) }}</span></dd>
      </dl>
      <a v-if="ship.tracking_link" :href="ship.tracking_link" target="_blank" rel="noopener" class="self-start text-sm font-semibold text-accent underline">Open on Steadfast ↗</a>
      <p v-if="ship.attention === 'returning' || ship.attention === 'returned_to_merchant'" class="hint">Mark the order Returned when the goods arrive. That restocks the items.</p>
      <div v-if="canManage" class="flex flex-wrap gap-2">
        <button type="button" class="btn-secondary btn-spin" :disabled="busy" :aria-busy="busy" @click="refresh">Refresh status</button>
        <button v-if="order.status === 'shipping' && !returning" type="button" class="btn-secondary" :disabled="busy" @click="returning = true">Ask Steadfast to return</button>
      </div>
      <div v-if="returning" class="flex flex-col gap-2">
        <label for="courier-return-reason" class="text-sm font-semibold">Reason for the return</label>
        <textarea id="courier-return-reason" v-model="reason" class="inp" maxlength="500" rows="2" />
        <div class="flex gap-2">
          <button type="button" class="btn btn-spin" :disabled="busy" :aria-busy="busy" @click="askReturn">Send return request</button>
          <button type="button" class="btn-secondary" @click="returning = false">Cancel</button>
        </div>
      </div>
      <details v-if="steps.length" class="text-sm">
        <summary class="cursor-pointer font-semibold">Courier steps ({{ steps.length }})</summary>
        <ul class="mt-1">
          <li v-for="(s, i) in steps" :key="i" class="border-b border-border py-1"><span class="hint">{{ when(s.occurred_at) }}</span><br>{{ s.message || s.status }}</li>
        </ul>
      </details>
    </template>

    <template v-else>
      <p v-if="ship?.attention === 'booking_failed'" class="err" role="alert">Booking failed: {{ ship.last_error }}</p>
      <p v-else-if="order.status === 'confirmed' && ship?.booking_in_progress" class="hint" role="status">Booking with Steadfast…</p>
      <p v-else-if="order.status === 'confirmed'" class="hint">Not booked yet. Use <b class="font-medium">Move to Shipping</b> to book it with Steadfast (confirmed orders are booked automatically when auto-booking is on).</p>
      <p v-else-if="order.status === 'draft'" class="hint">Booked when the order is confirmed.</p>
      <p v-else class="hint">Not booked through Steadfast<template v-if="order.courier"> (shipped by hand: {{ order.courier }} {{ order.tracking_ref }})</template>.</p>
      <!-- ORD-14 (v1.11): Move to Shipping in the order actions books with Steadfast; this stays for orders it cannot cover -->
      <button v-if="canManage && order.status === 'confirmed' && !(order.steadfast_ready && auth.can('orders.manage')) && !ship?.booking_in_progress" type="button" class="btn btn-spin self-start" :disabled="busy" :aria-busy="busy" @click="book">{{ ship?.attention === 'booking_failed' ? 'Retry booking' : 'Book with Steadfast' }}</button>
    </template>

    <p v-if="error" class="err" role="alert">{{ error }}</p>
    <ul v-if="fieldErrors.length" class="err text-sm"><li v-for="m in fieldErrors" :key="m">{{ m }}</li></ul>

    <div v-if="showRecord" class="mt-1 border-t border-border pt-2">
      <button type="button" class="btn-secondary btn-spin" :disabled="checking" :aria-busy="checking" @click="checkRecord">Check delivery record</button>
      <p class="hint mt-1">This customer's delivery history across all Steadfast merchants. A signal only, not a verdict.</p>
      <dl v-if="record" class="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt class="text-muted">Delivered</dt><dd>{{ pct(record.delivery_ratio) }}<span v-if="record.delivered_count != null" class="hint"> ({{ record.delivered_count }})</span></dd>
        <dt class="text-muted">Cancelled</dt><dd>{{ pct(record.cancellation_ratio) }}<span v-if="record.cancelled_count != null" class="hint"> ({{ record.cancelled_count }})</span></dd>
        <dt class="text-muted">Parcels received</dt><dd>{{ record.volume_range ?? (record.volume_band === 'none' || !record.volume_band ? 'No record' : record.volume_band) }}</dd>
        <dt class="text-muted">Merchant reports</dt><dd>{{ record.total_reports ?? 0 }}<span v-if="record.fraud_categories && Object.keys(record.fraud_categories).length" class="hint"> · {{ Object.entries(record.fraud_categories).map(([k, n]) => `${String(k).replace(/_/g, ' ')} ×${n}`).join(', ') }}</span></dd>
      </dl>
      <p v-if="recordError" class="err" role="alert">{{ recordError }}</p>
    </div>
  </section>
</template>
