// Timing probe for the offset accuracy check (not part of the regular suite: run with `pnpm test offset.bench`).
import { expect, it } from 'vitest'
import type { PathEntity } from '../document/model'
import { toPaperPath } from './kernel'
import { offsetEntity, offsetError } from './offset'
import { offset as paperOffset } from 'paperjs-offset'
import { rectangleSegments } from './shapes'

const base = { id: 'e', layerId: 'l', lineStyle: 'solid', strokeWidth: 0.2 } as const
const wavy: PathEntity = {
  ...base,
  type: 'path',
  closed: true,
  segments: Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2
    const r = 60 + 6 * Math.sin(a * 6)
    return {
      p: [r * Math.cos(a), r * Math.sin(a)] as [number, number],
      hi: [4 * Math.sin(a), -4 * Math.cos(a)] as [number, number],
      ho: [-4 * Math.sin(a), 4 * Math.cos(a)] as [number, number],
    }
  }),
}
const rounded: PathEntity = { ...base, type: 'path', closed: true, segments: rectangleSegments([0, 0], [100, 60], 10) }

function time(f: () => unknown, runs = 10) {
  f()
  const t = performance.now()
  for (let i = 0; i < runs; i++) f()
  return Math.round(((performance.now() - t) / runs) * 10) / 10
}

// The app tsconfig has no Node types; read the env var without them.
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}

it.skipIf(!env.BENCH)('offset timing', () => {
  const src = toPaperPath(wavy)
  const r = paperOffset(src, -3.5, { join: 'round', insert: false, algorithm: 'adaptive' })
  const report = {
    errorCheckWavy: time(() => offsetError(src, r, 3.5)),
    preciseWavy: time(() => offsetEntity(wavy, -3.5, 'round')),
    preciseRounded: time(() => offsetEntity(rounded, -4, 'round')),
    previewWavy: time(() => offsetEntity(wavy, -3.5, 'round', 'preview')),
  }
  expect(report).toEqual({})
})
