<script setup lang="ts">
// Shared modal dialog shell (size chart CAT-08, promotional popup WEB-11). Esc, backdrop click and the caller's close
// button dismiss it; focus moves in (to [data-autofocus], else the first focusable) and is trapped, then returns to the
// opener; page scroll is locked while open. The caller supplies the panel content, its classes and the title id.
const props = withDefaults(defineProps<{ labelledby: string; panelClass?: string; overlayClass?: string }>(), {
  panelClass: '', overlayClass: 'items-end sm:items-center sm:p-6'
})
const emit = defineEmits<{ close: [] }>()
const panel = ref<HTMLElement | null>(null)
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
  ;(panel.value?.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0])?.focus()
})
onBeforeUnmount(() => {
  document.documentElement.style.overflow = ''
  opener?.focus?.()
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[70] flex justify-center bg-dark/60" :class="props.overlayClass" @mousedown.self="emit('close')" @keydown="onKey">
      <div ref="panel" role="dialog" aria-modal="true" :aria-labelledby="labelledby" :class="panelClass">
        <slot />
      </div>
    </div>
  </Teleport>
</template>
