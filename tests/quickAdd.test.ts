// SRS CAT-12 / CAT-13: quick add state and variant rules.
import { describe, expect, it } from 'vitest'
import { chipsFor, colourNames, defaultColour, lineFor, nextState, planFor, type CardVariant } from '../composables/useQuickAdd'

const v = (id: number, size: string, color: string, in_stock = true, extra: Partial<CardVariant> = {}): CardVariant => ({ id, size_label: size, color_name: color, in_stock, ...extra })
const product = { name: 'Set', slug: 'set', price: '1000', image: null }

describe('nextState', () => {
  it('toggle opens and closes the chips', () => {
    expect(nextState('idle', 'toggle')).toBe('picking')
    expect(nextState('picking', 'toggle')).toBe('idle')
    expect(nextState('added', 'toggle')).toBe('picking')
  })
  it('close only affects picking, so it never wipes the Added confirmation', () => {
    expect(nextState('picking', 'close')).toBe('idle')
    expect(nextState('added', 'close')).toBe('added')
    expect(nextState('idle', 'close')).toBe('idle')
  })
  it('choosing a size confirms; reset returns to idle only from added', () => {
    expect(nextState('picking', 'chosen')).toBe('added')
    expect(nextState('added', 'reset')).toBe('idle')
    expect(nextState('picking', 'reset')).toBe('picking')
  })
})

describe('planFor', () => {
  it('adds a single in-stock variant at once', () => expect(planFor([v(1, 'M', 'Red')])).toEqual({ mode: 'direct', variant: v(1, 'M', 'Red') }))
  it('opens the chips when there is a choice, even if only one is in stock', () => expect(planFor([v(1, 'S', 'Red', false), v(2, 'M', 'Red')]).mode).toBe('choose'))
  it('does nothing when everything is sold out', () => expect(planFor([v(1, 'S', 'Red', false)]).mode).toBe('none'))
  it('does nothing without variants', () => expect(planFor([]).mode).toBe('none'))
})

describe('chips', () => {
  const all = [v(1, 'S', 'Red'), v(2, 'M', 'Red', false), v(3, 'S', 'Black'), v(4, 'M', 'Black')]
  it('keeps out-of-stock sizes but disables them (CAT-13)', () => {
    expect(chipsFor(all, 'Red').map((c) => [c.label, c.disabled])).toEqual([['S', false], ['M', true]])
  })
  it('each chip carries its own variant id, per colour', () => {
    expect(chipsFor(all, 'Black').map((c) => c.variant.id)).toEqual([3, 4])
  })
  it('labels size-less variants "One size"', () => expect(chipsFor([v(9, '', 'Red')], 'Red')[0].label).toBe('One size'))
  it('lists colours once, in order', () => expect(colourNames(all)).toEqual(['Red', 'Black']))
  it('prefers the colour the card shows, case-insensitively', () => expect(defaultColour(all, 'black')).toBe('Black'))
  it('falls back to the first colour with stock', () => expect(defaultColour([v(1, 'S', 'Red', false), v(2, 'S', 'Black')], 'Pink')).toBe('Black'))
})

describe('lineFor', () => {
  it('uses the variant sku and price when the card provides them', () => {
    const l = lineFor(product, v(7, 'M', 'Red', true, { sku: 'SET-RED-M', price: '1200' }), 5)
    expect(l).toMatchObject({ variant: 7, sku: 'SET-RED-M', price: '1200', label: 'Red / M', quantity: 1, addedAt: 5 })
  })
  it('falls back to the product price and an empty sku', () => {
    expect(lineFor(product, v(7, '', 'Red'))).toMatchObject({ sku: '', price: '1000', label: 'Red' })
  })
})
