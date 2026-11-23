<script setup lang="ts">
// SRS v1.11 ADM-14 / NTF-07: read-only SMS log. Newest first, filters (status, source, date range,
// number), pagination. Phones get stacked cards, wider screens a table; a row opens the full message.
import type { Paged, SmsLogRow, SmsStatus } from '~/types/api'

definePageMeta({ layout: 'admin', permission: 'sms_log.view' })
const { api } = useApi()

const SOURCES: [string, string][] = [['', 'All sources'], ['otp_register', 'Registration OTP'], ['otp_reset', 'Password reset OTP'], ['otp_checkout', 'Checkout OTP'], ['order_received', 'Order received'], ['admin_test', 'Admin test']]
const STATUSES: [string, string][] = [['', 'All'], ['pending', 'Pending'], ['in_progress', 'In Progress'], ['sent', 'Sent'], ['failed', 'Failed']]
const TONE: Record<SmsStatus, string> = {
  pending: 'border-field text-muted',
  in_progress: 'border-gold text-gold',
  sent: 'border-success text-success',
  failed: 'border-rose-deep text-rose-deep'
}

const f = reactive({ status: '', source: '', from: '', to: '', q: '' })
const page = ref(1)
const loading = ref(false)
const error = ref('')
const data = ref<Paged<SmsLogRow>>({ count: 0, results: [] })
const open = ref<number | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  const qs = new URLSearchParams({ page: String(page.value) })
  for (const [k, v] of Object.entries(f)) if (v) qs.set(k, v)
  try { data.value = await api<Paged<SmsLogRow>>(`/admin/sms-log/?${qs}`) } catch { error.value = 'Could not load the SMS log. Check the dates and try again.' }
  loading.value = false
}
await load()
const pages = computed(() => Math.max(1, Math.ceil(data.value.count / 20)))
function apply() { page.value = 1; open.value = null; load() }
function setStatus(s: string) { f.status = s; apply() }
async function go(n: number) { page.value = n; open.value = null; await load() }
const when = (s: string) => new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const toggle = (id: number) => { open.value = open.value === id ? null : id }
</script>

<template>
  <section>
    <AdminHeading eyebrow="Settings" title="SMS log" />
    <p class="hint -mt-2 mb-4">Every SMS sent through MiMSMS, newest first. OTP codes are hidden.</p>

    <div class="mb-3 flex items-center overflow-x-auto border-b border-field" role="tablist" aria-label="Status">
      <button v-for="[v, l] in STATUSES" :key="v" class="tab whitespace-nowrap" :aria-pressed="f.status === v" @click="setStatus(v)">{{ l }}</button>
    </div>
    <form class="mb-5 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap" @submit.prevent="apply">
      <input v-model="f.q" class="inp col-span-2 sm:!w-56" inputmode="tel" placeholder="Search mobile number" aria-label="Search mobile number">
      <select v-model="f.source" class="inp col-span-2 sm:!w-48" aria-label="Source"><option v-for="[v, l] in SOURCES" :key="v" :value="v">{{ l }}</option></select>
      <input v-model="f.from" type="date" class="inp sm:!w-40" aria-label="From date">
      <input v-model="f.to" type="date" class="inp sm:!w-40" aria-label="To date">
      <button class="btn-secondary col-span-2 sm:col-span-1">Filter</button>
    </form>
    <p v-if="error" class="err mb-3" role="alert">{{ error }}</p>

    <!-- Phones: cards -->
    <ul class="flex flex-col gap-2.5 md:hidden" :aria-busy="loading">
      <li v-for="r in data.results" :key="r.id" class="border border-border bg-surface">
        <button type="button" class="flex w-full flex-col gap-1.5 p-3.5 text-left" :aria-expanded="open === r.id" @click="toggle(r.id)">
          <span class="flex items-center justify-between gap-3"><span class="font-medium tabular-nums">{{ r.receiver }}</span><span class="border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em]" :class="TONE[r.status]">{{ r.status_label }}</span></span>
          <span class="flex justify-between gap-3 text-xs text-muted"><span>{{ r.source_label }}</span><span>{{ when(r.created_at) }}</span></span>
          <span class="text-sm text-body" :class="open === r.id ? '' : 'line-clamp-2'">{{ r.message }}</span>
        </button>
        <div v-if="open === r.id && (r.error || r.provider_ref)" class="border-t border-border px-3.5 py-2.5 text-xs">
          <p v-if="r.error" class="err">{{ r.error }}</p>
          <p v-if="r.provider_ref" class="text-muted">Provider ref {{ r.provider_ref }} · {{ r.attempts }} attempt{{ r.attempts === 1 ? '' : 's' }}</p>
        </div>
      </li>
      <li v-if="!loading && !data.results.length" class="p-4 text-sm text-muted">No SMS match these filters.</li>
    </ul>

    <!-- Wider screens: table -->
    <div class="hidden overflow-x-auto border border-border bg-surface md:block">
      <table class="w-full text-left text-sm" :aria-busy="loading">
        <thead><tr class="cap"><th class="p-3">Date</th><th class="p-3">Receiver</th><th class="p-3">Message</th><th class="p-3">From section</th><th class="p-3">Status</th></tr></thead>
        <tbody>
          <template v-for="r in data.results" :key="r.id">
            <tr class="cursor-pointer border-t border-border align-top hover:bg-cream" :class="open === r.id ? 'bg-cream' : ''" tabindex="0" :aria-expanded="open === r.id" @click="toggle(r.id)" @keydown.enter="toggle(r.id)">
              <td class="whitespace-nowrap p-3 text-muted">{{ when(r.created_at) }}</td>
              <td class="whitespace-nowrap p-3 tabular-nums">{{ r.receiver }}</td>
              <td class="max-w-[420px] p-3"><span :class="open === r.id ? '' : 'line-clamp-1'">{{ r.message }}</span></td>
              <td class="whitespace-nowrap p-3">{{ r.source_label }}</td>
              <td class="p-3"><span class="whitespace-nowrap border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em]" :class="TONE[r.status]">{{ r.status_label }}</span></td>
            </tr>
            <tr v-if="open === r.id && (r.error || r.provider_ref)" class="bg-cream"><td colspan="5" class="px-3 pb-3 text-xs">
              <span v-if="r.error" class="err mr-4">{{ r.error }}</span>
              <span v-if="r.provider_ref" class="text-muted">Provider ref {{ r.provider_ref }} · {{ r.attempts }} attempt{{ r.attempts === 1 ? '' : 's' }}</span>
            </td></tr>
          </template>
          <tr v-if="!loading && !data.results.length"><td colspan="5" class="p-4 text-muted">No SMS match these filters.</td></tr>
        </tbody>
      </table>
    </div>

    <div class="mt-4 flex items-center justify-between gap-3 sm:justify-start">
      <button class="btn-secondary" :disabled="page <= 1" @click="go(page - 1)">Previous</button>
      <span class="hint">Page {{ page }} of {{ pages }} · {{ data.count }} SMS</span>
      <button class="btn-secondary" :disabled="page >= pages" @click="go(page + 1)">Next</button>
    </div>
  </section>
</template>
