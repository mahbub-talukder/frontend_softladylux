<script setup lang="ts">
// SRS v1.11 CHK-11: guest mobile verification before the order is placed. Four boxes that advance on
// typing, accept a pasted or auto-filled code (one-time-code), go back on Backspace and submit once
// all four digits are in. Resend after 60 s; ACC-02: if the SMS could not be sent, the customer is told.
// Bottom sheet on phones, centred card on wider screens (StoreDialog does focus trap, Esc, scroll lock).
import { RESEND_SECONDS, secondsLeft } from '~/utils/otp'

const props = defineProps<{ phone: string }>()
const emit = defineEmits<{ verified: []; close: [] }>()
const { api, errorOf } = useApi()

const DIGITS = 4
const boxes = ref<string[]>(Array(DIGITS).fill(''))
const inputs = ref<HTMLInputElement[]>([])
const busy = ref(false)
const error = ref('')
const smsFailed = ref(false)
const sentAt = ref(Date.now())
const now = ref(Date.now())
let tick: ReturnType<typeof setInterval> | undefined
onMounted(() => { tick = setInterval(() => { now.value = Date.now() }, 1000); watchSms() })
onBeforeUnmount(() => clearInterval(tick))
const wait = computed(() => secondsLeft(sentAt.value, now.value, RESEND_SECONDS))
const code = computed(() => boxes.value.join(''))

function fill(from: number, digits: string) {
  for (let i = 0; i < digits.length && from + i < DIGITS; i++) boxes.value[from + i] = digits[i]!
  const next = Math.min(from + digits.length, DIGITS - 1)
  nextTick(() => inputs.value[next]?.focus())
  if (code.value.length === DIGITS) verify()
}
function onInput(i: number, e: Event) {
  const el = e.target as HTMLInputElement
  const digits = el.value.replace(/\D/g, '')
  boxes.value[i] = ''
  el.value = ''
  error.value = ''
  if (digits) fill(i, digits)
}
function onKey(i: number, e: KeyboardEvent) {
  if (e.key === 'Backspace' && !boxes.value[i] && i > 0) { boxes.value[i - 1] = ''; inputs.value[i - 1]?.focus(); e.preventDefault() }
  else if (e.key === 'ArrowLeft' && i > 0) inputs.value[i - 1]?.focus()
  else if (e.key === 'ArrowRight' && i < DIGITS - 1) inputs.value[i + 1]?.focus()
}
function onPaste(i: number, e: ClipboardEvent) {
  const digits = (e.clipboardData?.getData('text') ?? '').replace(/\D/g, '')
  if (!digits) return
  e.preventDefault()
  fill(i, digits)
}

async function verify() {
  if (busy.value || code.value.length !== DIGITS) return
  busy.value = true; error.value = ''
  try {
    await api('/checkout/otp/verify/', { method: 'POST', body: { phone: props.phone, code: code.value } })
    emit('verified')
  } catch (e) {
    const er = errorOf(e)
    error.value = (er.fields.code as unknown as string[] | string | undefined)?.toString() || er.message
    boxes.value = Array(DIGITS).fill('')
    nextTick(() => inputs.value[0]?.focus())
  } finally { busy.value = false }
}

async function resend() {
  if (wait.value > 0 || busy.value) return
  busy.value = true; error.value = ''
  try {
    await api('/checkout/otp/', { method: 'POST', body: { phone: props.phone } })
    sentAt.value = Date.now(); boxes.value = Array(DIGITS).fill('')
    nextTick(() => inputs.value[0]?.focus())
    watchSms()
  } catch (e) { error.value = errorOf(e).message } finally { busy.value = false }
}

// ACC-02: poll a few seconds and say so if the SMS failed.
async function watchSms() {
  smsFailed.value = false
  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setTimeout(r, 1500))
    try {
      const st = await api<{ status: string }>('/auth/otp-status/', { query: { phone: props.phone, purpose: 'checkout' } })
      if (st.status === 'sent') return
      if (st.status === 'failed') { smsFailed.value = true; return }
    } catch { return }
  }
}
</script>

<template>
  <StoreDialog labelledby="otp-title" panel-class="w-full max-w-[440px] rounded-t-[20px] bg-bg px-6 pb-[calc(28px+env(safe-area-inset-bottom))] pt-6 shadow-pop sm:rounded-[14px] sm:p-8 otp-in" @close="emit('close')">
    <div class="mx-auto mb-5 h-1 w-10 rounded-full bg-field sm:hidden" aria-hidden="true" />
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="text-xs font-medium uppercase tracking-[0.2em] text-gold">One last step</div>
        <h2 id="otp-title" class="mt-1.5 font-display text-h3 leading-tight md:text-h3-lg">Verify your mobile</h2>
      </div>
      <button type="button" class="-mr-2 -mt-1 flex h-11 w-11 flex-none items-center justify-center text-ink" aria-label="Close" @click="emit('close')"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
    </div>
    <p class="mt-3 text-[15px] leading-relaxed text-body">We sent a 4-digit code to <b class="whitespace-nowrap font-medium text-ink">{{ phone }}</b>. Enter it to place your order. You only do this once per number.</p>

    <form class="mt-6" novalidate @submit.prevent="verify">
      <div class="flex justify-center gap-3" role="group" aria-label="Verification code">
        <input
          v-for="(d, i) in boxes" :key="i" :ref="(el) => { if (el) inputs[i] = el as HTMLInputElement }"
          :value="d" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4"
          :autocomplete="i === 0 ? 'one-time-code' : 'off'" :aria-label="`Digit ${i + 1}`" :data-autofocus="i === 0 ? '' : undefined"
          class="h-16 w-14 border bg-surface text-center font-display text-[30px] text-ink outline-none transition-[border-color,box-shadow] duration-200 focus:border-ink focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent)_25%,transparent)] sm:h-[68px] sm:w-[60px]"
          :class="error ? 'border-rose-deep' : d ? 'border-ink' : 'border-field'"
          @input="onInput(i, $event)" @keydown="onKey(i, $event)" @paste="onPaste(i, $event)" @focus="($event.target as HTMLInputElement).select()"
        >
      </div>
      <p v-if="error" class="err mt-3 text-center" role="alert">{{ error }}</p>
      <p v-if="smsFailed" class="mt-3 border-l-[3px] border-accent bg-cream px-3.5 py-2.5 text-sm" role="alert">We could not send the SMS. Check the number, try again in a minute, or call us to order.</p>
      <button class="btn mt-6 !h-14 w-full" :disabled="busy || code.length !== 4" data-track="checkout_otp_verify"><span v-if="busy" class="btn-spin" />Verify &amp; place order</button>
    </form>
    <div class="mt-3 flex items-center justify-between gap-3 text-sm text-body">
      <button type="button" class="min-h-11 disabled:text-muted" :disabled="busy || wait > 0" @click="resend">{{ wait > 0 ? `Resend code in ${wait}s` : 'Resend code' }}</button>
      <button type="button" class="border-b border-ink py-2" @click="emit('close')">Change number</button>
    </div>
  </StoreDialog>
</template>

<style>
@media (prefers-reduced-motion: no-preference) {
  .otp-in { animation: sll-otp-up 0.32s cubic-bezier(0.2, 0.8, 0.2, 1); }
  @keyframes sll-otp-up { from { transform: translateY(24px); opacity: 0; } to { transform: none; opacity: 1; } }
}
</style>
