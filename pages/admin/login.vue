<script setup lang="ts">
// SRS ACC-10 / ADM-01: staff sign in with email + password at /admin/login.
definePageMeta({ layout: 'admin' })
const auth = useAuthStore()
const { errorOf } = useApi()
const email = ref('')
const password = ref('')
const remember = ref(true)
const error = ref('')
const busy = ref(false)

async function submit() {
  busy.value = true; error.value = ''
  try {
    await auth.login(email.value, password.value, remember.value)
    await navigateTo('/admin')
  } catch (e) {
    error.value = errorOf(e).message
  } finally { busy.value = false }
}
</script>

<template>
  <section class="mx-auto mt-16 w-full max-w-sm">
    <h1 class="text-4xl">Admin sign in</h1>
    <form class="card mt-6" @submit.prevent="submit">
      <div class="fld"><label for="email">Email</label><input id="email" v-model="email" type="email" class="inp" autocomplete="username" required></div>
      <div class="fld"><label for="pw">Password</label><input id="pw" v-model="password" type="password" class="inp" autocomplete="current-password" required></div>
      <label class="flex items-center gap-2 text-sm"><input v-model="remember" type="checkbox"> Keep me signed in</label>
      <p v-if="error" class="err" role="alert">{{ error }}</p>
      <button class="btn" :disabled="busy" data-track="admin_login">Sign in</button>
    </form>
  </section>
</template>
