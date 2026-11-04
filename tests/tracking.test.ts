// Covers SRS INS-05: every data-track name used in the code is documented in TRACKING.md.
import { describe, expect, it } from 'vitest'
import doc from '../TRACKING.md?raw'

// Vite reads the sources as text, so this needs no Node file APIs.
const sources = import.meta.glob(['../components/**/*.vue', '../pages/**/*.vue', '../layouts/**/*.vue'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>

describe('data-track names', () => {
  const used = new Set<string>()
  for (const src of Object.values(sources)) {
    for (const m of src.matchAll(/data-track="([a-z0-9_]+)"/g)) used.add(m[1])
  }
  it('finds tracked buttons in the source', () => expect(used.size).toBeGreaterThan(30))
  it.each([...used])('%s is documented', (name) => expect(doc).toContain(name))
  it('documents the bottom navigation family', () => expect(doc).toContain('bottom_nav_home'))
  it('lists every event of the contract', () => {
    for (const e of ['page_view', 'view_item_list', 'view_item', 'search', 'add_to_cart', 'remove_from_cart', 'add_to_wishlist', 'begin_checkout', 'add_payment_info', 'purchase', 'ui_click']) expect(doc).toContain(e)
  })
})
