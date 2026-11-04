<script setup lang="ts">
// Design: ProductCard heart. 44px target, ink outline; filled in the accent when saved. ACC-07.
const props = defineProps<{ productId: number; slug?: string; label?: string }>()
const c = useCustomerStore()
const on = computed(() => c.isWished(props.productId))
</script>

<template>
  <button type="button" class="flex h-11 w-11 items-center justify-center text-ink transition-transform duration-200 hover:scale-110" :aria-pressed="on" :aria-label="on ? `Remove ${label || 'item'} from wishlist` : `Add ${label || 'item'} to wishlist`" data-track="wishlist_toggle" @click.prevent="c.toggleWish(productId, slug)">
    <svg width="22" height="22" viewBox="0 0 24 24" :fill="on ? 'var(--color-accent)' : 'none'" :stroke="on ? 'var(--color-accent)' : 'currentColor'" stroke-width="1.5" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.2-9.4C1.7 7.7 3.7 4.5 7 4.5c2 0 3.7 1.1 5 3 1.3-1.9 3-3 5-3 3.3 0 5.3 3.2 4.2 6.6C19.5 15.9 12 20.5 12 20.5z" /></svg>
  </button>
</template>
