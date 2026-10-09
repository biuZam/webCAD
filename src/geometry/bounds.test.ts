import { describe, expect, it } from 'vitest'
import type { Entity } from '../document/model'
import { entityBounds } from './bounds'

const base = { id: 'e', layerId: 'l', lineStyle: 'solid', strokeWidth: 0.1 } as const

describe('entityBounds', () => {
  it('uses curve extrema, not control points', () => {
    // Quarter-ish bulge: control points reach y = -10 but the curve peaks at -7.5.
    const e: Entity = {
      ...base,
      type: 'path',
      closed: false,
      segments: [
        { p: [0, 0], ho: [0, -10] },
        { p: [10, 0], hi: [0, -10] },
      ],
    }
    const b = entityBounds(e)
    expect(b.minY).toBeCloseTo(-7.5)
    expect(b.maxY).toBe(0)
    expect([b.minX, b.maxX]).toEqual([0, 10])
  })

  it('handles rotated ellipses', () => {
    const e: Entity = { ...base, type: 'circle', center: [0, 0], rx: 10, ry: 5, rotation: 90 }
    const b = entityBounds(e)
    expect(b.maxX).toBeCloseTo(5)
    expect(b.maxY).toBeCloseTo(10)
  })
})
