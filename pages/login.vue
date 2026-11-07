<script setup lang="ts">
// Design: Auth board. SRS ACC-01 (register: name, mobile, password, optional email, SMS OTP),
// ACC-02 (clear message when the SMS can't be sent), ACC-03 (mobile + password, remember me),
// ACC-11 (forgot password by OTP), ACC-12/14. Guest checkout always stays available.
import type { ApiError } from '~/utils/apiError'
import type { CustomerMe } from '~/types/api'
import { cleanCode, isCode, normalizePhone, passwordProblem, RESEND_SECONDS, secondsLeft } from '~/utils/otp'

useSeoMeta({ title: 'Log in', robots: 'noindex' })
definePageMeta({ layout: 'bleed' })
const route = useRoute()
const customer = useCustomerStore()
const { api, errorOf } = useApi()
const { data: s } = await useSiteSettings()

type Step = 'login' | 'register' | 'verify' | 'forgot' | 'reset'
const step = ref<Step>(route.query.tab === 'register' ? 'register' : 'login')
const f = reactive({ phone: '', password: '', remember: true, full_name: '', email: '', code: '', new_password: '' })
const errors = ref<Record<string, string>>({})
const message = ref('')
const busy = ref(false)
const sentAt = ref(0)
const now = ref(Date.now())
const smsFailed = ref(false)
let tick: ReturnType<typeof setInterval> | undefined
onMounted(() => { tick = setInterval(() => { now.value = Date.now() }, 1000) })
onBeforeUnmount(() => clearInterval(tick))
const wait = computed(() => secondsLeft(sentAt.value, now.value, RESEND_SECONDS))
const purpose = computed(() => (step.value === 'reset' ? 'reset' : 'register'))
const next = computed(() => { const n = String(route.query.next || ''); return n.startsWith('/') && !n.startsWith('//') ? n : '/account' })

function reset(to: Step) { step.value = to; errors.value = {}; message.value = ''; smsFailed.value = false }
function fail(e: unknown) {
  const er: ApiError = errorOf(e)
  const flat: Record<string, string> = {}
  for (const [k, v] of Object.entries(er.fields)) flat[k] = Array.isArray(v) ? v.join(' ') : String(v)
  errors.value = flat; message.value = Object.keys(flat).length ? '' : er.message
}
async function finish(me: CustomerMe) {
  customer.setMe(me); await customer.loadWishlist()
  await navigateTo(next.value)
}
// ACC-02: after asking for a code, poll the status for a few seconds and say so if the SMS failed.
async function watchSms() {
  smsFailed.value = false
  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setTimeout(r, 1500))
    try {
      const st = await api<{ status: string }>('/auth/otp-status/', { query: { phone: f.phone, purpose: purpose.value } })
      if (st.status === 'sent') return
      if (st.status === 'failed') { smsFailed.value = true; return }
    } catch { return }
  }
}

async function login() {
  busy.value = true; errors.value = {}; message.value = ''
  try { await finish(await api<CustomerMe>('/auth/login/', { method: 'POST', body: { phone: f.phone, password: f.password, remember: f.remember } })) }
  catch (e) { fail(e) } finally { busy.value = false }
}
async function register() {
  errors.value = {}; message.value = ''
  if (!normalizePhone(f.phone)) { errors.value = { phone: 'Enter a valid mobile number like 01XXXXXXXXX.' }; return }
  const pw = passwordProblem(f.password, f.phone)
  if (pw) { errors.value = { password: pw }; return }
  await sendCode('/auth/register/', { full_name: f.full_name, phone: f.phone, password: f.password, email: f.email || undefined }, 'verify')
}
async function sendCode(path: string, body: Record<string, unknown>, to: Step) {
  busy.value = true
  try {
    await api(path, { method: 'POST', body })
    sentAt.value = Date.now(); reset(to); f.code = ''; watchSms()
  } catch (e) { fail(e) } finally { busy.value = false }
}
async function resend() {
  if (step.value === 'verify') await sendCode('/auth/register/', { full_name: f.full_name, phone: f.phone, password: f.password, email: f.email || undefined }, 'verify')
  else await sendCode('/auth/password/forgot/', { phone: f.phone }, 'reset')
}
async function verify() {
  errors.value = {}
  if (!isCode(f.code)) { errors.value = { code: 'Enter the 6-digit code.' }; return }
  busy.value = true
  try { await finish(await api<CustomerMe>('/auth/register/verify/', { method: 'POST', body: { phone: f.phone, code: f.code } })) }
  catch (e) { fail(e) } finally { busy.value = false }
}
async function forgot() {
  if (!normalizePhone(f.phone)) { errors.value = { phone: 'Enter a valid mobile number like 01XXXXXXXXX.' }; return }
  await sendCode('/auth/password/forgot/', { phone: f.phone }, 'reset')
}
async function doReset() {
  errors.value = {}
  const pw = passwordProblem(f.new_password, f.phone)
  if (pw) { errors.value = { new_password: pw }; return }
  if (!isCode(f.code)) { errors.value = { code: 'Enter the 6-digit code.' }; return }
  busy.value = true
  try { await finish(await api<CustomerMe>('/auth/password/reset/', { method: 'POST', body: { phone: f.phone, code: f.code, new_password: f.new_password } })) }
  catch (e) { fail(e) } finally { busy.value = false }
}
</script>

<template>
  <section class="flex min-h-[640px] flex-col md:flex-row">
    <div class="relative hidden min-h-[420px] flex-1 items-center justify-center bg-tile-2 md:flex">
      <div class="absolute inset-9 border border-gold/35" />
      <div class="-mt-28 w-[260px] text-gold" aria-hidden="true"><StoreArt kind="set" /></div>
      <div class="absolute bottom-16 left-16 max-w-[380px]"><h2 class="font-display text-h1 leading-[1.05]">Your wardrobe, always within reach</h2><p class="mt-3 text-[15.5px] leading-[1.65] text-body">Save favourites and follow every order from confirmation to delivery.</p></div>
    </div>

    <div class="flex flex-1 items-start justify-center px-5 py-10 md:items-center md:px-10 md:py-16">
      <div class="flex w-full max-w-[440px] flex-col gap-7">
        <div v-if="step === 'login' || step === 'register'" class="flex border-b border-field" role="tablist">
          <button v-for="t in ([['login', 'Log in'], ['register', 'Register']] as const)" :key="t[0]" class="-mb-px h-[52px] flex-1 border-b-2 text-[12.5px] font-medium uppercase tracking-[0.16em] transition-colors" :class="step === t[0] ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'" role="tab" :aria-selected="step === t[0]" @click="reset(t[0])">{{ t[1] }}</button>
        </div>

        <form v-if="step === 'login'" class="flex flex-col gap-5" @submit.prevent="login">
          <div><div class="eyebrow">Welcome back</div><h1 class="mt-2 font-display text-h1 leading-[1.05] md:text-h2-lg">Log in</h1></div>
          <div class="fld"><label class="sf-lbl" for="lp">Mobile number</label><input id="lp" v-model="f.phone" class="sf-inp" inputmode="tel" autocomplete="username" placeholder="01XXXXXXXXX" required></div>
          <div class="fld"><label class="sf-lbl" for="lw">Password</label><input id="lw" v-model="f.password" class="sf-inp" type="password" autocomplete="current-password" required></div>
          <div class="flex items-center justify-between gap-3 text-sm"><label class="flex min-h-11 cursor-pointer items-center gap-2.5"><input v-model="f.remember" type="checkbox" class="h-4 w-4 accent-accent">Keep me signed in</label><button type="button" class="min-h-11 text-sm underline underline-offset-4" @click="reset('forgot')">Forgot password?</button></div>
          <p v-if="message" class="border-l-[3px] border-accent bg-surface px-3.5 py-2.5 text-sm" role="alert">{{ message }}</p>
          <button class="btn !h-14 w-full" :disabled="busy" data-track="login_submit"><span v-if="busy" class="btn-spin" />Log in</button>
          <p class="text-[13.5px] leading-relaxed text-body">No account needed to buy. You can check out as a guest and track the order with its number and your phone.</p>
        </form>

        <form v-else-if="step === 'register'" class="flex flex-col gap-5" @submit.prevent="register">
          <div><div class="eyebrow">New here</div><h1 class="mt-2 font-display text-h1 leading-[1.05] md:text-h2-lg">Create account</h1></div>
          <div class="fld"><label class="sf-lbl" for="rn">Full name</label><input id="rn" v-model="f.full_name" class="sf-inp" autocomplete="name" required><p v-if="errors.full_name" class="err" role="alert">{{ errors.full_name }}</p></div>
          <div class="fld"><label class="sf-lbl" for="rp">Mobile number</label><input id="rp" v-model="f.phone" class="sf-inp" inputmode="tel" autocomplete="username" placeholder="01XXXXXXXXX" required><p v-if="errors.phone" class="err" role="alert">{{ errors.phone }} <button v-if="errors.phone.includes('already')" type="button" class="underline" @click="reset('login')">Log in</button></p></div>
          <div class="fld"><label class="sf-lbl" for="rw">Password</label><input id="rw" v-model="f.password" class="sf-inp" type="password" autocomplete="new-password" required><p v-if="errors.password" class="err" role="alert">{{ errors.password }}</p></div>
          <div class="fld"><label class="sf-lbl" for="re">Email <span class="font-normal normal-case tracking-normal text-muted">(optional)</span></label><input id="re" v-model="f.email" class="sf-inp" type="email" autocomplete="email"><p v-if="errors.email" class="err" role="alert">{{ errors.email }}</p></div>
          <p v-if="message" class="border-l-[3px] border-accent bg-surface px-3.5 py-2.5 text-sm" role="alert">{{ message }}</p>
          <button class="btn !h-14 w-full" :disabled="busy" data-track="register_submit"><span v-if="busy" class="btn-spin" />Send verification code</button>
          <p class="text-[13.5px] leading-relaxed text-body">We text a 6-digit code to your mobile number. Earlier guest orders on this number are added to your account once verified.</p>
        </form>

        <form v-else-if="step === 'verify'" class="flex flex-col gap-5" @submit.prevent="verify">
          <div><div class="eyebrow">Step 2 of 2</div><h1 class="mt-2 font-display text-h1 leading-[1.05] md:text-h2-lg">Verify mobile</h1></div>
          <p class="text-[15px] leading-relaxed text-body">Enter the 6-digit code sent by SMS to {{ f.phone }}. It expires in 5 minutes.</p>
          <div class="fld"><label class="sf-lbl" for="vc">Verification code</label><input id="vc" v-model="f.code" class="sf-inp !text-card tracking-[0.5em]" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="······" autofocus @input="f.code = cleanCode(f.code)"><p v-if="errors.code" class="err" role="alert">{{ errors.code }}</p></div>
          <p v-if="smsFailed" class="border-l-[3px] border-accent bg-surface px-3.5 py-2.5 text-sm" role="alert">We couldn’t send the SMS. Try again{{ wait ? ` in ${wait}s` : '' }}, or contact us on {{ s?.support_phones?.[0] || '[PHONE NUMBER]' }}.</p>
          <p v-if="message" class="border-l-[3px] border-accent bg-surface px-3.5 py-2.5 text-sm" role="alert">{{ message }}</p>
          <button class="btn !h-14 w-full" :disabled="busy" data-track="otp_verify"><span v-if="busy" class="btn-spin" />Verify &amp; continue</button>
          <div class="flex items-center justify-between gap-3 text-sm text-body"><button type="button" class="min-h-11 disabled:text-muted" :disabled="busy || wait > 0" @click="resend">{{ wait > 0 ? `Resend code in ${wait}s` : 'Resend code' }}</button><button type="button" class="border-b border-ink py-2 text-sm" @click="reset('register')">Change number</button></div>
        </form>

        <form v-else-if="step === 'forgot'" class="flex flex-col gap-5" @submit.prevent="forgot">
          <div><div class="eyebrow">Reset password</div><h1 class="mt-2 font-display text-h1 leading-[1.05] md:text-h2-lg">Forgot password</h1></div>
          <p class="text-[15px] leading-relaxed text-body">Enter your mobile number and we will text you a code so you can choose a new password.</p>
          <div class="fld"><label class="sf-lbl" for="fp">Mobile number</label><input id="fp" v-model="f.phone" class="sf-inp" inputmode="tel" placeholder="01XXXXXXXXX" required><p v-if="errors.phone" class="err" role="alert">{{ errors.phone }}</p></div>
          <p v-if="message" class="border-l-[3px] border-accent bg-surface px-3.5 py-2.5 text-sm" role="alert">{{ message }}</p>
          <button class="btn !h-14 w-full" :disabled="busy"><span v-if="busy" class="btn-spin" />Send code</button>
          <button type="button" class="border-b border-ink py-2 text-sm self-start" @click="reset('login')">Back to log in</button>
        </form>

        <form v-else class="flex flex-col gap-5" @submit.prevent="doReset">
          <div><div class="eyebrow">Reset password</div><h1 class="mt-2 font-display text-h1 leading-[1.05] md:text-h2-lg">New password</h1></div>
          <p class="text-[15px] leading-relaxed text-body">If {{ f.phone }} has an account, a code is on its way. Enter it with your new password. Other devices will be signed out.</p>
          <div class="fld"><label class="sf-lbl" for="rc">Code from SMS</label><input id="rc" v-model="f.code" class="sf-inp !text-card tracking-[0.5em]" inputmode="numeric" maxlength="6" autocomplete="one-time-code" @input="f.code = cleanCode(f.code)"><p v-if="errors.code" class="err" role="alert">{{ errors.code }}</p></div>
          <div class="fld"><label class="sf-lbl" for="rnp">New password</label><input id="rnp" v-model="f.new_password" type="password" class="sf-inp" autocomplete="new-password"><p v-if="errors.new_password || errors.password" class="err">{{ errors.new_password || errors.password }}</p></div>
          <p v-if="smsFailed" class="border-l-[3px] border-accent bg-surface px-3.5 py-2.5 text-sm" role="alert">We couldn’t send the SMS. Try again, or contact us.</p>
          <p v-if="message" class="border-l-[3px] border-accent bg-surface px-3.5 py-2.5 text-sm" role="alert">{{ message }}</p>
          <button class="btn !h-14 w-full" :disabled="busy"><span v-if="busy" class="btn-spin" />Save password &amp; log in</button>
          <button type="button" class="border-b border-ink py-2 text-sm self-start disabled:text-muted disabled:border-muted" :disabled="busy || wait > 0" @click="resend">{{ wait > 0 ? `Resend code in ${wait}s` : 'Resend code' }}</button>
        </form>
      </div>
    </div>
  </section>
</template>
