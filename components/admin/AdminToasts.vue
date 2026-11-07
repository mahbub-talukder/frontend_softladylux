<script setup lang="ts">
// SRS UI-06 / ADM-07: success and error feedback after every admin action. Top-right stack on desktop,
// full-width at the top on phones. Errors use role=alert, successes role=status. Auto-dismiss (errors stay
// longer), pause while hovered or focused, identical toasts are merged by the store.
const ui = useAdminUi()
const DURATION = { success: 4000, info: 5000, error: 9000 } as const
const timers = new Map<number, ReturnType<typeof setTimeout>>()
const armedStamp = new Map<number, number>()
const paused = ref(false)

function arm(id: number, stamp: number, ms: number) {
  clearTimeout(timers.get(id))
  armedStamp.set(id, stamp)
  timers.set(id, setTimeout(() => { ui.dismiss(id); timers.delete(id); armedStamp.delete(id) }, ms))
}
// Arms every toast that has no timer yet (new, re-raised with a new stamp, or left over after a remount).
function armMissing() {
  const live = new Set(ui.toasts.map((t) => t.id))
  for (const id of [...armedStamp.keys()]) if (!live.has(id)) { clearTimeout(timers.get(id)); timers.delete(id); armedStamp.delete(id) }
  for (const t of ui.toasts) if (armedStamp.get(t.id) !== t.stamp) arm(t.id, t.stamp, DURATION[t.kind])
}
function pause() { paused.value = true; timers.forEach((t) => clearTimeout(t)); timers.clear(); armedStamp.clear() }
function resume() { paused.value = false; armMissing() }

watch(() => ui.toasts.map((t) => `${t.id}:${t.stamp}`).join(','), () => { if (!paused.value) armMissing() }, { immediate: true })
onBeforeUnmount(() => timers.forEach((t) => clearTimeout(t)))

const icon = { success: '✓', error: '!', info: 'i' } as const
</script>

<template>
  <div class="pointer-events-none fixed inset-x-3 top-3 z-[70] flex flex-col items-stretch gap-2 sm:left-auto sm:right-4 sm:top-4 sm:w-[380px]" @mouseenter="pause" @mouseleave="resume" @focusin="pause" @focusout="resume">
    <TransitionGroup name="toast">
      <div
        v-for="t in ui.toasts"
        :key="t.id"
        class="pointer-events-auto flex items-start gap-3 border bg-surface p-3.5 shadow-pop"
        :class="t.kind === 'error' ? 'border-accent' : t.kind === 'success' ? 'border-primary' : 'border-border'"
        :role="t.kind === 'error' ? 'alert' : 'status'"
      >
        <span
          class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-[12px] font-semibold"
          :class="t.kind === 'error' ? 'bg-accent text-primary-contrast' : t.kind === 'success' ? 'bg-primary text-primary-contrast' : 'bg-cream text-ink'"
          aria-hidden="true"
        >{{ icon[t.kind] }}</span>
        <div class="min-w-0 flex-1">
          <p class="text-[14px] font-medium leading-snug text-ink">{{ t.title }}</p>
          <ul v-if="t.lines.length" class="mt-1 list-disc space-y-0.5 pl-4 text-[13px] text-muted">
            <li v-for="(l, i) in t.lines" :key="i" class="break-words">{{ l }}</li>
          </ul>
        </div>
        <button class="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center text-lg leading-none text-muted hover:text-ink" aria-label="Dismiss notification" @click="ui.dismiss(t.id)">×</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-8px); }
.toast-move { transition: transform 0.2s ease; }
</style>
