<template>
  <div class="min-h-screen bg-bg text-ink">
    <header class="border-b border-border bg-surface">
      <div class="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-4">
        <NuxtLink to="/" class="font-display text-2xl">SoftLadyLux</NuxtLink>
      </div>
    </header>
    <main class="mx-auto max-w-screen-xl px-4 py-8"><slot /></main>
    <footer class="bg-dark px-4 py-8 text-sm text-on-dark">
      <div class="mx-auto max-w-screen-xl">[FOOTER: contact and support hours come from Settings]</div>
    </footer>
  </div>
</template>
