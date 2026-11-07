<script setup lang="ts">
// SRS ADM-07: loading state for every admin request. A slim indeterminate bar at the top of the viewport
// shows while any /admin/ API call or route change is in flight; a small "Working…" pill appears if it
// takes longer than a moment. Delayed show (no flicker on fast calls) and a minimum visible time.
const ui = useAdminUi()
const { isLoading } = useLoadingIndicator()
const busy = computed(() => ui.pending > 0 || isLoading.value)

const SHOW_AFTER = 150
const MIN_VISIBLE = 300
const SLOW_AFTER = 900
const show = ref(false)
const slow = ref(false)
let showTimer: ReturnType<typeof setTimeout> | undefined
let hideTimer: ReturnType<typeof setTimeout> | undefined
let slowTimer: ReturnType<typeof setTimeout> | undefined
let shownAt = 0

function clear() { clearTimeout(showTimer); clearTimeout(hideTimer); clearTimeout(slowTimer) }

watch(busy, (b) => {
  if (b) {
    clearTimeout(hideTimer)
    if (show.value) return
    clearTimeout(showTimer)
    showTimer = setTimeout(() => {
      show.value = true
      shownAt = Date.now()
      slowTimer = setTimeout(() => { slow.value = true }, SLOW_AFTER - SHOW_AFTER)
    }, SHOW_AFTER)
  } else {
    clearTimeout(showTimer)
    clearTimeout(slowTimer)
    if (!show.value) return
    hideTimer = setTimeout(() => { show.value = false; slow.value = false }, Math.max(0, MIN_VISIBLE - (Date.now() - shownAt)))
  }
})
onBeforeUnmount(clear)
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 top-0 z-[60]" aria-hidden="true">
    <Transition name="loader-fade">
      <div v-if="show" class="admin-loader-bar h-[3px] w-full overflow-hidden bg-primary/10">
        <div class="admin-loader-run h-full w-2/5 bg-accent" />
      </div>
    </Transition>
  </div>
  <div class="pointer-events-none fixed bottom-4 left-4 z-[60]" role="status" aria-live="polite">
    <Transition name="loader-fade">
      <div v-if="show && slow" class="flex items-center gap-2.5 border border-border bg-surface px-3.5 py-2 text-[13px] text-ink shadow-pop">
        <span class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        Working…
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.admin-loader-run { animation: admin-loader-slide 1.1s ease-in-out infinite; }
@keyframes admin-loader-slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }
.loader-fade-enter-active, .loader-fade-leave-active { transition: opacity 0.2s ease; }
.loader-fade-enter-from, .loader-fade-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) { .admin-loader-run { animation: none; width: 100%; opacity: 0.6; } }
</style>
