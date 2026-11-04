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
const open = ref(0)
const tabs = computed(() => [
  { id: 'description', label: 'Details', body: p.value!.description || p.value!.short_desc },
  { id: 'care', label: 'Fabric & care', body: p.value!.care_notes },
  { id: 'delivery', label: 'Delivery & payment', body: '' }
].filter((t) => t.id === 'delivery' || t.body))
</script>

<template>
  <div v-if="p">
    <nav class="text-[13px] text-muted" aria-label="Breadcrumb">
      <NuxtLink to="/" class="hover:text-ink">Home</NuxtLink>
      <template v-for="(b, i) in p.breadcrumb" :key="b.slug"><span class="px-2">/</span><NuxtLink v-if="i === 0" :to="`/shop/${b.slug}`" class="hover:text-ink">{{ b.name }}</NuxtLink><NuxtLink v-else :to="`/shop/${p.breadcrumb[0].slug}?sub=${b.slug}`" class="hover:text-ink">{{ b.name }}</NuxtLink></template>
      <span class="px-2">/</span><span class="text-ink">{{ p.name }}</span>
    </nav>

    <section class="mt-5 grid gap-8 md:mt-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
      <!-- Gallery: thumb rail + large image -->
      <div class="flex min-w-0 flex-col-reverse gap-3 md:flex-row md:gap-4">
        <div class="flex gap-2.5 overflow-x-auto md:flex-none md:flex-col md:overflow-visible" role="group" aria-label="Product photos">
          <button v-for="(im, i) in gallery" :key="im.url" type="button" class="w-16 flex-none border bg-transparent p-0 transition-colors md:w-[84px]" :class="i === active ? 'border-ink' : 'border-border hover:border-field'" :aria-label="`Photo ${i + 1}`" :aria-pressed="i === active" @click="active = i">
            <StoreTile :src="im.url" :alt="im.alt_text" :tile-key="p.id + i" :category="p.category.name" ratio="84/104" :width="84" :height="104" art-width="60%" />
          </button>
          <button v-if="!gallery.length" type="button" class="w-16 flex-none border border-ink md:w-[84px]" aria-label="Photo 1"><StoreTile :tile-key="p.id" :category="p.category.name" ratio="84/104" art-width="60%" /></button>
        </div>
        <StoreTile :src="gallery[active]?.url" :alt="gallery[active]?.alt_text || p.name" :tile-key="p.id + active" :category="p.category.name" ratio="4/5" :width="720" :height="900" sizes="xs:100vw lg:50vw" eager class="min-w-0 flex-1" art-width="52%">
          <div v-if="!gallery[active]" class="pointer-events-none absolute inset-5 border border-gold/30 md:inset-7" />
          <span v-if="p.tag" class="absolute right-4 top-4 bg-bg px-2.5 py-1.5 text-[10.5px] font-medium uppercase tracking-[0.16em] md:right-7 md:top-7">{{ p.tag }}</span>
        </StoreTile>
      </div>

      <!-- Info -->
      <div class="flex min-w-0 flex-col gap-6 lg:max-w-[560px] lg:gap-[26px]">
        <div class="flex flex-col gap-3">
          <div class="eyebrow">{{ p.category.name }}<template v-if="p.collection"> · {{ p.collection }}</template></div>
          <h1 class="font-display text-[38px] leading-[1.05] md:text-[54px]">{{ p.name }}</h1>
          <div class="flex flex-wrap items-baseline gap-x-3.5 gap-y-1 text-2xl">
            <span class="font-medium">{{ taka(price) }}</span>
            <template v-if="p.discount_pct"><s class="text-base text-muted">{{ taka(p.compare_at_price) }}</s><span class="bg-accent px-2 py-0.5 text-sm font-semibold text-primary-contrast">−{{ p.discount_pct }}%</span></template>
            <span v-if="chosen" class="text-[13px] tracking-[0.06em] text-muted">SKU {{ chosen.sku }}</span>
          </div>
          <p v-if="p.short_desc" class="text-base leading-[1.7] text-body">{{ p.short_desc }}</p>
        </div>
        <div v-if="p.sold_out" class="border border-border bg-cream p-3 text-center text-sm uppercase tracking-[0.16em]">Sold out</div>

        <div v-if="colours.length" role="group" aria-label="Colour" class="flex flex-col gap-3 border-t border-border pt-[22px]">
          <div class="text-xs font-semibold uppercase tracking-[0.18em]">Colour <span class="ml-2 text-[15px] font-normal normal-case tracking-[0.04em] text-body">{{ colour }}</span></div>
          <div class="flex gap-2.5">
            <button v-for="c in colours" :key="c.name" type="button" :title="c.name" :aria-label="c.name" :aria-pressed="colour === c.name" class="flex h-12 w-12 items-center justify-center" @click="colour = c.name">
              <span class="h-[30px] w-[30px] rounded-full transition-shadow" :class="colour === c.name ? 'ring-[1.5px] ring-ink ring-offset-[3px] ring-offset-bg' : 'ring-1 ring-ink/25'" :style="{ backgroundColor: c.hex }" />
            </button>
          </div>
        </div>
        <div v-if="sizes.some((v) => v.size_label)" role="group" aria-label="Size" class="flex flex-col gap-3">
          <div class="flex items-baseline justify-between"><div class="text-xs font-semibold uppercase tracking-[0.18em]">Size</div><NuxtLink to="/size-guide" class="border-b border-ink pb-px text-[13px]">Size chart &amp; calculator</NuxtLink></div>
          <div class="flex flex-wrap gap-2">
            <button v-for="v in sizes" :key="v.id" type="button" :disabled="!v.in_stock" class="chip-size" :aria-pressed="size === v.size_label" @click="size = v.size_label; needSize = false">{{ v.size_label }}</button>
          </div>
        </div>
        <p v-if="availability" class="-mt-2 text-sm" role="status" :class="chosen && !chosen.in_stock ? 'text-accent' : 'text-body'">{{ availability }}</p>

        <div v-if="!p.sold_out" class="flex items-stretch gap-3 max-md:sticky max-md:bottom-[60px] max-md:z-10 max-md:-mx-5 max-md:border-t max-md:border-border max-md:bg-bg max-md:px-5 max-md:py-3">
          <div class="flex h-[54px] items-center border border-field bg-surface" role="group" aria-label="Quantity">
            <button type="button" class="h-full w-12 text-xl" aria-label="Decrease quantity" @click="qty = Math.max(1, qty - 1)">−</button>
            <span class="w-9 text-center text-base" aria-live="polite">{{ qty }}</span>
            <button type="button" class="h-full w-12 text-xl" aria-label="Increase quantity" @click="qty = Math.min(10, qty + 1)">+</button>
          </div>
          <button type="button" class="btn !h-[54px] min-w-0 flex-1 !px-4" :disabled="!!chosen && !chosen.in_stock" data-track="add_to_bag" @click="addToBag">Add to bag</button>
          <StoreWishHeart :product-id="p.id" :slug="p.slug" :label="p.name" class="!h-[54px] !w-[54px] border border-field bg-surface" />
        </div>
        <p v-if="needSize" class="err -mt-2" role="alert">Choose a size first.</p>
        <div v-if="added" class="fade-in flex items-center justify-between gap-3 border-l-[3px] border-gold bg-cream px-[18px] py-4 text-[15px]" role="status"><span>{{ added }}</span><NuxtLink to="/cart" class="whitespace-nowrap border-b border-ink text-xs font-medium uppercase tracking-[0.14em]">View bag</NuxtLink></div>

        <div class="flex flex-col border-t border-border">
          <div v-for="(t, i) in tabs" :key="t.id" class="border-b border-border">
            <button type="button" class="flex min-h-14 w-full items-center justify-between text-left text-[12.5px] font-semibold uppercase tracking-[0.16em]" :aria-expanded="open === i" @click="open = open === i ? -1 : i">{{ t.label }}<span class="text-xl font-light" aria-hidden="true">{{ open === i ? '−' : '+' }}</span></button>
            <div v-if="open === i" class="pb-[22px] text-[15px] leading-[1.7] text-body">
              <template v-if="t.id === 'delivery'">
                <p>Inside Dhaka: {{ taka(s?.delivery_fee_inside_dhaka) }} <span v-if="s?.delivery_time_inside_dhaka">· {{ s.delivery_time_inside_dhaka }}</span></p>
                <p>Outside Dhaka: {{ taka(s?.delivery_fee_outside_dhaka) }} <span v-if="s?.delivery_time_outside_dhaka">· {{ s.delivery_time_outside_dhaka }}</span></p>
              </template>
              <p v-else class="whitespace-pre-line">{{ t.body }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-if="p.related.length" class="pt-16 md:pt-24">
      <div class="mb-8 flex items-end justify-between md:mb-9"><div class="flex flex-col gap-3"><div class="eyebrow">Complete the set</div><h2 class="font-display text-[34px] md:text-[44px]">You may also love</h2></div><NuxtLink :to="`/shop/${p.category.slug}`" class="lnk">View all</NuxtLink></div>
      <div class="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-6"><StoreProductCard v-for="r in p.related" :key="r.id" :product="r" /></div>
    </section>
  </div>
</template>
