import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt({}).append({
  ignores: ['.nuxt', '.output', 'node_modules']
})
