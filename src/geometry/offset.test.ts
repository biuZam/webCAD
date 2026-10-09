import { describe, expect, it } from 'vitest'
import type { Entity, PathEntity } from '../document/model'
import { emptyBounds, entityBounds } from './bounds'
import { pathLength, toPaperPath } from './kernel'
import { clipperOffset, OFFSET_TOLERANCE, offsetEntity, offsetSide, type OffsetShape } from './offset'
import { rectangleSegments } from './shapes'

const base = { id: 'e', layerId: 'l', lineStyle: 'solid', strokeWidth: 0.2 } as const
const square: PathEntity = { ...base, type: 'path', closed: true, segments: rectangleSegments([0, 0], [100, 60]) }
const rounded: PathEntity = { ...base, type: 'path', closed: true, segments: rectangleSegments([0, 0], [100, 60], 10) }
const open: PathEntity = {
  ...base,
  type: 'path',
  closed: false,
  segments: [{ p: [0, 0] }, { p: [50, 0] }, { p: [50, 30] }],
}

function bounds(shapes: OffsetShape[]) {
  const b = emptyBounds()
  for (const s of shapes) entityBounds({ ...base, ...s } as Entity, b)
  return b
}

describe('offsetEntity', () => {
  it('offsets circles exactly, and collapses them to nothing', () => {
    const circle: Entity = { ...base, type: 'circle', center: [0, 0], rx: 10, ry: 10, rotation: 0 }
    expect(offsetEntity(circle, -3, 'round')).toEqual({
      method: 'exact',
      warnings: [],
      shapes: [{ type: 'circle', center: [0, 0], rx: 7, ry: 7, rotation: 0 }],
    })
    expect(offsetEntity(circle, -10, 'round').shapes).toEqual([])
  })

  it('moves a centre line along Paper’s normal (+ is above a left→right line)', () => {
    const line: Entity = { ...base, type: 'centreLine', from: [0, 0], to: [10, 0] }
    expect(offsetEntity(line, 2, 'miter').shapes[0]).toEqual({
      type: 'path',
      closed: false,
      segments: [{ p: [0, -2] }, { p: [10, -2] }],
    })
  })

  it('offsets a closed path outward (+) and inward (−) with clean quality', () => {
    const out = offsetEntity(square, 4, 'miter')
    expect(out.method).toBe('paperjs-offset')
    expect(out.warnings).toEqual([])
    const b = bounds(out.shapes)
    expect([b.minX, b.minY, b.maxX, b.maxY].map((v) => Math.round(v * 1000) / 1000)).toEqual([-4, -4, 104, 64])
    const inner = bounds(offsetEntity(square, -3.5, 'miter').shapes)
    expect(inner.minX).toBeCloseTo(3.5, 3)
    expect(inner.maxY).toBeCloseTo(56.5, 3)
  })

  it('round joins round the outside corners; miter keeps them sharp', () => {
    const lengthOf = (join: 'round' | 'miter') => {
      const s = offsetEntity(square, 5, join).shapes[0]
      return s.type === 'path' ? pathLength(s) : 0
    }
    // Perimeter grows by 8d with miter corners and by 2πd with round corners.
    expect(lengthOf('miter')).toBeCloseTo(320 + 8 * 5, 1)
    expect(lengthOf('round')).toBeCloseTo(320 + 2 * Math.PI * 5, 1)
  })

  it.each([
    ['r10 inset 4', 10, -4],
    ['r10 outset 4', 10, 4],
    ['r3 inset 2.5 (tight)', 3, -2.5],
    ['r20 inset 8', 20, -8],
  ])('keeps every curved point within %s of the requested distance (≤ 0.02 mm), as curves', (_, r, d) => {
    const source: PathEntity = { ...rounded, segments: rectangleSegments([0, 0], [100, 60], r) }
    const result = offsetEntity(source, d, 'round')
    expect(result.method).toBe('paperjs-offset')
    const s = result.shapes[0]
    expect(s.type === 'path' && s.segments.some((seg) => seg.hi || seg.ho)).toBe(true)
    if (s.type !== 'path') return
    // Independent dense check, not the sampled one the implementation uses.
    const src = toPaperPath(source)
    const out = toPaperPath(s)
    let worst = 0
    for (let i = 0; i < 1000; i++) {
      const p = out.getPointAt((out.length * i) / 1000)
      worst = Math.max(worst, Math.abs(src.getNearestPoint(p).getDistance(p) - Math.abs(d)))
    }
    expect(worst).toBeLessThanOrEqual(OFFSET_TOLERANCE)
  })

  it('offsets an open path to one side only', () => {
    const left = offsetEntity(open, 3, 'miter').shapes[0]
    expect(left.type === 'path' && left.closed).toBe(false)
    const b = bounds([left])
    // + is the normal side: above the first (rightward) segment, and right of the second (downward) one.
    expect(b.minY).toBeCloseTo(-3, 3)
    expect(b.maxX).toBeCloseTo(53, 3)
  })
})

describe('offsetSide', () => {
  it('uses inside/outside for closed shapes and the normal side for open ones', () => {
    expect(offsetSide(square, [50, 30])).toBe(-1)
    expect(offsetSide(square, [150, 30])).toBe(1)
    expect(offsetSide(open, [25, -5])).toBe(1)
    expect(offsetSide(open, [25, 5])).toBe(-1)
  })
})

describe('clipperOffset fallback', () => {
  it('offsets a flattened closed shape within the flattening tolerance', () => {
    const shapes = clipperOffset(toPaperPath(rounded), -4, 'round')
    expect(shapes).toHaveLength(1)
    const b = bounds(shapes)
    expect(b.minX).toBeCloseTo(4, 2)
    expect(b.maxX).toBeCloseTo(96, 2)
    expect(b.maxY).toBeCloseTo(56, 2)
  })

  it('splits into separate shapes when an inward offset pinches a waist', () => {
    // A dumbbell: two 20×20 squares joined by a 4 mm-wide neck. Insetting by 3 mm removes the neck.
    const dumbbell: PathEntity = {
      ...base,
      type: 'path',
      closed: true,
      segments: [
        [0, 0],
        [20, 0],
        [20, 8],
        [40, 8],
        [40, 0],
        [60, 0],
        [60, 20],
        [40, 20],
        [40, 12],
        [20, 12],
        [20, 20],
        [0, 20],
      ].map((p) => ({ p: p as [number, number] })),
    }
    expect(clipperOffset(toPaperPath(dumbbell), -3, 'miter')).toHaveLength(2)
  })
})
