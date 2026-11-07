<script setup lang="ts">
// Design: Video gallery. SRS WEB-07 (owner request, Nov 2026): videos play in place, in the stage, instead of
// opening a new tab. Until the visitor presses play nothing is embedded (poster only), and YouTube plays from
// youtube-nocookie.com. The poster is the uploaded thumbnail, else the video's own YouTube thumbnail.
// A link we cannot embed (e.g. Facebook) opens in the same tab. The list beside the stage is a scroll-snap strip on phones.
import type { Video } from '~/types/api'
import { parseVideo } from '~/utils/video'

const props = defineProps<{ videos: Video[] }>()
const idx = ref(0)
const playing = ref(false)
const cur = computed(() => props.videos[idx.value] ?? props.videos[0])
const parsed = computed(() => parseVideo(cur.value?.url))
const failed = reactive<Record<number, number>>({}) // video id -> how many YouTube thumbnail sizes failed

function poster(v: Video): string | null {
  if (v.thumbnail?.url) return null // uploaded image wins (rendered with NuxtImg)
  const t = parseVideo(v.url).thumbs
  return t[failed[v.id] ?? 0] ?? null
}
function stepDown(v: Video) { failed[v.id] = (failed[v.id] ?? 0) + 1 }
// YouTube answers a missing maxres image with a 120x90 placeholder instead of an error in some regions.
function checkSize(e: Event, v: Video) { const el = e.target as HTMLImageElement; if (el.naturalWidth && el.naturalWidth < 200) stepDown(v) }

// Owner request: stop playback once the player has scrolled out of view. Dropping `playing` removes the iframe, so the
// video really stops (no background audio); it only restarts when the visitor presses play again.
const stage = ref<HTMLElement | null>(null)
let io: IntersectionObserver | undefined
onMounted(() => {
  if (!('IntersectionObserver' in window) || !stage.value) return
  io = new IntersectionObserver(([e]) => { if (e && !e.isIntersecting) playing.value = false }, { threshold: 0.15 })
  io.observe(stage.value)
})
onBeforeUnmount(() => io?.disconnect())

function pick(k: number) { idx.value = k; playing.value = true }
const label = computed(() => (parsed.value.kind === 'other' ? 'Watch video' : 'Play video'))
</script>

<template>
  <div v-if="cur" class="grid gap-5 lg:grid-cols-[8fr_4fr] lg:gap-8">
    <div ref="stage" class="group relative aspect-video overflow-hidden rounded-[20px] bg-tile-video shadow-pop md:rounded-[28px]">
      <template v-if="playing && parsed.embed">
        <video v-if="parsed.kind === 'file'" :key="cur.id" :src="parsed.embed" class="absolute inset-0 h-full w-full bg-dark" controls autoplay playsinline />
        <iframe v-else :key="cur.id" :src="parsed.embed" :title="cur.title" class="absolute inset-0 h-full w-full border-0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" />
      </template>
      <component :is="parsed.embed ? 'button' : 'a'" v-else v-bind="parsed.embed ? { type: 'button' } : { href: cur.url, target: '_self' }" class="absolute inset-0 flex h-full w-full items-center justify-center text-left" :aria-label="`${label}: ${cur.title}`" data-track="video_open" @click="parsed.embed && (playing = true)">
        <NuxtImg v-if="cur.thumbnail" :key="`u${cur.id}`" format="webp" :src="mediaSrc(cur.thumbnail.url)" :alt="cur.thumbnail.alt_text || ''" width="1000" height="563" sizes="xs:100vw lg:66vw" loading="lazy" class="media-cover absolute inset-0 h-full w-full transition-transform duration-[600ms] group-hover:scale-[1.03]" />
        <img v-else-if="poster(cur)" :key="`y${cur.id}-${failed[cur.id] ?? 0}`" :src="poster(cur)!" alt="" width="1280" height="720" loading="lazy" referrerpolicy="no-referrer" class="media-cover absolute inset-0 h-full w-full transition-transform duration-[600ms] group-hover:scale-[1.03]" @error="stepDown(cur)" @load="checkSize($event, cur)">
        <span class="pointer-events-none absolute inset-0 bg-gradient-to-t from-dark/80 via-dark/10 to-dark/10" />
        <span class="relative flex h-[72px] w-[72px] items-center justify-center rounded-full bg-bg/95 text-ink shadow-pop ring-8 ring-bg/25 transition-transform duration-300 group-hover:scale-110 md:h-[88px] md:w-[88px]">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg>
        </span>
        <span class="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 text-on-dark md:p-6">
          <span class="line-clamp-2 font-display text-h3 leading-tight md:text-h3-lg">{{ cur.title }}</span>
          <span v-if="videos.length > 1" class="shrink-0 rounded-full bg-dark/50 px-3 py-1 text-xs uppercase tracking-[0.16em]">{{ idx + 1 }} / {{ videos.length }}</span>
        </span>
      </component>
    </div>

    <div v-if="videos.length > 1" class="relative min-w-0 lg:min-h-0">
      <div class="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-gold lg:hidden">Up next</div>
      <ul class="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] lg:absolute lg:inset-0 lg:mx-0 lg:flex-col lg:gap-2.5 lg:overflow-y-auto lg:overflow-x-hidden lg:px-0 lg:pb-0 lg:pr-1">
        <li v-for="(v, k) in videos" :key="v.id" class="w-[220px] shrink-0 snap-start lg:w-auto">
          <button type="button" class="flex w-full flex-col gap-2.5 rounded-2xl border p-2.5 text-left transition-colors duration-200 lg:flex-row lg:items-center lg:gap-4" :class="k === idx ? 'border-primary bg-surface shadow-sm' : 'border-transparent hover:bg-cream/70'" :aria-current="k === idx" :aria-label="`Play ${v.title}`" @click="pick(k)">
            <span class="relative block aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-tile-6 lg:w-36">
              <NuxtImg v-if="v.thumbnail" format="webp" :src="mediaSrc(v.thumbnail.url)" alt="" width="288" height="162" loading="lazy" class="media-cover absolute inset-0 h-full w-full" />
              <img v-else-if="poster(v)" :key="`${v.id}-${failed[v.id] ?? 0}`" :src="poster(v)!" alt="" width="288" height="162" loading="lazy" referrerpolicy="no-referrer" class="media-cover absolute inset-0 h-full w-full" @error="stepDown(v)" @load="checkSize($event, v)">
              <span class="absolute inset-0 flex items-center justify-center bg-dark/20"><span class="flex h-8 w-8 items-center justify-center rounded-full bg-bg/90 text-ink"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg></span></span>
            </span>
            <span class="min-w-0 flex-1">
              <span class="line-clamp-2 font-display text-[19px] leading-[1.2]">{{ v.title }}</span>
              <span v-if="k === idx" class="mt-1 block text-xs font-medium uppercase tracking-[0.16em] text-primary">{{ playing ? 'Now playing' : 'Selected' }}</span>
            </span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
