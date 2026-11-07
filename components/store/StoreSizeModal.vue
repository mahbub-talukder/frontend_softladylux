<script setup lang="ts">
// SRS CAT-08 / STF: size chart + calculator in a dialog on the product page, so the shopper never leaves it.
// Esc, backdrop click and the close button dismiss it; focus moves in and returns to the trigger; page scroll is locked.
const emit = defineEmits<{ close: [] }>()
const panel = ref<HTMLElement | null>(null)
const closeBtn = ref<HTMLButtonElement | null>(null)
let opener: HTMLElement | null = null

function focusables() {
  return Array.from(panel.value?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])') ?? [])
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') { e.stopPropagation(); emit('close'); return }
  if (e.key !== 'Tab') return
  const f = focusables()
  if (!f.length) return
  const first = f[0]!, last = f[f.length - 1]!
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
}
onMounted(() => {
  opener = document.activeElement as HTMLElement | null
  document.documentElement.style.overflow = 'hidden'
  closeBtn.value?.focus()
})
onBeforeUnmount(() => {
  document.documentElement.style.overflow = ''
  opener?.focus?.()
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[70] flex items-end justify-center bg-dark/60 sm:items-center sm:p-6" @mousedown.self="emit('close')" @keydown="onKey">
      <div ref="panel" role="dialog" aria-modal="true" aria-labelledby="size-modal-title" class="flex max-h-[92vh] w-full max-w-[960px] flex-col overflow-hidden rounded-t-[20px] bg-bg shadow-pop sm:max-h-[88vh] sm:rounded-[20px]">
        <div class="flex items-center justify-between gap-4 border-b border-border px-5 py-3 md:px-8">
          <h2 id="size-modal-title" class="font-display text-h3 md:text-h3-lg">Size chart &amp; calculator</h2>
          <button ref="closeBtn" type="button" class="flex h-11 w-11 items-center justify-center rounded-full hover:bg-cream" aria-label="Close size chart" @click="emit('close')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div class="overflow-y-auto overscroll-contain px-5 py-6 md:px-8"><Suspense><StoreSizeGuide modal @shop="emit('close')" /><template #fallback><p class="py-10 text-center text-sm text-muted" role="status">Loading size chart…</p></template></Suspense></div>
      </div>
    </div>
  </Teleport>
</template>
