<script setup lang="ts">
// v1.11 owner request: "Send SMS" from the SMS log page. Recipient (Bangladeshi mobile) and message, with a live
// character and SMS-part count (GSM 160/153 per part, Unicode e.g. Bangla 70/67), then Send. The server sends it now,
// logs it (source "Admin (manual)") and answers whether the gateway accepted it; the dialog shows that result.
// Dialog behaviour (Esc, backdrop, focus trap and return, scroll lock) comes from StoreDialog; the admin-scope wrapper
// keeps the admin look inside the teleported panel.
import type { SmsLogRow } from '~/types/api'
import { normalizePhone } from '~/utils/otp'

type SendResult = { ok: boolean; detail: string; log: SmsLogRow | null }

const emit = defineEmits<{ close: []; sent: [] }>()
const { api, errorOf } = useApi()
const MAX = 640
const phone = ref('')
const message = ref('')
const busy = ref(false)
const errors = ref<Record<string, string>>({})
const result = ref<{ ok: boolean; detail: string } | null>(null)

const unicode = computed(() => /[^\x20-\x7E\n\r]/.test(message.value)) // anything outside basic GSM-ish ASCII
const parts = computed(() => {
  const len = message.value.length
  if (!len) return 0
  const [one, many] = unicode.value ? [70, 67] : [160, 153]
  return len <= one ? 1 : Math.ceil(len / many)
})

async function send() {
  errors.value = {}; result.value = null
  const p = normalizePhone(phone.value)
  if (!p) errors.value.phone = 'Enter a valid mobile number, e.g. 01712345678.'
  if (!message.value.trim()) errors.value.message = 'Write a message.'
  else if (message.value.length > MAX) errors.value.message = `Use at most ${MAX} characters.`
  if (Object.keys(errors.value).length) return
  busy.value = true
  try {
    const r: SendResult = await api<SendResult>('/admin/sms-log/send/', { method: 'POST', body: { phone: p, message: message.value }, toast: false })
    result.value = { ok: r.ok, detail: r.detail }
    emit('sent')
    if (r.ok) message.value = ''
  } catch (e) {
    const er = errorOf(e)
    errors.value = Object.fromEntries(Object.entries(er.fields ?? {}).map(([k, v]) => [k, ([] as string[]).concat(v).join(' ')]))
    if (!Object.keys(errors.value).length) result.value = { ok: false, detail: er.message }
  } finally { busy.value = false }
}
</script>

<template>
  <StoreDialog labelledby="sms-send-title" overlay-class="items-end sm:items-center sm:p-6" panel-class="admin-scope w-full max-w-[520px] rounded-t-[14px] bg-surface shadow-pop sm:rounded-[10px]" @close="emit('close')">
    <form class="admin-main flex flex-col gap-4 p-5 sm:p-7" novalidate @submit.prevent="send">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="cap">SMS log</div>
          <h2 id="sms-send-title" class="mt-1 font-display text-2xl">Send SMS</h2>
        </div>
        <button type="button" class="-mr-2 -mt-1 flex h-11 w-11 items-center justify-center rounded-full hover:bg-cream" aria-label="Close" @click="emit('close')"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="sms-to" class="text-xs font-semibold uppercase tracking-[0.12em]">Recipient number <span class="text-accent" aria-hidden="true">*</span></label>
        <input id="sms-to" v-model="phone" class="inp" inputmode="tel" autocomplete="off" placeholder="01XXXXXXXXX" data-autofocus :aria-invalid="!!errors.phone" @input="errors.phone = ''">
        <p v-if="errors.phone" class="err" role="alert">{{ errors.phone }}</p>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="sms-msg" class="text-xs font-semibold uppercase tracking-[0.12em]">Message <span class="text-accent" aria-hidden="true">*</span></label>
        <textarea id="sms-msg" v-model="message" class="inp min-h-[132px] resize-y py-2.5" :maxlength="MAX" rows="5" placeholder="Write your message…" :aria-invalid="!!errors.message" @input="errors.message = ''" />
        <div class="flex justify-between gap-3 text-xs text-muted">
          <span>{{ unicode ? 'Unicode (e.g. Bangla): 70 characters per SMS' : 'Plain text: 160 characters per SMS' }}</span>
          <span class="tabular-nums" :class="message.length > MAX - 40 ? 'text-accent' : ''">{{ message.length }}/{{ MAX }} · {{ parts }} SMS</span>
        </div>
        <p v-if="errors.message" class="err" role="alert">{{ errors.message }}</p>
      </div>

      <p v-if="result" class="border-l-[3px] px-3.5 py-2.5 text-sm" :class="result.ok ? 'border-success bg-admin-bg' : 'border-accent bg-cream'" role="status">
        {{ result.ok ? 'SMS sent. ' : 'Not sent: ' }}{{ result.detail }}
      </p>

      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" class="btn-secondary" @click="emit('close')">Close</button>
        <button class="btn btn-spin flex items-center justify-center gap-2" :disabled="busy" :aria-busy="busy" data-track="sms_send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 12 20 4l-6 16-3-7z" stroke-linejoin="round" /></svg>
          {{ busy ? 'Sending…' : 'Send' }}
        </button>
      </div>
      <p class="text-xs text-muted">Sends immediately through MiMSMS and uses SMS credit. It appears in the log as “Admin (manual)”.</p>
    </form>
  </StoreDialog>
</template>
