<script setup lang="ts">
// SRS WEB-07 / STF: static page (About, Delivery & Returns, Privacy, Terms). Body is HTML written
// by the Owner or a Staff user holding website.manage.
import type { StaticPage } from '~/types/api'

const route = useRoute()
const { api } = useApi()
const { data: page, error } = await useAsyncData(`page-${route.params.slug}`, () => api<StaticPage>(`/pages/${route.params.slug}/`))
if (error.value) throw createError({ statusCode: 404, statusMessage: 'Page not found' })
useSeoMeta({ title: () => page.value?.title })
</script>

<template>
  <article v-if="page" class="mx-auto max-w-2xl">
    <h1 class="text-h2">{{ page.title }}</h1>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="mt-4 leading-relaxed" v-html="page.body" />
    <p v-if="!page.body" class="hint mt-4">[PAGE CONTENT — the owner adds this in Admin → Website content → Static pages]</p>
  </article>
</template>
