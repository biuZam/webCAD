// Reports keys present in `en` but missing from other locales (and keys that no longer exist in `en`).
// Usage: pnpm i18n:check [--strict]   --strict exits non-zero on any missing key (zh-CN release gate).

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..', 'src', 'locales')
const strict = process.argv.includes('--strict')

function flatten(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix]
  return Object.entries(obj).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k))
}

function keysOf(lang: string): Set<string> {
  const keys = new Set<string>()
  for (const file of readdirSync(join(root, lang)).filter((f) => f.endsWith('.json'))) {
    const ns = file.replace(/\.json$/, '')
    for (const k of flatten(JSON.parse(readFileSync(join(root, lang, file), 'utf8')))) keys.add(`${ns}:${k}`)
  }
  return keys
}

const en = keysOf('en')
let missingTotal = 0
for (const lang of readdirSync(root).filter((d) => d !== 'en')) {
  const keys = keysOf(lang)
  const missing = [...en].filter((k) => !keys.has(k))
  const stale = [...keys].filter((k) => !en.has(k))
  missingTotal += missing.length
  console.log(`${lang}: ${en.size - missing.length}/${en.size} keys translated`)
  for (const k of missing) console.log(`  missing  ${k}`)
  for (const k of stale) console.log(`  stale    ${k}`)
}
if (strict && missingTotal > 0) process.exit(1)
