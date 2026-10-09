import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { IntlMessageFormat } from 'intl-messageformat'
import { TYPE, parse, type MessageFormatElement } from '@formatjs/icu-messageformat-parser'
import { describe, expect, it } from 'vitest'

// Every locale's messages must compile as ICU and use exactly the placeholders of the English message,
// so a translated string can never show a raw "{name}" or drop a value.

const root = join(__dirname, '..', 'locales')
type Tree = { [key: string]: string | Tree }

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>()
  for (const [k, v] of Object.entries(tree)) {
    if (typeof v === 'string') out.set(prefix + k, v)
    else for (const [kk, vv] of flatten(v, `${prefix}${k}.`)) out.set(kk, vv)
  }
  return out
}

function variables(elements: MessageFormatElement[], into = new Set<string>()): Set<string> {
  for (const el of elements) {
    if (el.type === TYPE.argument || el.type === TYPE.number || el.type === TYPE.date || el.type === TYPE.time)
      into.add(el.value)
    if (el.type === TYPE.plural || el.type === TYPE.select) {
      into.add(el.value)
      for (const option of Object.values(el.options)) variables(option.value, into)
    }
    if (el.type === TYPE.tag) variables(el.children, into)
  }
  return into
}

const load = (lang: string, ns: string) => flatten(JSON.parse(readFileSync(join(root, lang, ns), 'utf8')) as Tree)
const namespaces = readdirSync(join(root, 'en'))
const languages = readdirSync(root).filter((l) => l !== 'en')

describe.each(languages)('%s locale', (lang) => {
  it.each(namespaces)('%s: same keys and placeholders as en, valid ICU', (ns) => {
    const en = load('en', ns)
    const other = load(lang, ns)
    expect(
      [...other.keys()].filter((k) => !en.has(k)),
      'keys not in en',
    ).toEqual([])
    for (const [key, message] of other) {
      expect(() => new IntlMessageFormat(message, lang), key).not.toThrow()
      const want = [...variables(parse(en.get(key)!))].sort()
      expect([...variables(parse(message))].sort(), key).toEqual(want)
    }
  })
})
