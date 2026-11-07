<script setup lang="ts">
// Owner request: a small cart widget fixed on the middle-right edge showing the bag icon, item count and the
// running total in BDT (SRS CRT-01..CRT-03). The × hides it completely, with no tab or icon left behind; it is brought
// back only from the /cart page (useFloatingCart). Hidden on the cart, checkout and order pages anyway.
// Colours come from theme tokens (THM-05).
const cart = useCartStore()
const route = useRoute()
const float = useFloatingCart()
const onCartPage = computed(() => /^\/(cart|checkout|order)/.test(route.path))
onMounted(() => float.load())
const itemsLabel = computed(() => `${cart.count} ${cart.count === 1 ? 'item' : 'items'}`)
</script>

<template>
  <Transition enter-active-class="transition duration-200 ease-out" leave-active-class="transition duration-150 ease-in" enter-from-class="translate-x-full opacity-0" leave-to-class="translate-x-full opacity-0">
    <div v-if="!onCartPage && float.ready.value && !float.hidden.value" class="fixed right-0 top-1/2 z-40 -translate-y-1/2">
      <NuxtLink
        to="/cart" data-track="floating_cart"
        class="flex w-[64px] flex-col items-center overflow-hidden rounded-l-2xl bg-primary text-primary-contrast shadow-pop transition-transform duration-200 hover:-translate-x-0.5 focus-visible:-translate-x-0.5 sm:w-[76px]"
        :aria-label="`Shopping bag, ${itemsLabel}, total ${taka(cart.localSubtotal)}. Open bag`"
      >
        <span class="flex w-full flex-col items-center gap-1 px-2 pb-1.5 pt-3.5">
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-contrast/15">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 8h14l-1 12H6z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></svg>
          </span>
          <span class="whitespace-nowrap text-xs font-semibold leading-none" aria-hidden="true">{{ cart.count }} {{ cart.count === 1 ? 'Item' : 'Items' }}</span>
        </span>
        <span class="w-full bg-bg px-1 py-1.5 text-center text-xs font-semibold leading-none text-primary" aria-hidden="true">{{ taka(cart.localSubtotal) }}</span>
      </NuxtLink>
      <button type="button" class="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full text-primary-contrast/80 hover:bg-primary-contrast/20 hover:text-primary-contrast" aria-label="Hide bag widget" title="Hide" data-track="floating_cart_hide" @click="float.hide()">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
  </Transition>
</template>
