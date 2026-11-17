/* eslint-disable */
// SRS v1.10 THM-31: typography responsive audit. Dev-only; no dependencies; nothing is saved.
//
// How to run (dev site, signed in to the admin in the same browser so admin pages load):
//   1. Put one product in the bag, so the cart and checkout pages render with content.
//   2. Open any storefront page, paste this file into the browser console, then run:
//        await typographyAudit()                         // every page × width × pairing × size
//        await typographyAudit({ pairings: ['elegant'], sizes: ['large'], widths: [360] })
//      Results: the returned object and window.__typographyAudit (also logged as tables).
//
// For each page and width it loads the page once in a same-origin iframe, records a baseline with the
// current design (Signature, Standard), then swaps every pairing × text size in by writing the theme's CSS
// variables and stylesheet into the iframe only. It reports:
//   - overflow-x : the page is wider than the viewport (horizontal scroll)
//   - clipped    : text cut off inside an overflow:hidden/clip box (ellipsis and line-clamp are intended, skipped)
//   - nowrap     : no-wrap text wider than its box
//   - wrapped    : a button / tab / chip / badge label that is one line in the baseline but wraps now
//   - outside    : a label drawn outside its fixed-size control
// Problems already present in the baseline are listed separately and not counted against fonts.
// Heading line counts that grow versus the baseline are listed as notes (scenario 46).
;(function () {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  // Same API base the app uses (dev: http://localhost:8000/api/v1; production: /api/v1 behind nginx).
  const API = window.__NUXT__?.config?.public?.apiBase || '/api/v1'
  const DEFAULT_WIDTHS = [360, 390, 768, 1024, 1440]
  // Single-line controls (THM-31). Table headers may wrap by design; a header that gains a line is a note, not a failure.
  // Cards, full-cover overlay buttons (video titles) and .cap status lines hold multi-line content and may wrap.
  const LABELS = 'button:not(.card):not(.inset-0), a.btn, a.btn-secondary, .btn, .btn-secondary, .btn-o, .tab, [role=tab], .chip-size, .stage, nav a'

  async function json(url) {
    const r = await fetch(url, { credentials: 'include' })
    if (!r.ok) throw new Error(`${url} → ${r.status}`)
    return r.json()
  }

  async function discoverPages() {
    const pages = ['/', '/shop/new', '/cart', '/checkout', '/track', '/login', '/size-guide', '/contact', '/search?q=bra']
    try {
      const cats = await json(`${API}/categories/`)
      const c = (cats.results ?? cats)[0]
      if (c?.slug) pages.splice(1, 0, `/shop/${c.slug}`)
    } catch {}
    try {
      const prods = await json(`${API}/products/?page_size=1`)
      const p = (prods.results ?? prods)[0]
      if (p?.slug) pages.splice(2, 0, `/product/${p.slug}`)
    } catch {}
    pages.push('/account')
    // admin (needs the admin session in this browser)
    pages.push('/admin/login', '/admin', '/admin/orders', '/admin/products', '/admin/settings', '/admin/theme', '/admin/courier')
    try {
      const orders = await json(`${API}/admin/orders/?page_size=1`)
      const o = orders.results?.[0]
      if (o) pages.push(`/admin/orders?open=${o.id}`, `/admin/orders/${o.id}/slip`, `/admin/products/new`)
    } catch {}
    return pages
  }

  async function catalogue() {
    // The admin access cookie lasts 15 minutes; renew it the way the admin app does before reading the catalogue.
    try { await fetch(`${API}/admin/auth/refresh/`, { method: 'POST', credentials: 'include' }) } catch {}
    const t = await json(`${API}/admin/theme/`) // needs theme.manage (Owner)
    return { pairings: t.font_pairings, sizes: t.text_sizes.map((s) => s.key) }
  }

  function cssFor(p, size) {
    const a = p.adjust[size]
    return `:root{--font-display:${p.display}!important;--font-sans:${p.sans}!important;` +
      `--font-display-adjust:${a.display_adjust}!important;--font-sans-adjust:${a.sans_adjust}!important;}`
  }

  function loadFrame(frame, url) {
    return new Promise((resolve) => {
      const done = () => resolve()
      frame.addEventListener('load', done, { once: true })
      frame.src = url
      setTimeout(done, 15000)
    })
  }

  // Freeze carousels, marquees and transitions inside the test window: moving content would force a re-layout on
  // every measurement and make the audit crawl. Only the iframe is affected; the site itself is untouched.
  function freeze(doc) {
    const win = doc.defaultView
    const style = doc.createElement('style')
    style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'
    doc.head.appendChild(style)
    for (let id = 1; id < 5000; id++) { win.clearInterval(id); win.clearTimeout(id) }
    win.requestAnimationFrame = () => 0
    win.setInterval = () => 0
  }

  async function settle(doc) {
    try { await doc.fonts.ready } catch {}
    await sleep(150)
  }

  async function applyCombo(doc, p, size) {
    let link = doc.getElementById('audit-font-link')
    if (!link) { link = doc.createElement('link'); link.id = 'audit-font-link'; link.rel = 'stylesheet'; doc.head.appendChild(link) }
    if (link.href !== p.stylesheet) {
      const loaded = new Promise((r) => { link.onload = r; link.onerror = r; setTimeout(r, 8000) })
      link.href = p.stylesheet
      await loaded
    }
    let style = doc.getElementById('audit-font-style')
    if (!style) { style = doc.createElement('style'); style.id = 'audit-font-style'; doc.head.appendChild(style) }
    style.textContent = cssFor(p, size)
    await settle(doc)
  }

  function visible(el, win) {
    if (!el.getClientRects().length) return false
    if (el.closest('.sr-only')) return false // screen-reader text is clipped to 1px on purpose
    const cs = win.getComputedStyle(el)
    return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) !== 0
  }

  function pathOf(el) {
    const parts = []
    for (let e = el; e && e.nodeType === 1 && parts.length < 4; e = e.parentElement) {
      let s = e.tagName.toLowerCase()
      if (e.id) { s += `#${e.id}`; parts.unshift(s); break }
      const cls = [...e.classList].filter((c) => !c.includes(':') && !c.includes('[')).slice(0, 2)
      if (cls.length) s += '.' + cls.join('.')
      parts.unshift(s)
    }
    return parts.join(' > ')
  }

  const text = (el) => (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)

  // Lines of the longest-wrapping text node inside `el`. Counting per text node means items that merely sit at
  // different heights in a flex row (or a fallback glyph such as ৳ with its own ascent) are not mistaken for a wrap.
  function lineCount(el, doc) {
    const walker = doc.createTreeWalker(el, 4 /* NodeFilter.SHOW_TEXT */)
    const range = doc.createRange()
    let most = 0
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent.trim()) continue
      range.selectNodeContents(node)
      const rects = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1)
      if (!rects.length) continue
      const lh = Math.max(4, Math.min(...rects.map((r) => r.height)) * 0.6)
      const tops = []
      for (const r of rects.sort((x, y) => x.top - y.top)) if (!tops.length || r.top - tops[tops.length - 1] > lh) tops.push(r.top)
      most = Math.max(most, tops.length)
    }
    return most
  }

  // Elements worth checking, collected once per page load (font swaps do not change the DOM): visible elements
  // with their own text, with the style values that decide whether overflow is intended.
  async function collect(doc) {
    const win = doc.defaultView
    const textEls = []
    let n = 0
    for (const el of doc.body.querySelectorAll('*')) { // eslint-disable-line no-restricted-syntax
      if (++n % 300 === 0) await sleep(0)
      const hasText = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())
      if (!hasText || !visible(el, win)) continue
      const cs = win.getComputedStyle(el)
      textEls.push({ el, overflowX: cs.overflowX, whiteSpace: cs.whiteSpace, display: cs.display,
        intended: cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none', heading: /^H[1-4]$/.test(el.tagName),
        key: pathOf(el) + '|' + text(el) })
    }
    const labelEls = [...doc.body.querySelectorAll(LABELS)].filter((el) => visible(el, win) && text(el))
      .map((el) => ({ el, key: pathOf(el) + '|' + text(el), overflow: win.getComputedStyle(el).overflow }))
    return { textEls, labelEls }
  }

  async function scan(doc, items) {
    const win = doc.defaultView
    const vw = doc.documentElement.clientWidth
    const issues = []
    const add = (type, el, extra = '') => issues.push({ type, where: pathOf(el), text: text(el), extra })
    const lines = {}
    const labels = {}

    if (doc.documentElement.scrollWidth > vw + 1) {
      // name the widest culprits
      const wide = items.textEls.map((i) => i.el)
        .filter((e) => e.getBoundingClientRect().right > vw + 1)
        .slice(0, 3)
      issues.push({ type: 'overflow-x', where: wide.map(pathOf).join(' | ') || 'document', text: '', extra: `${doc.documentElement.scrollWidth}px > ${vw}px` })
    }

    let n = 0
    for (const { el, overflowX, whiteSpace, display, intended, heading, key } of items.textEls) {
      if (++n % 200 === 0) await sleep(0)
      const overX = el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0
      const clipX = overflowX === 'hidden' || overflowX === 'clip'
      const scrolls = overflowX === 'auto' || overflowX === 'scroll'
      if (overX && clipX && !intended) add('clipped', el, `${el.scrollWidth}>${el.clientWidth}`)
      else if (overX && whiteSpace === 'nowrap' && !scrolls && !intended && display !== 'inline') {
        // only a problem when the overflow is actually visible outside the parent box
        const p = el.parentElement?.getBoundingClientRect()
        const r = el.getBoundingClientRect()
        if (p && el.scrollWidth > p.width + 1) add('nowrap', el, `${el.scrollWidth}>${Math.round(p.width)}`)
        else if (r.right > vw + 1) add('nowrap', el, 'past viewport')
      }
      if (heading || el.tagName === 'TH') lines[key] = lineCount(el, doc)
    }

    for (const { el, key, overflow } of items.labelEls) {
      if (++n % 200 === 0) await sleep(0)
      labels[key] = lineCount(el, doc)
      const r = el.getBoundingClientRect()
      const range = doc.createRange(); range.selectNodeContents(el)
      const tr = range.getBoundingClientRect()
      if (overflow !== 'visible' || r.height < 2) continue
      if (tr.width > 0 && (tr.right > r.right + 2 || tr.left < r.left - 2 || tr.bottom > r.bottom + 2 || tr.top < r.top - 2)) add('outside', el)
    }
    return { issues, lines, labels }
  }

  function diff(base, cur) {
    const baseKeys = new Set(base.issues.map((i) => i.type + i.where + i.text))
    const fresh = cur.issues.filter((i) => !baseKeys.has(i.type + i.where + i.text))
    for (const [k, n] of Object.entries(cur.labels)) {
      if (base.labels[k] === 1 && n > 1) {
        const [where, t] = k.split('|')
        fresh.push({ type: 'wrapped', where, text: t, extra: `${n} lines` })
      }
    }
    const notes = []
    for (const [k, n] of Object.entries(cur.lines)) {
      if (base.lines[k] && n > base.lines[k]) notes.push({ heading: k.split('|')[1], from: base.lines[k], to: n })
    }
    return { fresh, notes }
  }

  window.typographyAudit = async function (opts = {}) {
    const { pairings: all, sizes: allSizes } = await catalogue()
    const pairings = opts.pairings ? all.filter((p) => opts.pairings.includes(p.key)) : all
    const sizes = opts.sizes ?? allSizes
    const widths = opts.widths ?? DEFAULT_WIDTHS
    const pages = opts.pages ?? await discoverPages()
    const signature = all.find((p) => p.key === 'signature')
    const frame = document.createElement('iframe')
    frame.style.cssText = 'position:fixed;left:0;top:0;height:900px;border:0;z-index:2147483647;background:#fff;opacity:0.02;pointer-events:none'
    document.body.appendChild(frame)
    const result = { started: new Date().toISOString(), baseline: [], failures: [], notes: [], skipped: [], checked: 0 }
    window.__typographyAudit = result
    try {
      for (const width of widths) {
        frame.style.width = `${width}px`
        for (const page of pages) {
          await loadFrame(frame, page)
          const doc = frame.contentDocument
          await sleep(1200) // client-rendered pages (admin) finish after load
          freeze(doc)
          await settle(doc)
          const landed = frame.contentWindow.location.pathname
          if (!page.startsWith(landed) && landed.includes('login') && !page.includes('login')) {
            result.skipped.push({ page, width, reason: `redirected to ${landed}` }); continue
          }
          await applyCombo(doc, signature, 'standard')
          const items = await collect(doc)
          const base = await scan(doc, items)
          for (const i of base.issues) result.baseline.push({ page, width, ...i })
          for (const p of pairings) {
            for (const size of sizes) {
              if (p.key === 'signature' && size === 'standard') continue
              await applyCombo(doc, p, size)
              const { fresh, notes } = diff(base, await scan(doc, items))
              result.checked++
              // Proof the swap took effect: what the browser actually uses for a heading and the body.
              const h = doc.querySelector('h1, h2')
              const cs = h && doc.defaultView.getComputedStyle(h)
              const bs = doc.defaultView.getComputedStyle(doc.body)
              ;(result.applied ??= []).push({ page, width, pairing: p.key, size,
                heading: cs ? `${cs.fontFamily.split(',')[0]} / ${cs.fontSizeAdjust}` : '-',
                body: `${bs.fontFamily.split(',')[0]} / ${bs.fontSizeAdjust}` })
              for (const f of fresh) result.failures.push({ page, width, pairing: p.key, size, ...f })
              for (const n of notes) result.notes.push({ page, width, pairing: p.key, size, ...n })
            }
          }
          result.progress = `${width}px ${page}`
          try { sessionStorage.setItem('typographyAudit', JSON.stringify(result)) } catch {} // survives a reload
        }
      }
    } finally {
      frame.remove()
      result.finished = new Date().toISOString()
    }
    console.log(`Typography audit: ${result.checked} combinations, ${result.failures.length} failures, ${result.baseline.length} baseline issues, ${result.skipped.length} skipped`)
    if (result.failures.length) console.table(result.failures)
    if (result.baseline.length) console.table(result.baseline)
    return result
  }
})()
