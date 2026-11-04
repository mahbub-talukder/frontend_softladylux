<script setup lang="ts">
// Design: Auth board. SRS ACC-01 (register: name, mobile, password, optional email, SMS OTP),
// ACC-02 (clear message when the SMS can't be sent), ACC-03 (mobile + password, remember me),
// ACC-11 (forgot password by OTP), ACC-12/14. Guest checkout always stays available.
import type { ApiError } from '~/composables/useApi'
import type { CustomerMe } from '~/types/api'
import { cleanCode, isCode, normalizePhone, passwordProblem, RESEND_SECONDS, secondsLeft } from '~/utils/otp'

useSeoMeta({ title: 'Log in', robots: 'noindex' })
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
  <section class="mx-auto grid max-w-4xl gap-8 md:grid-cols-[1fr_1.1fr]">
    <div class="hidden flex-col justify-center gap-3 bg-primary-soft p-8 md:flex">
      <h2 class="text-3xl">Your wardrobe, always within reach</h2>
      <p class="text-muted">Save favourites and follow every order from confirmation to delivery.</p>
    </div>

    <div>
      <div v-if="step === 'login' || step === 'register'" class="mb-4 flex border-b border-border" role="tablist">
        <button class="tab" :aria-pressed="step === 'login'" @click="reset('login')">Log in</button>
        <button class="tab" :aria-pressed="step === 'register'" @click="reset('register')">Create account</button>
      </div>

      <form v-if="step === 'login'" class="card" @submit.prevent="login">
        <div class="cap">Welcome back</div><h1 class="text-4xl">Log in</h1>
        <div class="fld"><label for="lp">Mobile number</label><input id="lp" v-model="f.phone" class="inp" inputmode="tel" autocomplete="username" placeholder="01XXXXXXXXX" required></div>
        <div class="fld"><label for="lw">Password</label><input id="lw" v-model="f.password" type="password" class="inp" autocomplete="current-password" required></div>
        <div class="flex items-center justify-between text-sm"><label class="flex items-center gap-2"><input v-model="f.remember" type="checkbox">Keep me signed in</label><button type="button" class="underline" @click="reset('forgot')">Forgot password?</button></div>
        <p v-if="message" class="err" role="alert">{{ message }}</p>
        <button class="btn" :disabled="busy" data-track="login_submit">Log in</button>
        <p class="hint">No account needed to buy. You can check out as a guest and track the order with its number and your phone.</p>
      </form>

      <form v-else-if="step === 'register'" class="card" @submit.prevent="register">
        <div class="cap">New here</div><h1 class="text-4xl">Create account</h1>
        <div class="fld"><label for="rn">Full name</label><input id="rn" v-model="f.full_name" class="inp" autocomplete="name" required><p v-if="errors.full_name" class="err">{{ errors.full_name }}</p></div>
        <div class="fld"><label for="rp">Mobile number</label><input id="rp" v-model="f.phone" class="inp" inputmode="tel" autocomplete="username" placeholder="01XXXXXXXXX" required><p v-if="errors.phone" class="err" role="alert">{{ errors.phone }} <button v-if="errors.phone.includes('already')" type="button" class="underline" @click="reset('login')">Log in</button></p></div>
        <div class="fld"><label for="rw">Password</label><input id="rw" v-model="f.password" type="password" class="inp" autocomplete="new-password" required><p v-if="errors.password" class="err">{{ errors.password }}</p></div>
        <div class="fld"><label for="re">Email (optional)</label><input id="re" v-model="f.email" type="email" class="inp" autocomplete="email"><p v-if="errors.email" class="err">{{ errors.email }}</p></div>
        <p v-if="message" class="err" role="alert">{{ message }}</p>
        <button class="btn" :disabled="busy" data-track="register_submit">Send verification code</button>
        <p class="hint">We text a 6-digit code to your mobile number. Earlier guest orders on this number are added to your account once verified.</p>
      </form>

      <form v-else-if="step === 'verify'" class="card" @submit.prevent="verify">
        <div class="cap">Step 2 of 2</div><h1 class="text-4xl">Verify mobile</h1>
        <p class="hint">Enter the 6-digit code sent by SMS to {{ f.phone }}. It expires in 5 minutes.</p>
        <div class="fld"><label for="vc">Verification code</label><input id="vc" v-model="f.code" class="inp tracking-[0.5em]" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="······" @input="f.code = cleanCode(f.code)"><p v-if="errors.code" class="err" role="alert">{{ errors.code }}</p></div>
        <p v-if="smsFailed" class="err" role="alert">We couldn’t send the SMS. Try again{{ wait ? ` in ${wait}s` : '' }}, or contact us on {{ s?.support_phones?.[0] || '[PHONE NUMBER]' }}.</p>
        <p v-if="message" class="err" role="alert">{{ message }}</p>
        <button class="btn" :disabled="busy" data-track="otp_verify">Verify &amp; continue</button>
        <button type="button" class="btn-secondary" :disabled="busy || wait > 0" @click="resend">{{ wait > 0 ? `Resend code in ${wait}s` : 'Resend code' }}</button>
        <button type="button" class="hint underline" @click="reset('register')">Change number</button>
      </form>

      <form v-else-if="step === 'forgot'" class="card" @submit.prevent="forgot">
        <div class="cap">Forgot password</div><h1 class="text-4xl">Reset password</h1>
        <p class="hint">Enter your mobile number and we will text you a code.</p>
        <div class="fld"><label for="fp">Mobile number</label><input id="fp" v-model="f.phone" class="inp" inputmode="tel" placeholder="01XXXXXXXXX" required><p v-if="errors.phone" class="err">{{ errors.phone }}</p></div>
        <p v-if="message" class="err" role="alert">{{ message }}</p>
        <button class="btn" :disabled="busy">Send code</button>
        <button type="button" class="hint underline" @click="reset('login')">Back to log in</button>
      </form>

      <form v-else class="card" @submit.prevent="doReset">
        <div class="cap">Forgot password</div><h1 class="text-4xl">New password</h1>
        <p class="hint">If {{ f.phone }} has an account, a code is on its way. Enter it with your new password. Other devices will be signed out.</p>
        <div class="fld"><label for="rc">Code</label><input id="rc" v-model="f.code" class="inp tracking-[0.5em]" inputmode="numeric" maxlength="6" autocomplete="one-time-code" @input="f.code = cleanCode(f.code)"><p v-if="errors.code" class="err" role="alert">{{ errors.code }}</p></div>
        <div class="fld"><label for="rnp">New password</label><input id="rnp" v-model="f.new_password" type="password" class="inp" autocomplete="new-password"><p v-if="errors.new_password || errors.password" class="err">{{ errors.new_password || errors.password }}</p></div>
        <p v-if="smsFailed" class="err" role="alert">We couldn’t send the SMS. Try again, or contact us.</p>
        <p v-if="message" class="err" role="alert">{{ message }}</p>
        <button class="btn" :disabled="busy">Save password &amp; log in</button>
        <button type="button" class="btn-secondary" :disabled="busy || wait > 0" @click="resend">{{ wait > 0 ? `Resend code in ${wait}s` : 'Resend code' }}</button>
      </form>
    </div>
  </section>
</template>
