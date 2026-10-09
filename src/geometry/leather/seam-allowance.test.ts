import { describe, expect, it } from 'vitest'
import type { Segment } from '../../document/model'
import type { Vec2 } from '../../lib/vec2'
import { entityBounds } from '../bounds'
import { closedArea, type Shape } from '../edit'
import { pathLength } from '../kernel'
import { shapeToPath } from '../offset'
import { rectangleSegments } from '../shapes'
import { outlineEdges, seamAllowance } from './seam-allowance'

const rect: Shape = { segments: rectangleSegments([0, 0], [100, 60]), closed: true }
const bounds = (s: Shape) => {
  const b = entityBounds({ type: 'path', ...s } as never)
  return [b.minX, b.minY, b.maxX, b.maxY].map((v) => Math.round(v * 1e6) / 1e6)
}
const asEntity = (s: Shape) =>
  ({ type: 'path', id: '', layerId: '', lineStyle: 'solid', strokeWidth: 0, ...s }) as const

describe('outline edges', () => {
  it('splits an outline at its corners, in path order', () => {
    expect(outlineEdges(rect).map((e) => pathLength(e))).toEqual([100, 60, 100, 60].map((v) => expect.closeTo(v, 9)))
    // No corners: one closed edge.
    const circle = shapeToPath({ type: 'circle', center: [0, 0], rx: 10, ry: 10, rotation: 0 })
    expect(outlineEdges(circle)).toHaveLength(1)
  })
})

describe('seam allowance (L6)', () => {
  it('moves each edge out by its own allowance, with mitred corners', () => {
    const out = seamAllowance(rect, [10, 5, 10, 5])!
    expect(out.closed).toBe(true)
    expect(bounds(out)).toEqual([-5, -10, 105, 70])
    expect(closedArea(asEntity(out))).toBeCloseTo(110 * 80, 6)
    expect(out.segments).toHaveLength(4)
  })

  it('keeps an edge with zero allowance where it is', () => {
    const out = seamAllowance(rect, [0, 10, 0, 10])!
    expect(bounds(out)).toEqual([-10, 0, 110, 60])
  })

  it('works whichever way the outline runs', () => {
    const reversed: Shape = { segments: [...rect.segments].reverse(), closed: true }
    expect(bounds(seamAllowance(reversed, [7])!)).toEqual([-7, -7, 107, 67])
  })

  it('cuts back inside corners (an L shape)', () => {
    const pts: Vec2[] = [
      [0, 0],
      [60, 0],
      [60, 20],
      [20, 20],
      [20, 60],
      [0, 60],
    ]
    const ell: Shape = { segments: pts.map((p): Segment => ({ p })), closed: true }
    const out = seamAllowance(ell, [5])!
    expect(bounds(out)).toEqual([-5, -5, 65, 65])
    // Uniform 5 mm round an L: the outline's inside corner moves to (25, 25).
    expect(out.segments.map((s) => s.p.map((v) => Math.round(v * 1e6) / 1e6))).toContainEqual([25, 25])
  })

  it('offsets a corner-less outline uniformly', () => {
    const circle = shapeToPath({ type: 'circle', center: [0, 0], rx: 10, ry: 10, rotation: 0 })
    expect(bounds(seamAllowance(circle, [5])!)).toEqual([-15, -15, 15, 15])
  })

  it('handles a curved edge meeting a straight one (a D shape), each with its own allowance', () => {
    // Straight back on x = 0 from (0, 40) up to (0, 0), then a half circle of radius 20 bulging right.
    const k = 20 * 0.5522847498307936
    const d: Shape = {
      closed: true,
      segments: [
        { p: [0, 0], ho: [k, 0] },
        { p: [20, 20], hi: [0, -k], ho: [0, k] },
        { p: [0, 40], hi: [k, 0] },
      ],
    }
    const edges = outlineEdges(d)
    expect(edges).toHaveLength(2)
    const curveFirst = pathLength(edges[0]) > 40
    const out = seamAllowance(d, curveFirst ? [10, 3] : [3, 10])!
    const [minX, minY, maxX, maxY] = bounds(out)
    expect(minX).toBeCloseTo(-3, 2)
    expect(maxX).toBeCloseTo(30, 1)
    // The curve's offset tangents run straight up/down at the back; extended to meet the back edge.
    expect(minY).toBeCloseTo(-10, 1)
    expect(maxY).toBeCloseTo(50, 1)
  })
})
