<script setup lang="ts">
// Design: Product board. SRS CAT-11 (gallery, variant selectors, live price + availability,
// details tabs, delivery info from Settings, related), CAT-13 (out-of-stock visible but disabled),
// CAT-22 (breadcrumb Home > Category > Sub-category), CRT-02 (Add to bag, quantity 1-10).
import type { ProductDetail, ProductVariant } from '~/types/api'
import { breadcrumbJsonLd, ldScript, productJsonLd, siteOrigin } from '~/utils/seo'

const route = useRoute()
const { api } = useApi()
const { data: p, error } = await useAsyncData(`product-${route.params.slug}`, () => api<ProductDetail>(`/products/${route.params.slug}/`))
if (error.value || !p.value) throw createError({ statusCode: 404, statusMessage: 'Product not found' })
const { data: s } = await useSiteSettings()

const reqUrl = useRequestURL()
const origin = siteOrigin(useRuntimeConfig().public.siteUrl as string, reqUrl.host, reqUrl.protocol.replace(':', ''))
useSeoMeta({
  title: () => p.value?.seo_title || p.value?.name, description: () => p.value?.seo_description || p.value?.short_desc,
  ogTitle: () => p.value?.seo_title || p.value?.name, ogDescription: () => p.value?.seo_description || p.value?.short_desc,
  ogImage: () => (p.value?.image ? origin + p.value.image.url : undefined), ogType: 'website'
})
// §9 SEO: Product and BreadcrumbList structured data
useHead({ script: [
  { type: 'application/ld+json', innerHTML: ldScript(productJsonLd(origin, p.value!)) },
  { type: 'application/ld+json', innerHTML: ldScript(breadcrumbJsonLd(origin, p.value!)) }
] })

const colours = computed(() => {
  const seen = new Map<string, string>()
  for (const v of p.value!.variants) if (v.color_name) seen.set(v.color_name, v.color_hex)
  return [...seen].map(([name, hex]) => ({ name, hex }))
})
const colour = ref(colours.value[0]?.name ?? '')
const size = ref('')
const sizes = computed(() => p.value!.variants.filter((v) => !colour.value || v.color_name === colour.value))
const chosen = computed<ProductVariant | undefined>(() =>
  sizes.value.find((v) => v.size_label === size.value) ?? (sizes.value.length === 1 && !sizes.value[0].size_label ? sizes.value[0] : undefined))
const price = computed(() => chosen.value?.price ?? p.value!.price)
watch(colour, () => { size.value = '' })

// CAT-11: In stock / Only N left / Out of stock
const availability = computed(() => {
  const v = chosen.value
  if (!v) return ''
  if (!v.in_stock) return 'Out of stock'
  return v.low_stock_left ? `Only ${v.low_stock_left} left` : 'In stock'
})
// Gallery: images tagged with the chosen colour come first.
const gallery = computed(() => {
  const imgs = p.value!.images
  const tagged = imgs.filter((i) => i.color && i.color === colour.value)
  return tagged.length ? [...tagged, ...imgs.filter((i) => !tagged.includes(i))] : imgs
})
const active = ref(0)
watch(gallery, () => { active.value = 0 })

const cart = useCartStore()
const qty = ref(1)
const added = ref('')
const needSize = ref(false)
function addToBag() {
  const v = chosen.value
  if (!v) { needSize.value = true; return }
  needSize.value = false
  const status = cart.add({
    variant: v.id, quantity: qty.value, addedAt: Date.now(), name: p.value!.name,
    label: [v.color_name, v.size_label].filter(Boolean).join(' / '), sku: v.sku, price: v.price,
    image: p.value!.images[0]?.url ?? null, slug: p.value!.slug
  }, qty.value)
  added.value = status === 'full' ? 'Your bag is full (30 items). Remove something first.' : `${qty.value} × ${p.value!.name} (${[v.size_label, v.color_name].filter(Boolean).join(', ')}) added to your bag.`
  useTrack().push('add_to_cart', { item: p.value!.slug, value: Number(v.price) * qty.value })
}
onMounted(() => useTrack().push('view_item', { items: [useTrack().item(p.value!)], value: Number(p.value!.price) }))
const tab = ref('description')
const tabs = computed(() => [
  { id: 'description', label: 'Description', body: p.value!.description || p.value!.short_desc },
  { id: 'care', label: 'Fabric & care', body: p.value!.care_notes },
  { id: 'delivery', label: 'Delivery', body: '' }
].filter((t) => t.id === 'delivery' || t.body))
</script>

<template>
  <div v-if="p">
    <nav class="text-sm text-muted" aria-label="Breadcrumb">
      <NuxtLink to="/">Home</NuxtLink>
      <template v-for="(b, i) in p.breadcrumb" :key="b.slug"> / <NuxtLink v-if="i === 0" :to="`/shop/${b.slug}`">{{ b.name }}</NuxtLink><NuxtLink v-else :to="`/shop/${p.breadcrumb[0].slug}?sub=${b.slug}`">{{ b.name }}</NuxtLink></template>
      / <span>{{ p.name }}</span>
    </nav>
    <section class="mt-6 grid gap-10 md:grid-cols-2">
      <div class="flex flex-col-reverse gap-3 md:flex-row">
        <div class="flex gap-2 md:flex-col">
          <button v-for="(im, i) in gallery" :key="im.url" class="border" :class="i === active ? 'border-primary' : 'border-border'" :aria-label="`Photo ${i + 1}`" @click="active = i">
            <NuxtImg format="webp" :src="mediaSrc(im.url)" :alt="im.alt_text" width="64" height="85" class="h-[85px] w-16 object-cover" />
          </button>
        </div>
        <div class="relative flex-1 bg-cream">
          <NuxtImg v-if="gallery[active]" format="webp" :src="mediaSrc(gallery[active].url)" :alt="gallery[active].alt_text || p.name" width="720" height="960" sizes="xs:100vw md:45vw" class="aspect-[3/4] w-full object-cover" loading="eager" />
          <span v-if="p.tag" class="absolute left-3 top-3 bg-primary px-2 py-0.5 text-xs uppercase tracking-widest text-primary-contrast">{{ p.tag }}</span>
        </div>
      </div>
      <div class="flex flex-col gap-4">
        <div class="cap">{{ p.category.name }}<template v-if="p.collection"> · {{ p.collection }}</template></div>
        <h1 class="text-4xl">{{ p.name }}</h1>
        <div class="flex items-baseline gap-3 text-xl">
          <span>{{ taka(price) }}</span>
          <template v-if="p.discount_pct"><s class="text-muted">{{ taka(p.compare_at_price) }}</s><span class="bg-accent px-2 py-0.5 text-sm font-semibold text-primary-contrast">−{{ p.discount_pct }}%</span></template>
          <span v-if="chosen" class="hint">SKU {{ chosen.sku }}</span>
        </div>
        <p v-if="p.short_desc" class="text-muted">{{ p.short_desc }}</p>
        <div v-if="p.sold_out" class="border border-border bg-cream p-3 text-center uppercase tracking-widest">Sold out</div>
        <fieldset v-if="colours.length">
          <legend class="cap">Colour <span class="text-ink normal-case">{{ colour }}</span></legend>
          <div class="mt-2 flex gap-2">
            <button v-for="c in colours" :key="c.name" type="button" :title="c.name" :aria-label="c.name" :aria-pressed="colour === c.name" class="h-9 w-9 border-2" :class="colour === c.name ? 'border-primary' : 'border-border'" :style="{ backgroundColor: c.hex }" @click="colour = c.name" />
          </div>
        </fieldset>
        <fieldset v-if="sizes.some((v) => v.size_label)">
          <legend class="cap">Size <NuxtLink to="/size-guide" class="ml-2 normal-case underline">Size chart &amp; calculator</NuxtLink></legend>
          <div class="mt-2 flex flex-wrap gap-2">
            <button v-for="v in sizes" :key="v.id" type="button" :disabled="!v.in_stock" class="min-h-touch min-w-[56px] border px-3 text-sm disabled:text-muted disabled:line-through" :class="size === v.size_label ? 'border-primary bg-primary text-primary-contrast' : 'border-border'" :aria-pressed="size === v.size_label" @click="size = v.size_label">{{ v.size_label }}</button>
          </div>
        </fieldset>
        <p v-if="availability" class="text-sm" role="status" :class="chosen && !chosen.in_stock ? 'text-accent' : ''">{{ availability }}</p>
        <div v-if="!p.sold_out" class="flex flex-wrap items-center gap-3">
          <div class="flex items-center border border-border" role="group" aria-label="Quantity">
            <button type="button" class="min-h-touch min-w-touch" aria-label="Decrease quantity" @click="qty = Math.max(1, qty - 1)">−</button>
            <span class="min-w-8 text-center" aria-live="polite">{{ qty }}</span>
            <button type="button" class="min-h-touch min-w-touch" aria-label="Increase quantity" @click="qty = Math.min(10, qty + 1)">+</button>
          </div>
          <StoreWishHeart :product-id="p.id" :slug="p.slug" :label="p.name" />
          <button type="button" class="btn flex-1" :disabled="!!chosen && !chosen.in_stock" data-track="add_to_bag" @click="addToBag">Add to bag</button>
        </div>
        <p v-if="needSize" class="err" role="alert">Choose a size first.</p>
        <p v-if="added" class="text-sm" role="status">{{ added }} <NuxtLink to="/cart" class="underline">View bag</NuxtLink></p>
        <div class="mt-4 border-t border-border">
          <div class="flex gap-5" role="tablist"><button v-for="t in tabs" :key="t.id" class="tab" :aria-pressed="tab === t.id" @click="tab = t.id">{{ t.label }}</button></div>
          <div class="py-4 text-sm leading-relaxed">
            <template v-if="tab === 'delivery'">
              <p>Inside Dhaka: {{ taka(s?.delivery_fee_inside_dhaka) }} <span v-if="s?.delivery_time_inside_dhaka">· {{ s.delivery_time_inside_dhaka }}</span></p>
              <p>Outside Dhaka: {{ taka(s?.delivery_fee_outside_dhaka) }} <span v-if="s?.delivery_time_outside_dhaka">· {{ s.delivery_time_outside_dhaka }}</span></p>
            </template>
            <p v-else class="whitespace-pre-line">{{ tabs.find((t) => t.id === tab)?.body }}</p>
          </div>
        </div>
      </div>
    </section>
    <section v-if="p.related.length" class="mt-16">
      <div class="cap">Complete the set</div><h2 class="mb-4 text-3xl">You may also love</h2>
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4"><StoreProductCard v-for="r in p.related" :key="r.id" :product="r" /></div>
    </section>
  </div>
</template>
