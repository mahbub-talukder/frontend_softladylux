<script setup lang="ts">
// Design: CookieBanner board. SRS INS-04: explains analytics; Accept loads GTM, Decline keeps it off
// and is remembered. Shown only when analytics is configured (a GTM ID is set, SET-09).
const consent = useConsentStore()
</script>

<template>
  <div v-if="consent.needsChoice" class="fixed inset-x-0 bottom-16 z-30 mx-auto max-w-3xl border border-border bg-surface p-4 shadow-sm sm:bottom-4" role="dialog" aria-label="Cookie notice" aria-live="polite">
    <p class="text-sm">We use cookies for analytics (Google Analytics via Tag Manager) to see which pages and buttons are used. Analytics only start if you accept. <NuxtLink to="/pages/privacy" class="underline">Privacy</NuxtLink></p>
    <div class="mt-3 flex gap-3">
      <button class="btn-secondary !px-6" data-track="cookie_decline" @click="consent.decline()">Decline</button>
      <button class="btn !px-6" data-track="cookie_accept" @click="consent.accept()">Accept</button>
    </div>
  </div>
</template>
