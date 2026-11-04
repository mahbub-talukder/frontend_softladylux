<script setup lang="ts">
// Design: Main + MobileHome boards. Fixed layout (SRS WEB-06): hero, trust strip, category carousel,
// New arrivals, Signature collection, Offers tabs, Video gallery, Size-finder band. Each block shows
// only when it has content; New / Signature / Offers fill from product flags (CAT-07).
definePageMeta({ layout: 'bleed' })
const { data: home } = await useHome()
const { data: s } = await useSiteSettings()
useSeoMeta({
  title: () => s.value?.seo_title || s.value?.company_name || 'SoftLadyLux',
  description: () => s.value?.seo_description || s.value?.tagline || ''
})
const banner = (p: string) => home.value?.banners.find((b) => b.placement === p)

// ---- category carousel (6 tiles in view, arrows scroll one tile)
const rail = ref<HTMLElement | null>(null)
const canPrev = ref(false)
const canNext = ref(true)
function measure() {
  const el = rail.value
  if (!el) return
  canPrev.value = el.scrollLeft > 4
  canNext.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
}
function scrollRail(d: number) { rail.value?.scrollBy({ left: d * ((rail.value.firstElementChild as HTMLElement | null)?.clientWidth ?? 200 + 20), behavior: 'smooth' }) }
onMounted(() => { measure(); window.addEventListener('resize', measure) })
onBeforeUnmount(() => window.removeEventListener('resize', measure))

// ---- offers & favourites tabs (SRS has no "Best seller"/"Hot deal" flag: Offers and Signature)
const tab = ref<'offers' | 'favourites'>('offers')
const tabItems = computed(() => (tab.value === 'offers' ? home.value?.offers : home.value?.signature) ?? [])
const tabs = computed(() => [{ id: 'offers' as const, label: 'Special offer', n: home.value?.offers.length ?? 0 }, { id: 'favourites' as const, label: 'Our favourites', n: home.value?.signature.length ?? 0 }].filter((t) => t.n))
watchEffect(() => { if (tabs.value.length && !tabs.value.some((t) => t.id === tab.value)) tab.value = tabs.value[0].id })

// ---- video gallery
const vi = ref(0)
const video = computed(() => home.value?.videos[vi.value])
const sig = computed(() => home.value?.signature ?? [])
const sigLead = computed(() => sig.value[0])
</script>

<template>
  <div>
    <StoreHomeHero :slides="home?.carousel ?? []" />

    <section v-if="home?.trust.length" class="border-b border-border bg-bg" aria-label="Why shop with us">
      <div class="wrap grid grid-cols-2 lg:grid-cols-4">
        <div v-for="t in home.trust.slice(0, 4)" :key="t.id" class="flex flex-col gap-1 border-l border-border px-4 py-5 md:px-6 md:py-[26px]">
          <div class="text-xs font-medium uppercase tracking-[0.16em]">{{ t.title }}</div><div class="text-sm text-muted">{{ t.text }}</div>
        </div>
      </div>
    </section>

    <section v-if="home?.categories.length" class="wrap section pb-6">
      <StoreSection eyebrow="Shop by category" title="The wardrobe, edited">
        <div class="hidden gap-2.5 md:flex"><button class="arrow-btn" aria-label="Previous categories" :disabled="!canPrev" @click="scrollRail(-1)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg></button><button class="arrow-btn" aria-label="Next categories" :disabled="!canNext" @click="scrollRail(1)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg></button></div>
      </StoreSection>
      <ul ref="rail" class="-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-5 pb-2 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden" @scroll.passive="measure">
        <li v-for="(c, k) in home.categories" :key="c.slug" class="w-[44%] shrink-0 snap-start sm:w-[30%] lg:w-[calc((100%-100px)/6)]">
          <NuxtLink :to="`/shop/${c.slug}`" class="group flex flex-col gap-3.5 transition-transform duration-500 hover:-translate-y-1" data-track="home_category_tile">
            <StoreTile :src="c.tile?.url" :alt="c.tile?.alt_text || c.name" ratio="4/5" :tile-key="k" :category="c.slug" :width="400" :height="500" art-width="62%" />
            <div class="flex items-baseline justify-between"><h3 class="text-[22px] md:text-2xl">{{ c.name }}</h3><span class="lnk !text-[10.5px]">Shop</span></div>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <section v-if="home?.banners.length" class="wrap section pb-6 pt-6 md:pt-12">
      <div class="grid gap-4 md:grid-cols-2 md:gap-6">
        <template v-for="p in ['home_promo', 'home_offer']" :key="p">
          <NuxtLink v-if="banner(p)?.media" :to="banner(p)?.link || '/'" class="group relative block overflow-hidden" data-track="home_banner">
            <StoreTile :src="banner(p)!.media!.url" :alt="banner(p)!.media!.alt_text" ratio="2/1" tint="bg-tile-5" :width="800" :height="400" art-width="22%" category="gift-sets" />
            <div class="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-dark/55 to-transparent p-6 text-on-dark md:p-8"><h3 class="text-[28px] md:text-4xl">{{ banner(p)!.heading }}</h3><p class="text-[15px] text-on-dark/90">{{ banner(p)!.text }}</p></div>
          </NuxtLink>
        </template>
      </div>
    </section>

    <section v-if="home?.new_arrivals.length" class="wrap section pb-6">
      <StoreSection eyebrow="Just landed" title="New arrivals"><NuxtLink to="/shop/new" class="lnk">View all</NuxtLink></StoreSection>
      <div class="grid grid-cols-2 gap-x-4 gap-y-9 lg:grid-cols-4 lg:gap-6"><StoreProductCard v-for="p in home.new_arrivals.slice(0, 4)" :key="p.id" :product="p" /></div>
    </section>

    <section v-if="sigLead" class="wrap section pb-6">
      <div class="grid items-stretch gap-8 lg:grid-cols-[5fr_7fr] lg:gap-10">
        <div class="relative flex min-h-[420px] flex-col justify-between bg-tile-2 p-8 md:min-h-[620px] md:px-12 md:py-14">
          <div class="flex flex-col gap-[18px]">
            <div class="eyebrow !text-rose-deep">Signature collection</div>
            <h2 class="text-[40px] leading-[1.05] md:text-[54px]">{{ sigLead.collection || 'Signature' }}</h2>
            <p class="max-w-[340px] text-base leading-[1.7] text-body">{{ sigLead.short_desc || 'Our most-loved pieces, finished with care.' }}</p>
          </div>
          <div class="w-[58%] self-center text-rose-deep" aria-hidden="true"><StoreArt kind="set" /></div>
          <NuxtLink to="/shop/new" class="btn self-start" data-track="home_signature">Explore the collection</NuxtLink>
        </div>
        <div class="grid grid-cols-2 content-center gap-x-4 gap-y-9 md:grid-cols-3 lg:gap-6"><StoreProductCard v-for="p in sig.slice(0, 3)" :key="p.id" :product="p" /></div>
      </div>
    </section>

    <section v-if="tabs.length" class="wrap section pb-6">
      <StoreSection eyebrow="Curated for you" title="Offers & favourites" center />
      <div class="mb-10 flex flex-wrap justify-center gap-10 border-b border-border" role="tablist">
        <button v-for="t in tabs" :key="t.id" role="tab" :aria-selected="tab === t.id" class="-mb-px min-h-11 border-b-2 pb-4 text-xs font-medium uppercase tracking-[0.18em] transition-colors" :class="tab === t.id ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'" @click="tab = t.id">{{ t.label }}</button>
      </div>
      <Transition mode="out-in" enter-active-class="transition duration-300" leave-active-class="transition duration-150" enter-from-class="opacity-0" leave-to-class="opacity-0">
        <div :key="tab" class="grid grid-cols-2 gap-x-4 gap-y-9 lg:grid-cols-4 lg:gap-6"><StoreProductCard v-for="p in tabItems.slice(0, 4)" :key="p.id" :product="p" /></div>
      </Transition>
    </section>

    <section v-if="video" class="wrap section pb-6">
      <StoreSection eyebrow="Watch" title="Video gallery" />
      <div class="grid gap-8 lg:grid-cols-[8fr_4fr]">
        <div class="flex flex-col gap-3.5">
          <!-- Links out instead of embedding, so nothing from Google/Facebook loads before cookie consent -->
          <a :href="video.url" target="_blank" rel="noopener" class="group relative flex aspect-video items-center justify-center overflow-hidden bg-tile-video" :aria-label="`Watch ${video.title}`" data-track="video_open">
            <NuxtImg v-if="video.thumbnail" format="webp" :src="mediaSrc(video.thumbnail.url)" :alt="video.thumbnail.alt_text" width="1000" height="563" class="absolute inset-0 h-full w-full object-cover transition-transform duration-[600ms] group-hover:scale-[1.03]" />
            <span class="pointer-events-none absolute inset-5 border border-champagne/25" />
            <span class="relative flex h-[84px] w-[84px] items-center justify-center rounded-full border border-champagne text-on-dark transition-colors duration-300 group-hover:bg-champagne group-hover:text-ink"><svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg></span>
          </a>
          <h3 class="text-[26px] md:text-[28px]">{{ video.title }}</h3>
        </div>
        <ul class="flex flex-col border-t border-border">
          <li v-for="(v, k) in home!.videos" :key="v.id"><button class="flex w-full items-center gap-4 border-b border-border py-4 text-left transition-colors duration-200 hover:bg-cream/60" :class="k === vi ? 'bg-cream' : ''" :aria-current="k === vi" @click="vi = k"><span class="flex aspect-video w-28 shrink-0 items-center justify-center bg-tile-6 text-gold"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg></span><span class="font-display text-[21px] leading-[1.2]">{{ v.title }}</span></button></li>
        </ul>
      </div>
    </section>

    <section class="mt-12 bg-dark text-on-dark md:mt-24">
      <div class="wrap grid items-center gap-10 py-16 md:grid-cols-2 md:gap-[60px] md:py-20">
        <div class="flex flex-col gap-[18px]"><div class="eyebrow !text-champagne">Fit guidance</div><h2 class="text-[38px] leading-[1.05] md:text-[52px]">Find the size that feels like yours</h2><p class="max-w-[460px] text-base leading-[1.7] text-text-dark">Enter two measurements and our calculator suggests your band and cup size, with a full size chart alongside.</p></div>
        <div class="flex flex-col items-start gap-3.5">
          <ol class="grid w-full grid-cols-1 border-t border-line-dark-2 sm:grid-cols-3">
            <li v-for="(t, k) in ['Measure under the bust', 'Measure the fullest part', 'Get your recommended size']" :key="t" class="border-line-dark-2 py-5 sm:px-5 sm:first:pl-0" :class="k ? 'sm:border-l' : ''"><div class="font-display text-[40px] text-champagne">0{{ k + 1 }}</div><div class="text-sm text-text-dark">{{ t }}</div></li>
          </ol>
          <NuxtLink to="/size-guide" class="btn btn-light" data-track="home_size_finder">Open size calculator</NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
