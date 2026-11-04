<script setup lang="ts">
// CAT-12 Quick Add: one tap adds the default variant; with several sizes an inline picker opens first.
import type { CardProduct } from '~/types/api'
import type { CartLine } from '~/utils/cart'

const props = defineProps<{ product: CardProduct }>()
const cart = useCartStore()
const picking = ref(false)
const message = ref('')
const options = computed(() => props.product.variants.filter((v) => v.in_stock))
const sizes = computed(() => [...new Set(options.value.map((v) => v.size_label))])

function lineFor(v: CardProduct['variants'][number]): CartLine {
  const p = props.product
  return { variant: v.id, quantity: 1, addedAt: Date.now(), name: p.name, label: [v.color_name, v.size_label].filter(Boolean).join(' / '), sku: '', price: p.price, image: p.image?.url ?? null, slug: p.slug }
}
function add(v: CardProduct['variants'][number]) {
  const s = cart.add(lineFor(v), 1)
  message.value = s === 'full' ? 'Your bag is full (30 items).' : 'Added to your bag'
  picking.value = false
  setTimeout(() => { message.value = '' }, 2500)
  if (s !== 'full') useTrack().push('add_to_cart', { item: props.product.slug })
}
function tap() {
  if (!options.value.length) return
  if (sizes.value.length <= 1) add(options.value[0])
  else picking.value = !picking.value
}
</script>

<template>
  <div v-if="!product.sold_out" class="absolute bottom-2 right-2">
    <button type="button" class="flex h-10 w-10 items-center justify-center border border-primary bg-surface text-xl" :aria-label="`Quick add ${product.name} to bag`" data-track="quick_add" @click="tap">+</button>
    <div v-if="picking" class="absolute bottom-12 right-0 z-10 w-44 border border-border bg-surface p-2 shadow-sm" role="group" aria-label="Select size">
      <div class="cap mb-1">Select size</div>
      <div class="flex flex-wrap gap-1">
        <button v-for="z in sizes" :key="z" type="button" class="min-h-touch min-w-touch border border-border px-2 text-sm hover:border-primary" @click="add(options.find((o) => o.size_label === z)!)">{{ z }}</button>
      </div>
    </div>
    <p v-if="message" class="absolute bottom-12 right-0 whitespace-nowrap bg-surface px-2 py-1 text-sm" role="status">{{ message }}</p>
  </div>
</template>
