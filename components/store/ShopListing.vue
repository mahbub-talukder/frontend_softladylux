<script setup lang="ts">
// Design: Listing board. SRS CAT-09 (filters, sort, "Showing X of Y", Load more, URL state),
// CAT-13, CAT-20 (Sub-category group REPLACES the Category group on a category page), UI-03.
import type { CardProduct, ProductPage } from '~/types/api'
import { chips, emptyFilters, parseQuery, toApiParams, toggleIn, toQuery, type Filters } from '~/utils/listingQuery'

const props = defineProps<{
  scope: { category?: string; offers?: boolean; new?: boolean }
  title: string
  blurb?: string
  crumbs?: { name: string; to?: string }[]
}>()
const route = useRoute()
const router = useRouter()
const { api } = useApi()
const PAGE = 12

const filters = computed(() => parseQuery(route.query as Record<string, string | string[]>))
const { data, pending, error, refresh } = await useAsyncData(
  `listing-${JSON.stringify(props.scope)}`,
  () => api<ProductPage>('/products/', { query: toApiParams(filters.value, props.scope, 1, PAGE) }),
  { watch: [() => route.query] }
)
const extra = ref<CardProduct[]>([])
const page = ref(1)
const loadingMore = ref(false)
watch(data, () => { extra.value = []; page.value = 1 })
const items = computed(() => [...(data.value?.results ?? []), ...extra.value])
const total = computed(() => data.value?.count ?? 0)
const facets = computed(() => data.value?.facets)
const showSubs = computed(() => !!props.scope.category && (facets.value?.subcategories.length ?? 0) > 0)
const showCats = computed(() => !props.scope.category && (facets.value?.categories.length ?? 0) > 1)
const drawer = ref(false)
watch(drawer, (o) => { if (import.meta.client) document.body.style.overflow = o ? 'hidden' : '' })
onBeforeUnmount(() => { if (import.meta.client) document.body.style.overflow = '' })

async function more() {
  loadingMore.value = true
  try {
    const next = await api<ProductPage>('/products/', { query: toApiParams(filters.value, props.scope, page.value + 1, PAGE) })
    extra.value.push(...next.results); page.value += 1
  } finally { loadingMore.value = false }
}
function update(patch: Partial<Filters>) { router.push({ query: toQuery({ ...filters.value, ...patch }) }) }
function remove(group: keyof Filters, value: string) {
  const f = filters.value
  if (group === 'priceMax') return update({ priceMax: null })
  if (group === 'available') return update({ available: false })
  update({ [group]: (f[group] as string[]).filter((x) => x !== value) } as Partial<Filters>)
}
const clearAll = () => router.push({ query: toQuery({ ...emptyFilters(), q: filters.value.q, sort: filters.value.sort }) })
const priceMax = computed(() => Math.ceil(Number(facets.value?.price.max ?? 0)))
const priceMin = computed(() => Math.floor(Number(facets.value?.price.min ?? 0)))
const chipList = computed(() => chips(filters.value))
// INS-05: view_item_list (and search on /search) once results are in
const { push, item } = useTrack()
watch(() => data.value?.results, (r) => {
  if (!r || import.meta.server) return
  push('view_item_list', { item_list_name: props.title, items: r.slice(0, 20).map((p) => item(p)) })
  if (route.path === '/search' && filters.value.q) push('search', { search_term: filters.value.q, results: data.value?.count })
}, { immediate: true })
</script>

<template>
  <div>
    <!-- Banner band (Listing board) -->
    <section class="border-b border-border bg-cream">
      <div class="wrap flex flex-col gap-2.5 py-8 md:gap-3 md:py-11">
        <nav v-if="crumbs" class="flex flex-wrap items-center text-[13px] text-muted" aria-label="Breadcrumb">
          <template v-for="(c, i) in crumbs" :key="c.name"><NuxtLink v-if="c.to" :to="c.to" class="inline-flex min-h-11 min-w-11 items-center justify-center transition-colors hover:text-ink">{{ c.name }}</NuxtLink><span v-else class="text-ink">{{ c.name }}</span><span v-if="i < crumbs.length - 1" class="px-0.5">/</span></template>
        </nav>
        <h1 class="font-display text-h1 leading-none md:text-h1-lg">{{ title }}</h1>
        <p class="max-w-[560px] text-[15px] leading-relaxed text-body md:text-base">{{ blurb || 'Filter by sub-category, size, colour and price to find exactly what you need.' }}</p>
      </div>
    </section>

    <div class="wrap flex flex-col gap-6 pb-16 pt-6 lg:flex-row lg:items-start lg:gap-14 lg:pb-24 lg:pt-12">
      <!-- Mobile: sticky filter + sort bar -->
      <div class="sticky top-0 z-20 -mx-5 flex gap-3 border-b border-border bg-bg px-5 py-3 md:-mx-10 md:px-10 lg:hidden">
        <button class="btn-secondary !h-11 flex-1 !px-4" aria-haspopup="dialog" @click="drawer = true">Filters<span v-if="chipList.length" class="ml-2 bg-ink px-1.5 text-xs text-bg">{{ chipList.length }}</span></button>
        <label class="sr-only" for="sort-m">Sort by</label>
        <select id="sort-m" class="sf-inp !h-11 flex-1 !text-sm" :value="filters.sort" @change="update({ sort: ($event.target as HTMLSelectElement).value as Filters['sort'] })">
          <option value="featured">Featured</option><option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option>
        </select>
      </div>

      <!-- Filters -->
      <div v-if="drawer" class="fixed inset-0 z-40 bg-ink/40 lg:hidden" aria-hidden="true" @click="drawer = false" />
      <aside
        :class="drawer ? 'fixed inset-x-0 bottom-0 top-12 z-50 flex flex-col overflow-y-auto bg-bg px-5 pb-28 pt-5' : 'hidden lg:flex lg:w-[260px] lg:flex-none lg:flex-col'"
        aria-label="Filters" :role="drawer ? 'dialog' : undefined" :aria-modal="drawer ? 'true' : undefined"
        @keydown.esc="drawer = false"
      >
        <div class="flex items-baseline justify-between border-b border-ink pb-4">
          <h2 class="font-display text-h3">Filters</h2>
          <span class="flex items-center gap-5">
            <button class="min-h-11 text-xs font-medium uppercase tracking-[0.14em] text-accent" @click="clearAll">Clear all</button>
            <button class="flex h-11 w-11 items-center justify-center text-2xl lg:hidden" aria-label="Close filters" @click="drawer = false">×</button>
          </span>
        </div>

        <div v-if="showSubs || showCats" role="group" class="border-b border-border py-6">
          <div class="mb-4 text-xs font-semibold uppercase tracking-[0.2em]">{{ showSubs ? 'Sub-category' : 'Category' }}</div>
          <label v-for="s in (showSubs ? facets!.subcategories : facets!.categories)" :key="s.slug" class="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
            <input type="checkbox" class="peer sr-only" :checked="(showSubs ? filters.sub : filters.category).includes(s.slug)" @change="showSubs ? update({ sub: toggleIn(filters.sub, s.slug) }) : update({ category: toggleIn(filters.category, s.slug) })">
            <span class="flex h-5 w-5 flex-none items-center justify-center border border-text-dark-3 text-[13px] text-bg peer-checked:border-ink peer-checked:bg-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent" aria-hidden="true"><span v-if="(showSubs ? filters.sub : filters.category).includes(s.slug)">✓</span></span>
            <span class="flex-1">{{ s.name }}</span><span class="text-[13px] text-muted">{{ s.count }}</span>
          </label>
        </div>

        <div v-if="facets?.sizes.length" role="group" class="border-b border-border py-6">
          <div class="mb-4 text-xs font-semibold uppercase tracking-[0.2em]">Size</div>
          <div class="flex flex-wrap gap-2">
            <button v-for="z in facets.sizes" :key="z" type="button" class="chip-size !h-11 !min-w-12 !text-sm" :aria-pressed="filters.size.includes(z)" @click="update({ size: toggleIn(filters.size, z) })">{{ z }}</button>
          </div>
        </div>

        <div v-if="facets?.colours.length" role="group" class="border-b border-border py-6">
          <div class="mb-3 text-xs font-semibold uppercase tracking-[0.2em]">Colour</div>
          <div class="flex flex-wrap gap-x-3.5 gap-y-1.5">
            <button v-for="c in facets.colours" :key="c.name" type="button" :title="c.name" :aria-label="c.name" class="flex h-11 w-11 items-center justify-center" :aria-pressed="filters.colour.includes(c.name)" @click="update({ colour: toggleIn(filters.colour, c.name) })">
              <span class="h-7 w-7 rounded-full transition-shadow" :class="filters.colour.includes(c.name) ? 'ring-2 ring-ink ring-offset-2 ring-offset-bg' : 'ring-1 ring-ink/25'" :style="{ backgroundColor: c.hex }" />
            </button>
          </div>
          <div class="mt-0.5 text-[13px] text-muted">{{ filters.colour.length ? filters.colour.join(', ') : 'All colours' }}</div>
        </div>

        <div v-if="facets?.collections.length" role="group" class="border-b border-border py-6">
          <div class="mb-4 text-xs font-semibold uppercase tracking-[0.2em]">Collection</div>
          <label v-for="c in facets.collections" :key="c" class="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
            <input type="checkbox" class="peer sr-only" :checked="filters.collection.includes(c)" @change="update({ collection: toggleIn(filters.collection, c) })">
            <span class="flex h-5 w-5 flex-none items-center justify-center border border-text-dark-3 text-[13px] text-bg peer-checked:border-ink peer-checked:bg-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent" aria-hidden="true"><span v-if="filters.collection.includes(c)">✓</span></span>
            <span class="flex-1">{{ c }}</span>
          </label>
        </div>

        <div v-if="priceMax > priceMin" class="py-6">
          <label for="pr" class="mb-4 block text-xs font-semibold uppercase tracking-[0.2em]">Price up to</label>
          <input id="pr" type="range" class="w-full accent-accent" :min="priceMin" :max="priceMax" :value="filters.priceMax ?? priceMax" @change="update({ priceMax: Number(($event.target as HTMLInputElement).value) >= priceMax ? null : Number(($event.target as HTMLInputElement).value) })">
          <div class="mt-1.5 flex justify-between text-sm"><span class="text-muted">{{ taka(priceMin) }}</span><b class="font-medium">{{ taka(filters.priceMax ?? priceMax) }}</b></div>
        </div>
        <label class="flex min-h-11 cursor-pointer items-center gap-3 border-t border-border pt-4 text-[15px]">
          <input type="checkbox" class="peer sr-only" :checked="filters.available" @change="update({ available: !filters.available })">
          <span class="flex h-5 w-5 flex-none items-center justify-center border border-text-dark-3 text-[13px] text-bg peer-checked:border-ink peer-checked:bg-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent" aria-hidden="true"><span v-if="filters.available">✓</span></span>In stock only
        </label>
        <div v-if="drawer" class="fixed inset-x-0 bottom-0 border-t border-border bg-bg p-4"><button class="btn w-full" @click="drawer = false">Show {{ total }} products</button></div>
      </aside>

      <!-- Products -->
      <section class="min-w-0 flex-1" aria-label="Products">
        <div class="hidden flex-wrap items-center justify-between gap-4 border-b border-border pb-[18px] lg:flex">
          <div class="text-[15px] text-body"><b class="font-medium text-ink">{{ total }}</b> products</div>
          <div class="flex items-center gap-3"><label for="sort" class="text-xs font-medium uppercase tracking-[0.16em]">Sort by</label>
            <select id="sort" class="h-11 border border-field bg-surface px-3.5 text-[14.5px]" :value="filters.sort" @change="update({ sort: ($event.target as HTMLSelectElement).value as Filters['sort'] })">
              <option value="featured">Featured</option><option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option>
            </select>
          </div>
        </div>
        <div class="flex min-h-11 flex-wrap items-center gap-2.5 pb-5 lg:pb-7 lg:pt-4" aria-label="Active filters">
          <span class="text-sm text-body lg:hidden"><b class="font-medium text-ink">{{ total }}</b> products</span>
          <button v-for="c in chipList" :key="c.group + c.value" class="inline-flex h-9 items-center gap-2 border border-ink px-3.5 text-[13px] transition-colors hover:bg-ink hover:text-bg" @click="remove(c.group, c.value)">{{ c.label }} <span aria-hidden="true" class="text-base leading-none">×</span></button>
          <span v-if="!chipList.length" class="hidden text-sm text-muted lg:inline">No filters applied. Choose size, colour or type on the left.</span>
        </div>

        <div v-if="error" class="err" role="alert">We couldn’t load products. <button class="underline" @click="() => refresh()">Try again</button></div>
        <div v-else-if="pending && !items.length" class="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-6" aria-busy="true"><div v-for="n in 8" :key="n" class="skeleton aspect-[4/5]" /></div>
        <div v-else-if="!items.length" class="flex flex-col items-center gap-3.5 bg-cream px-5 py-20 text-center">
          <h3 class="font-display text-h3 md:text-h3-lg">Nothing matches these filters</h3><p class="text-body">Try removing a size or colour.</p>
          <button class="btn" @click="clearAll">Clear all filters</button>
        </div>
        <div v-else class="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-6 md:gap-y-10">
          <StoreProductCard v-for="p in items" :key="p.id" :product="p" />
        </div>
        <div v-if="items.length" class="mt-14 flex flex-col items-center gap-4 md:mt-16">
          <div class="text-sm text-muted">Showing {{ items.length }} of {{ total }}</div>
          <div class="h-0.5 w-[220px] bg-border"><div class="h-0.5 bg-ink transition-all duration-500" :style="{ width: Math.round((items.length / Math.max(total, 1)) * 100) + '%' }" /></div>
          <button v-if="items.length < total" class="btn-secondary" :disabled="loadingMore" data-track="load_more" @click="more"><span v-if="loadingMore" class="btn-spin" />Load more</button>
        </div>
      </section>
    </div>
  </div>
</template>
