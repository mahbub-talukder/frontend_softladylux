<template>
  <div class="flex min-h-screen bg-cream text-ink">
    <aside class="w-64 shrink-0 bg-dark p-6 text-on-dark">
      <NuxtLink to="/admin" class="font-display text-xl">SoftLadyLux Admin</NuxtLink>
      <p class="mt-6 text-xs opacity-70">Menu appears per permission (M1).</p>
    </aside>
    <main class="flex-1 p-8"><slot /></main>
  </div>
</template>
