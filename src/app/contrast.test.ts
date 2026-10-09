// T3.8 WCAG 2.2 AA contrast for the UI colour tokens in app.css, in both themes. Runs in CI, so a token change
// that breaks contrast fails the build. Text needs 4.5:1 (1.4.3); focus rings, control borders and other
// meaningful graphics need 3:1 against what they sit on (1.4.11).
/// <reference types="node" />
// (Node types for this test only: Vitest's CSS handling empties `?raw` imports of .css files.)
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./app.css', import.meta.url), 'utf8')
if (!css.includes(':root')) throw new Error('app.css not read')

function tokens(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]))
}
const light = tokens(css.slice(css.indexOf(':root {'), css.indexOf('@media (prefers-color-scheme: dark)')))
const darkBlock = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'))
const dark = { ...light, ...tokens(darkBlock.slice(0, darkBlock.indexOf('\n}\n'))) }

/** The drawing sheet is always light (see app.css). */
const SHEET = '#fdfcf9'

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

type Pair = [fg: string, bg: string, min: number, what: string]
const pairs = (t: Record<string, string>): Pair[] => [
  // Text, 4.5:1
  [t.text, t.bg, 4.5, 'text on page'],
  [t.text, t.surface, 4.5, 'text on panels'],
  [t.text, t.pressed, 4.5, 'active layer row text'],
  [t.muted, t.bg, 4.5, 'muted text on page'],
  [t.muted, t.surface, 4.5, 'muted text on panels'],
  [t.invalid, t.surface, 4.5, 'error notice'],
  [t.accent, t.surface, 4.5, 'app title'],
  [t['on-accent'], t.accent, 4.5, 'primary button text'],
  [t['ruler-text'], t['ruler-bg'], 4.5, 'ruler labels'],
  // Non-text, 3:1
  [t.focus, t.surface, 3, 'focus ring on panels'],
  [t.focus, t.bg, 3, 'focus ring on page'],
  [t['control-border'], t.surface, 3, 'input border on panels'],
  [t['control-border'], t.bg, 3, 'input border on page'],
  [t.accent, t.pressed, 3, 'pressed tool icon'],
  [t.selection, SHEET, 3, 'selection on the sheet'],
  [t.snap, SHEET, 3, 'snap markers on the sheet'],
  [t.preview, SHEET, 3, 'tool previews on the sheet'],
]

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme contrast', (_, t) => {
  it.each(pairs(t).map(([fg, bg, min, what]) => [what, fg, bg, min] as const))('%s', (_what, fg, bg, min) => {
    expect(fg, 'token missing').toMatch(/^#/)
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min)
  })
})
