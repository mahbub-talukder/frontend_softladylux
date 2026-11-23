<script setup lang="ts">
// Design: Header board (search). 48px bordered field that turns rosewood on focus; the dropdown shows
// "Trending searches" (or "Suggestions" while typing) beside matching products with a thumbnail.
// SRS CAT-10: top 6 matches while typing. Suggestions open on focus and close on blur/Escape.
import type { CardProduct } from '~/types/api'
import { TYPING_START, type TypingState, typingStep, typingText } from '~/utils/typing'

const { api } = useApi()
const router = useRouter()
const { data: cats } = await useCategories()
const q = ref('')
const hits = ref<Pick<CardProduct, 'name' | 'slug' | 'price' | 'image' | 'category'>[]>([])
const open = ref(false)
const loading = ref(false)
const failed = ref(false)
const uid = useId() // header renders two instances (desktop + phone row): ids must be unique
let seq = 0
let timer: ReturnType<typeof setTimeout> | undefined

// No invented "trending" data: the shop's own categories are the starting suggestions.
const terms = computed(() => (cats.value ?? []).slice(0, 5).map((c) => ({ label: c.name, to: `/shop/${c.slug}` })))

watch(q, (v) => {
  clearTimeout(timer)
  failed.value = false
  if (v.trim().length < 2) { hits.value = []; loading.value = false; return }
  loading.value = true
  const mine = ++seq // ignore answers that arrive after a newer keystroke
  timer = setTimeout(async () => {
    try {
      const r = await api<typeof hits.value>('/search/suggest/', { query: { q: v.trim() } })
      if (mine === seq) hits.value = Array.isArray(r) ? r : []
    } catch { if (mine === seq) { hits.value = []; failed.value = true } } finally { if (mine === seq) loading.value = false }
  }, 180)
})
// Live typing placeholder (amendment v1.6): the whole phrase "Search for <category>" is typed and deleted in turn,
// using the shop's own category names. The server and reduced-motion visitors get the static text; it stops while the
// field is focused or has text, and while the browser tab is hidden. The label stays "Search products".
const STATIC_PH = 'Search bras, sets, sleepwear…'
const words = computed(() => {
  const names = (cats.value ?? []).map((c) => c.name.toLowerCase()).filter(Boolean)
  return (names.length ? names.slice(0, 6) : ['bras', 'lingerie sets', 'sleepwear', 'shapewear']).map((n) => `Search for ${n}…`)
})
const typing = ref<TypingState | null>(null)
const placeholder = computed(() => (typing.value && !open.value && !q.value ? typingText(typing.value, words.value) : STATIC_PH))
let typeTimer: ReturnType<typeof setTimeout> | undefined
function tick() {
  if (!typing.value) return
  if (open.value || q.value || document.hidden) { typeTimer = setTimeout(tick, 600); return }
  const { state, delay } = typingStep(typing.value, words.value)
  typing.value = state
  typeTimer = setTimeout(tick, delay)
}
onMounted(() => {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  typing.value = { ...TYPING_START }
  typeTimer = setTimeout(tick, 900)
})
onBeforeUnmount(() => { clearTimeout(typeTimer); clearTimeout(timer) })

function go(to: string) { open.value = false; router.push(to) }
function submit() {
  open.value = false
  if (q.value.trim()) router.push({ path: '/search', query: { q: q.value.trim() } })
}
</script>

<template>
  <form class="relative" role="search" @submit.prevent="submit" @focusin="open = true" @focusout="open = false" @keydown.esc="open = false">
    <label :for="`s-${uid}`" class="sr-only">Search products</label>
    <div class="flex h-12 items-center gap-3 border bg-surface px-4 transition-colors duration-200" :class="open ? 'border-accent' : 'border-field'">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="shrink-0 text-muted" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
      <input :id="`s-${uid}`" v-model="q" type="search" autocomplete="off" :placeholder="placeholder" class="h-11 min-w-0 flex-1 border-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted">
    </div>
    <div v-if="open" class="absolute inset-x-0 top-[54px] z-40 grid gap-7 border border-border bg-surface p-5 shadow-pop md:grid-cols-[5fr_7fr] md:p-6" @mousedown.prevent>
      <!-- CAT-10a (v1.11): below md, Products come first and Suggestions/Browse follow; md+ keeps the two columns -->
      <div class="order-2 flex flex-col gap-1.5 md:order-1">
        <div class="mb-1.5 text-xs font-medium uppercase tracking-[0.2em] text-gold">{{ q.trim().length >= 2 ? 'Suggestions' : 'Browse' }}</div>
        <NuxtLink v-for="t in terms" :key="t.to" :to="t.to" class="flex min-h-11 items-center text-[15px] transition-colors hover:text-accent" @click="open = false">{{ t.label }}</NuxtLink>
      </div>
      <div class="order-1 flex flex-col gap-1.5 md:order-2">
        <div class="mb-1.5 text-xs font-medium uppercase tracking-[0.2em] text-gold">Products</div>
        <p v-if="q.trim().length < 2" class="py-1.5 text-sm text-muted">Type at least two letters.</p>
        <p v-else-if="failed" class="py-1.5 text-sm text-muted" role="alert">Search is unavailable right now. Press Enter to see all results.</p>
        <p v-else-if="loading" class="py-1.5 text-sm text-muted" role="status">Searching…</p>
        <p v-else-if="!hits.length" class="py-1.5 text-sm text-muted">No products match “{{ q }}”.</p>
        <button v-for="h in hits.slice(0, 3)" :key="h.slug" type="button" class="flex min-h-11 items-center gap-3.5 py-1.5 text-left" @click="go(`/product/${h.slug}`)">
          <StoreTile :src="h.image?.url" :alt="h.name" :tile-key="h.slug" :category="h.category?.slug" ratio="46/58" :width="46" :height="58" art-width="64%" class="w-[46px] shrink-0" />
          <span class="flex flex-col"><span class="font-display text-[19px] leading-[1.15]">{{ h.name }}</span><span class="text-[13px] text-muted">{{ taka(h.price) }}</span></span>
        </button>
        <button v-if="q.trim().length >= 2" type="submit" class="lnk mt-2 self-start">See all results</button>
      </div>
    </div>
  </form>
</template>
