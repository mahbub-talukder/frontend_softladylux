<script setup lang="ts">
// M6 error pages (SRS §16): a branded 404 and 500 using theme tokens only (THM-05). Production never
// shows a stack trace; the real error is in the server log. Admin routes get a plainer layout.
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const route = useRoute()
const isAdmin = computed(() => route.path.startsWith('/admin'))
const notFound = computed(() => props.error.statusCode === 404)
const title = computed(() => (notFound.value ? 'We can’t find that page' : 'Something went wrong'))
const text = computed(() => (notFound.value
  ? 'The page may have moved or never existed. Try searching, or head back to the shop.'
  : 'We’re sorry: something went wrong on our side. Please try again in a moment.'))
useHead({ title: () => title.value, meta: [{ name: 'robots', content: 'noindex' }] })
const home = () => clearError({ redirect: isAdmin.value ? '/admin' : '/' })
const retry = () => clearError({ redirect: route.fullPath })
const q = ref('')
const search = () => clearError({ redirect: `/search?q=${encodeURIComponent(q.value)}` })
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-bg px-4 text-center text-ink">
    <p class="cap">{{ error.statusCode }}</p>
    <h1 class="mt-2 text-5xl">{{ title }}</h1>
    <p class="mt-3 max-w-md text-muted">{{ text }}</p>
    <form v-if="notFound && !isAdmin" class="mt-6 flex w-full max-w-sm gap-2" role="search" @submit.prevent="search">
      <label for="e-q" class="sr-only">Search products</label>
      <input id="e-q" v-model="q" class="inp" placeholder="Search bras, sets, sleepwear…" type="search">
      <button class="btn !px-5">Search</button>
    </form>
    <div class="mt-6 flex gap-3">
      <button class="btn" @click="home">{{ isAdmin ? 'Back to dashboard' : 'Back to the shop' }}</button>
      <button v-if="!notFound" class="btn-secondary" @click="retry">Try again</button>
    </div>
  </div>
</template>
