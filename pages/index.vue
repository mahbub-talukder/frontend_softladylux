<script setup lang="ts">
import type { CardProduct, Media } from '~/types/api'
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
// Home promo / offer banners show the whole uploaded picture (v1.6): the box takes the image's own proportions instead
// of a fixed 2:1 crop, and the resize keeps that shape. 2:1 is only the fallback when the size is unknown.
const shape = (m: Media) => (m.width && m.height ? { ratio: `${m.width}/${m.height}`, height: Math.round((800 * m.height) / m.width) } : { ratio: '2/1', height: 400 })

// ---- offers & favourites tabs: Special offer · Best seller (CAT-23, v1.6) · Our favourites (Signature flag)
const sizeFinder = useSizeFinder()
type TabId = 'offers' | 'bestsellers' | 'favourites'
const tab = ref<TabId>('offers')
const TAB_DATA: Record<TabId, () => CardProduct[]> = {
  offers: () => home.value?.offers ?? [], bestsellers: () => home.value?.bestsellers ?? [], favourites: () => home.value?.signature ?? []
}
const tabItems = computed(() => TAB_DATA[tab.value]())
const tabs = computed(() => ([['offers', 'Special offer'], ['bestsellers', 'Best seller'], ['favourites', 'Our favourites']] as [TabId, string][])
  .map(([id, label]) => ({ id, label, n: TAB_DATA[id]().length })).filter((t) => t.n))
watchEffect(() => { if (tabs.value.length && !tabs.value.some((t) => t.id === tab.value)) tab.value = tabs.value[0].id })

const sig = computed(() => home.value?.signature ?? [])
const sigLead = computed(() => sig.value[0] as (CardProduct & { collection?: string; short_desc?: string }) | undefined)
const sigBanner = computed(() => home.value?.signature_banner ?? null) // WEB-02 (v1.6): admin-managed panel image
</script>

<template>
  <div>
    <StoreHomeHero :slides="home?.carousel ?? []" />
    <!-- WEB-11 (v1.6): promotional popup once per full page load (not on in-app returns to home); renders nothing on the server -->
    <StorePromoModal v-if="home?.popup" :popup="home.popup" />

    <section v-if="home?.trust.length" class="border-b border-border bg-bg" aria-label="Why shop with us">
      <div class="wrap grid grid-cols-2 lg:grid-cols-4">
        <div v-for="t in home.trust.slice(0, 4)" :key="t.id" class="flex flex-col gap-1 border-l border-border px-4 py-5 md:px-6 md:py-[26px]">
          <div class="text-xs font-medium uppercase tracking-[0.16em]">{{ t.title }}</div><div class="text-sm text-muted">{{ t.text }}</div>
        </div>
      </div>
    </section>

    <section v-if="home?.categories.length" class="wrap section pb-6">
      <StoreCategoryCarousel :categories="home.categories" />
    </section>

    <section v-if="home?.banners.length" class="wrap section pb-6 pt-6 md:pt-12">
      <div class="grid items-start gap-4 md:grid-cols-2 md:gap-6">
        <template v-for="p in ['home_promo', 'home_offer']" :key="p">
          <NuxtLink v-if="banner(p)?.media" :to="banner(p)?.link || '/'" class="group relative block overflow-hidden" data-track="home_banner">
            <StoreTile :src="banner(p)!.media!.url" :alt="banner(p)!.media!.alt_text" :ratio="shape(banner(p)!.media!).ratio" tint="bg-tile-5" :width="800" :height="shape(banner(p)!.media!).height" sizes="100vw md:50vw lg:640px" art-width="22%" category="gift-sets" />
            <div class="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-dark/55 to-transparent p-6 text-on-dark md:p-8"><h3 class="text-h3 md:text-h2-lg">{{ banner(p)!.heading }}</h3><p class="text-[15px] text-on-dark/90">{{ banner(p)!.text }}</p></div>
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
        <!-- WEB-02 (v1.6): the uploaded Signature banner fills the panel with its text over a soft shade -->
        <NuxtLink v-if="sigBanner?.media" :to="sigBanner.link || '/shop/new'" class="group relative flex min-h-[420px] flex-col justify-end overflow-hidden bg-tile-2 md:min-h-[620px]" data-track="home_signature">
          <NuxtImg format="webp" :src="mediaSrc(sigBanner.media.url)" :alt="sigBanner.media.alt_text" width="800" height="1000" sizes="100vw lg:540px" loading="lazy" class="media-cover absolute inset-0 h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.03]" />
          <div class="relative flex flex-col gap-4 bg-gradient-to-t from-dark/70 via-dark/35 to-transparent p-8 pt-24 text-on-dark md:px-12 md:pb-14">
            <div class="eyebrow !text-on-dark/85">Signature collection</div>
            <h2 class="text-h1 leading-[1.05] md:text-h1-lg">{{ sigBanner.heading || 'Signature' }}</h2>
            <p v-if="sigBanner.text" class="max-w-[360px] text-base leading-[1.7] text-on-dark/90">{{ sigBanner.text }}</p>
            <span class="btn btn-light mt-2 self-start">{{ sigBanner.button_label || 'Explore the collection' }}</span>
          </div>
        </NuxtLink>
        <div v-else class="relative flex min-h-[420px] flex-col justify-between bg-tile-2 p-8 md:min-h-[620px] md:px-12 md:py-14">
          <div class="flex flex-col gap-[18px]">
            <div class="eyebrow !text-rose-deep">Signature collection</div>
            <h2 class="text-h1 leading-[1.05] md:text-h1-lg">{{ sigLead.collection || 'Signature' }}</h2>
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
      <div class="mb-10 flex justify-center gap-5 border-b border-border sm:gap-10" role="tablist">
        <button v-for="t in tabs" :key="t.id" role="tab" :aria-selected="tab === t.id" class="-mb-px min-h-11 whitespace-nowrap border-b-2 pb-4 text-[11px] font-medium uppercase tracking-[0.12em] transition-colors sm:text-xs sm:tracking-[0.18em]" :class="tab === t.id ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'" @click="tab = t.id">{{ t.label }}</button>
      </div>
      <Transition mode="out-in" enter-active-class="transition duration-300" leave-active-class="transition duration-150" enter-from-class="opacity-0" leave-to-class="opacity-0">
        <div :key="tab" class="grid grid-cols-2 gap-x-4 gap-y-9 lg:grid-cols-4 lg:gap-6"><StoreProductCard v-for="p in tabItems.slice(0, 4)" :key="p.id" :product="p" /></div>
      </Transition>
    </section>

    <section v-if="home?.videos?.length" class="wrap section pb-6">
      <StoreSection eyebrow="Watch" title="Video gallery" />
      <StoreVideoGallery :videos="home.videos" />
    </section>

    <section class="mt-9 bg-dark text-on-dark md:mt-[72px]">
      <div class="wrap grid items-center gap-10 py-12 md:grid-cols-2 md:gap-[60px] md:py-16">
        <div class="flex flex-col gap-[18px]"><div class="eyebrow !text-champagne">Fit guidance</div><h2 class="text-h1 leading-[1.05] md:text-h1-lg">Find the size that feels like yours</h2><p class="max-w-[460px] text-base leading-[1.7] text-text-dark">Enter two measurements and our calculator suggests your band and cup size, with a full size chart alongside.</p></div>
        <div class="flex flex-col items-start gap-3.5">
          <ol class="grid w-full grid-cols-1 border-t border-line-dark-2 sm:grid-cols-3">
            <li v-for="(t, k) in ['Measure under the bust', 'Measure the fullest part', 'Get your recommended size']" :key="t" class="border-line-dark-2 py-5 sm:px-5 sm:first:pl-0" :class="k ? 'sm:border-l' : ''"><div class="font-display text-h1 text-champagne">0{{ k + 1 }}</div><div class="text-sm text-text-dark">{{ t }}</div></li>
          </ol>
          <button type="button" class="btn btn-light" aria-haspopup="dialog" data-track="home_size_finder" @click="sizeFinder.show()">Open size calculator</button>
        </div>
      </div>
    </section>
  </div>
</template>
