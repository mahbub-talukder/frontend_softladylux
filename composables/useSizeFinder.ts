/** One shared "Find my size" dialog for the whole storefront (SRS CAT-08): the header icon, mobile menu, hero and product
 * page all call `show()`; StoreShell renders the dialog once. State lives in useState so SSR and client agree (closed). */
export function useSizeFinder() {
  const open = useState('size-finder-open', () => false)
  return { open, show: () => { open.value = true }, hide: () => { open.value = false } }
}
