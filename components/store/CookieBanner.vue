<script setup lang="ts">
// Design: CookieBanner board. SRS INS-04: explains analytics; Accept loads GTM, Decline keeps it off
// and is remembered. Shown only when analytics is configured (a GTM ID is set, SET-09).
const consent = useConsentStore()
</script>

<template>
  <Transition name="page">
    <div v-if="consent.needsChoice" class="fixed inset-x-3 bottom-[68px] z-30 mx-auto flex max-w-[860px] flex-col gap-4 border border-border bg-surface p-5 shadow-pop sm:inset-x-5 sm:bottom-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6" role="dialog" aria-label="Cookie notice" aria-live="polite">
      <p class="flex-1 text-sm leading-relaxed text-body">We use cookies for analytics (Google Analytics via Tag Manager) to see which pages and buttons are used. Analytics only start if you accept. <NuxtLink to="/pages/privacy" class="border-b border-ink text-ink">Privacy</NuxtLink></p>
      <div class="flex gap-3 sm:flex-none">
        <button class="btn-secondary !h-11 flex-1 !px-6 sm:flex-none" data-track="cookie_decline" @click="consent.decline()">Decline</button>
        <button class="btn !h-11 flex-1 !px-6 sm:flex-none" data-track="cookie_accept" @click="consent.accept()">Accept</button>
      </div>
    </div>
  </Transition>
</template>
