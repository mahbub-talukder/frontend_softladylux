// Covers amendment v1.6: NTF-05 contact links, the typing placeholder and the INS-05 GA4 ecommerce shapes.
import { describe, expect, it } from 'vitest'
import { intlDigits, telLink, waLink } from '../utils/contact'
import { ecommerceEntries, firstTime, itemsValue, lineItem, productItem } from '../utils/ecommerce'
import { HOLD_MS, TYPE_MS, TYPING_START, typingStep, typingText, type TypingState } from '../utils/typing'

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) } } }
const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }

describe('contact links (NTF-05)', () => {
  it('turns national BD numbers into international digits', () => {
    expect(intlDigits('01712-345678')).toBe('8801712345678')
    expect(intlDigits('+880 1712 345678')).toBe('8801712345678')
    expect(intlDigits('00880 1712345678')).toBe('8801712345678')
    expect(intlDigits('09617640559')).toBe('8809617640559')
    expect(intlDigits('')).toBe('')
    expect(intlDigits('123')).toBe('')
  })
  it('builds wa.me and tel: links, empty when no number', () => {
    expect(waLink('01712345678')).toBe('https://wa.me/8801712345678')
    expect(telLink('01712345678')).toBe('tel:+8801712345678')
    expect(waLink(undefined)).toBe('')
    expect(telLink(null)).toBe('')
  })
})

describe('typing placeholder', () => {
  const words = ['bra', 'set']
  it('types, holds, deletes and moves to the next word', () => {
    let s: TypingState = { ...TYPING_START }
    const seen: string[] = []
    const delays: number[] = []
    for (let i = 0; i < 12; i++) { const r = typingStep(s, words); s = r.state; seen.push(typingText(s, words)); delays.push(r.delay) }
    expect(seen.slice(0, 3)).toEqual(['b', 'br', 'bra'])
    expect(delays[0]).toBe(TYPE_MS)
    expect(delays[2]).toBe(HOLD_MS) // full word stays visible
    expect(seen.slice(3, 6)).toEqual(['br', 'b', ''])
    expect(seen[6]).toBe('s') // next word
  })
  it('copes with no words', () => {
    expect(typingText(typingStep(TYPING_START, []).state, [])).toBe('')
  })
})

describe('GA4 ecommerce shapes (INS-05)', () => {
  const card = { slug: 'plunge-bra', name: 'Plunge Bra', price: '2450.00', category: { name: 'Bras' } }
  const line = { slug: 'plunge-bra', name: 'Plunge Bra', label: 'Rose / 34B', price: '2450.00', quantity: 2, phone: '01712345678' }
  it('builds items from cards and cart lines without personal data', () => {
    expect(productItem(card)).toEqual({ item_id: 'plunge-bra', item_name: 'Plunge Bra', price: 2450, item_category: 'Bras' })
    expect(lineItem(line)).toEqual({ item_id: 'plunge-bra', item_name: 'Plunge Bra', item_variant: 'Rose / 34B', price: 2450, quantity: 2 })
    expect(itemsValue([lineItem(line), productItem({ ...card, price: '0.10' })])).toBe(4900.1)
  })
  it('clears the previous ecommerce object, adds BDT and the value', () => {
    const [clear, ev] = ecommerceEntries('add_to_cart', { items: [lineItem(line)] })
    expect(clear).toEqual({ ecommerce: null })
    expect(ev).toEqual({ event: 'add_to_cart', ecommerce: { currency: 'BDT', value: 4900, items: [lineItem(line)] } })
  })
  it('keeps an explicit value and the purchase fields; list views carry no value', () => {
    const [, buy] = ecommerceEntries('purchase', { transaction_id: 'SLL-1', value: 4960, shipping: 60, coupon: 'WELCOME10', items: [lineItem(line)] })
    expect(buy.ecommerce).toMatchObject({ transaction_id: 'SLL-1', value: 4960, shipping: 60, coupon: 'WELCOME10', currency: 'BDT' })
    const [, list] = ecommerceEntries('view_item_list', { item_list_name: 'Bras', items: [productItem(card)] }, false)
    expect(list.ecommerce).toEqual({ currency: 'BDT', item_list_name: 'Bras', items: [productItem(card)] })
  })
  it('pushes purchase once per order per session', () => {
    const s = mem()
    expect(firstTime('k', 'SLL-1', s)).toBe(true)
    expect(firstTime('k', 'SLL-1', s)).toBe(false)
    expect(firstTime('k', 'SLL-2', s)).toBe(true)
    expect(firstTime('k', 'SLL-3', broken)).toBe(true)
  })
})
