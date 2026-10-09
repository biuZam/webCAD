// T3.9 Bundle budget: the initial download (entry script, everything it preloads, and CSS) must stay under the
// PRD's 600 KB gzipped. Lazy chunks (PDF export, other locales) are reported but don't count.
// Usage (after `vite build`): pnpm bundle:check

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

// Overridable to test the failure path: BUNDLE_BUDGET_KB=100 pnpm bundle:check
const BUDGET_KB = Number(process.env.BUNDLE_BUDGET_KB ?? 600)
const dist = join(import.meta.dirname, '..', 'dist')
const html = readFileSync(join(dist, 'index.html'), 'utf8')

const initial = new Set<string>()
for (const m of html.matchAll(/<script[^>]+type="module"[^>]+src="\/?([^"]+)"/g)) initial.add(m[1])
for (const m of html.matchAll(/<link[^>]+rel="(?:modulepreload|stylesheet)"[^>]+href="\/?([^"]+)"/g)) initial.add(m[1])
if (initial.size === 0) {
  console.error('No entry script found in dist/index.html. Run `pnpm build` first.')
  process.exit(1)
}

const gz = (file: string) => gzipSync(readFileSync(join(dist, file))).length / 1024
const kb = (n: number) => `${n.toFixed(1).padStart(7)} KB`

let total = 0
console.log('Initial download (gzipped):')
for (const file of [...initial].sort()) {
  const size = gz(file)
  total += size
  console.log(`  ${kb(size)}  ${file}`)
}
console.log(`  ${kb(total)}  total (budget ${BUDGET_KB} KB)`)

const lazy = readdirSync(join(dist, 'assets'))
  .map((f) => `assets/${f}`)
  .filter((f) => f.endsWith('.js') && !initial.has(f))
console.log('Lazy chunks (gzipped, not counted):')
for (const file of lazy.sort((a, b) => gz(b) - gz(a))) console.log(`  ${kb(gz(file))}  ${file}`)

if (total > BUDGET_KB) {
  console.error(`\nInitial bundle ${total.toFixed(1)} KB exceeds the ${BUDGET_KB} KB budget.`)
  process.exit(1)
}
