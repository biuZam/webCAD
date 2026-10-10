// A happy-dom window installed as Node globals, for the exporters that need a DOM (PDF via svg2pdf.js, SVG
// import via DOMParser). Installed once, lazily, the first time such a tool runs: other tools stay DOM-free.
// Never jsdom: see CLAUDE.md.

import { stubCanvas } from '../lib/headless-canvas'

let ready: Promise<void> | undefined

export function ensureDom(): Promise<void> {
  ready ??= (async () => {
    const { Window } = await import('happy-dom')
    const window = new Window()
    const g = globalThis as Record<string, unknown>
    const w = window as unknown as Record<string, unknown>
    // Only what Node lacks: its own fetch, URL, timers, TextEncoder… stay.
    for (const key of Object.getOwnPropertyNames(window)) {
      if (key in g) continue
      const value = w[key]
      // Methods (getComputedStyle…) need their window as `this`; classes (DOMParser, SVGElement…) must not be bound.
      g[key] = typeof value === 'function' && /^[a-z]/.test(key) ? value.bind(window) : value
    }
    g.window = window
    g.document = window.document
    stubCanvas()
  })()
  return ready
}
