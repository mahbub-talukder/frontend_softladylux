<script setup lang="ts">
// Wishlist for everyone. SRS ACC-07 (+ owner decision): guests keep the list in localStorage and see
// it here; at login or registration the stored list is merged into the account (customer store).
import type { CardProduct, Paged } from '~/types/api'

useSeoMeta({ title: 'Wishlist', robots: 'noindex' })
definePageMeta({ layout: 'bleed' })
const customer = useCustomerStore()
const { api } = useApi()
const items = ref<CardProduct[]>([])
const loading = ref(true)

async function load() {
  const ids = customer.wishIds
  if (!ids.length) { items.value = []; loading.value = false; return }
  try {
    // Signed in: the account list; guest: the product ids kept in this browser
    items.value = customer.me
      ? await api<CardProduct[]>('/me/wishlist/')
      : (await api<Paged<CardProduct>>('/products/', { query: { ids: ids.join(','), page_size: 60 } })).results
  } catch { items.value = [] } finally { loading.value = false }
}
onMounted(async () => {
  if (!customer.wishReady) await (customer.loaded ? customer.loadGuestWishlist() : customer.fetchMe())
  await load()
})
// A removal updates the list at once, without another request
watch(() => customer.wishIds.length, () => { items.value = items.value.filter((p) => customer.wishIds.includes(p.id)) })
</script>

<template>
  <div>
    <StorePageBand eyebrow="Saved for later" title="My wishlist" />
    <section class="wrap pb-16 pt-8 md:pb-24 md:pt-12">
      <p v-if="!customer.me && items.length" class="mb-8 flex flex-wrap items-center justify-between gap-3 border-l-[3px] border-gold bg-cream px-5 py-4 text-[15px]">
        <span>Saved on this device. Log in or create an account to keep your wishlist on every device.</span>
        <NuxtLink to="/login?next=/wishlist" class="lnk">Log in</NuxtLink>
      </p>
      <div v-if="loading" class="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-6" aria-busy="true"><div v-for="n in 4" :key="n" class="skeleton aspect-[4/5]" /></div>
      <div v-else-if="!items.length" class="flex flex-col items-center gap-3.5 bg-cream px-5 py-20 text-center">
        <h2 class="font-display text-[28px] md:text-[34px]">Your wishlist is empty</h2><p class="text-body">Tap the heart on any product to save it here.</p>
        <NuxtLink to="/shop/new" class="btn">Browse new arrivals</NuxtLink>
      </div>
      <div v-else class="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-6 md:gap-y-10 lg:grid-cols-4">
        <div v-for="p in items" :key="p.id"><StoreProductCard :product="p" /><button class="mt-2 min-h-11 border-b border-ink text-xs font-medium uppercase tracking-[0.14em]" @click="customer.toggleWish(p.id, p.slug)">Remove</button></div>
      </div>
    </section>
  </div>
</template>
