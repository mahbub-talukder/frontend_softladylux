import { defineConfig } from 'vitest/config'

// Lets unit tests import app code through the same `~/` alias Nuxt uses.
export default defineConfig({
  resolve: { alias: { '~': new URL('.', import.meta.url).pathname } }
})
