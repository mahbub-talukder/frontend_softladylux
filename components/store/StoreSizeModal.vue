<script setup lang="ts">
// SRS CAT-08 / STF: size chart + calculator in a dialog on the product page, so the shopper never leaves it.
// Dialog behaviour (Esc, backdrop, focus trap and return, scroll lock) comes from StoreDialog.
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <StoreDialog labelledby="size-modal-title" panel-class="flex max-h-[92vh] w-full max-w-[960px] flex-col overflow-hidden rounded-t-[20px] bg-bg shadow-pop sm:max-h-[88vh] sm:rounded-[20px]" @close="emit('close')">
    <div class="flex items-center justify-between gap-4 border-b border-border px-5 py-3 md:px-8">
      <h2 id="size-modal-title" class="font-display text-h3 md:text-h3-lg">Size chart &amp; calculator</h2>
      <button type="button" class="flex h-11 w-11 items-center justify-center rounded-full hover:bg-cream" aria-label="Close size chart" data-autofocus @click="emit('close')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
    <div class="overflow-y-auto overscroll-contain px-5 py-6 md:px-8"><Suspense><StoreSizeGuide modal @shop="emit('close')" /><template #fallback><p class="py-10 text-center text-sm text-muted" role="status">Loading size chart…</p></template></Suspense></div>
  </StoreDialog>
</template>
