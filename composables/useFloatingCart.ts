/** Visibility of the floating bag widget (owner request). The × on the widget hides it completely; the only way back is the
 * switch on the /cart page. Remembered in this browser (localStorage, try/catch: blocked storage means "shown"). The cart
 * itself is a separate store and is never read or written here. */
const KEY = 'sll-float-cart-hidden'

export function useFloatingCart() {
  const hidden = useState('float-cart-hidden', () => false)
  const ready = useState('float-cart-ready', () => false)
  function load() {
    if (ready.value || !import.meta.client) return
    try { hidden.value = window.localStorage.getItem(KEY) === '1' } catch { /* stays shown */ }
    ready.value = true
  }
  function set(v: boolean) {
    hidden.value = v
    try { window.localStorage.setItem(KEY, v ? '1' : '0') } catch { /* remembered for this visit only */ }
  }
  return { hidden, ready, load, hide: () => set(true), show: () => set(false) }
}
