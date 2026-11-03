// SRS THM-05, UI-09, scenario 18. Fails when a raw colour literal appears outside assets/css/tokens.css (THM-05, UI-09).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const SKIP_DIRS = new Set(['node_modules', '.nuxt', '.output', '.git', 'dist', 'tests'])
const ALLOWED = new Set(['assets/css/tokens.css'])
const EXT = /\.(vue|ts|js|mjs|css|scss|html)$/
const PATTERNS = [
  /#[0-9a-fA-F]{3,8}\b/,
  /\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\s*\(/
]

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (!SKIP_DIRS.has(name)) yield* walk(p)
    } else if (EXT.test(name)) yield p
  }
}

let bad = 0
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file).split('\\').join('/')
  if (ALLOWED.has(rel) || rel === 'scripts/check-colors.mjs') continue
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    // ignore URL fragments / anchors in href-like strings and Tailwind arbitrary-id selectors
    if (PATTERNS.some((re) => re.test(line))) {
      console.error(`${rel}:${i + 1}: raw colour literal — use a theme token\n  ${line.trim()}`)
      bad++
    }
  })
}
if (bad) {
  console.error(`\n${bad} raw colour literal(s) found. Colours live only in assets/css/tokens.css.`)
  process.exit(1)
}
console.log('check-colors: OK')
