<script setup lang="ts">
// SRS ACC-10 / ADM-01: staff sign in with email + password at /admin/login.
definePageMeta({ layout: 'admin' })
const auth = useAuthStore()
const { errorOf } = useApi()
const { required, email: emailRule } = rules
const email = ref('')
const password = ref('')
const remember = ref(true)
const error = ref('')
const busy = ref(false)
const v = useFormValidation(() => ({ email: email.value, password: password.value }), {
  email: [required('Enter your email address.'), emailRule()],
  password: [required('Enter your password.')]
})

async function submit() {
  error.value = ''
  if (!v.validateAll()) return
  busy.value = true
  try {
    await auth.login(email.value, password.value, remember.value)
    await navigateTo('/admin')
  } catch (e) {
    // Wrong password, locked account (5 failures = 15 min) and throttling all come back as a clear message.
    error.value = errorOf(e).message
  } finally { busy.value = false }
}
</script>

<template>
  <section class="mx-auto mt-16 w-full max-w-sm">
    <h1 class="text-4xl">Admin sign in</h1>
    <form class="card mt-6" novalidate @submit.prevent="submit">
      <AdminFormField name="email" label="Email" required hide-optional :error="v.errorFor('email')">
        <template #default="f"><input :id="f.id" v-model="email" type="email" class="inp" autocomplete="username" :aria-invalid="f.invalid" :aria-describedby="f.describedby" @input="v.onInput('email')" @blur="v.touch('email')"></template>
      </AdminFormField>
      <AdminFormField name="password" label="Password" required hide-optional :error="v.errorFor('password')">
        <template #default="f"><input :id="f.id" v-model="password" type="password" class="inp" autocomplete="current-password" :aria-invalid="f.invalid" :aria-describedby="f.describedby" @input="v.onInput('password')" @blur="v.touch('password')"></template>
      </AdminFormField>
      <label class="flex items-center gap-2 text-sm"><input v-model="remember" type="checkbox"> Keep me signed in</label>
      <p v-if="error" class="err" role="alert">{{ error }}</p>
      <button class="btn btn-spin" :disabled="busy" :aria-busy="busy" data-track="admin_login">Sign in</button>
    </form>
  </section>
</template>
