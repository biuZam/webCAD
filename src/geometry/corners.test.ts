import { describe, expect, it } from 'vitest'
import type { Segment } from '../document/model'
import { distance, type Vec2 } from '../lib/vec2'
import { applyToCorners, chamferCorner, chamferDistanceForAngle, cornerAt, corners, filletCorner } from './corners'
import { pathLength, toPaperPath } from './kernel'
import { rectangleSegments } from './shapes'

const rect = rectangleSegments([0, 0], [100, 60]) // (0,0) (100,0) (100,60) (0,60), closed
const ok = (r: ReturnType<typeof filletCorner>) => {
  if ('error' in r) throw new Error(r.error)
  return r.segments
}
const r3 = (p: Vec2) => p.map((v) => Math.round(v * 1000) / 1000)

/** Max |distance to centre − r| along the arc between anchors a and a+1. */
function arcError(segments: Segment[], a: number, centre: Vec2, r: number) {
  const path = toPaperPath({ segments, closed: true })
  const curve = path.curves[a]
  let worst = 0
  for (let i = 0; i <= 20; i++) {
    const p = curve.getPointAtTime(i / 20)
    worst = Math.max(worst, Math.abs(distance([p.x, p.y], centre) - r))
  }
  return worst
}

describe('corners', () => {
  it('finds every straight-straight corner, and none next to curves or along straight runs', () => {
    expect(corners(rect, true)).toEqual([0, 1, 2, 3])
    expect(corners(rectangleSegments([0, 0], [100, 60], 5), true)).toEqual([])
    const straightRun: Segment[] = [{ p: [0, 0] }, { p: [50, 0] }, { p: [100, 0] }, { p: [100, 50] }]
    expect(corners(straightRun, false)).toEqual([2])
  })
})

describe('filletCorner', () => {
  it('replaces a right-angle corner with a tangent arc of the given radius', () => {
    const segs = ok(filletCorner(rect, true, 0, 10))
    expect(segs).toHaveLength(5)
    expect(r3(segs[0].p)).toEqual([0, 10]) // on the incoming edge (from (0,60))
    expect(r3(segs[1].p)).toEqual([10, 0]) // on the outgoing edge (to (100,0))
    // The closing curve (anchor 4 → 0) is straight; the arc is the curve from anchor 0 to 1.
    expect(arcError(segs, 0, [10, 10], 10)).toBeLessThan(0.003) // cubic approximation of a quarter circle
    expect(pathLength({ segments: segs, closed: true })).toBeCloseTo(320 - 20 + (Math.PI / 2) * 10, 2)
  })

  it('fillets every corner (Shift-click): length = perimeter − 8r + 2πr', () => {
    const segs = ok(applyToCorners(rect, corners(rect, true), (s, i) => filletCorner(s, true, i, 10)))
    expect(segs).toHaveLength(8)
    expect(pathLength({ segments: segs, closed: true })).toBeCloseTo(320 - 80 + 2 * Math.PI * 10, 1)
  })

  it('handles non-right angles: the arc is tangent to both edges at radius r', () => {
    // Triangle with a 60° corner at the origin.
    const tri: Segment[] = [{ p: [0, 0] }, { p: [100, 0] }, { p: [50, -50 * Math.sqrt(3)] }]
    const r = 8
    const segs = ok(filletCorner(tri, true, 0, r))
    // Centre lies on the bisector at r / sin(θ/2) = 2r from the corner. A 120° sweep is split into two cubics.
    const bis: Vec2 = [Math.cos(-Math.PI / 6), Math.sin(-Math.PI / 6)]
    const centre: Vec2 = [bis[0] * 2 * r, bis[1] * 2 * r]
    expect(segs).toHaveLength(3 - 1 + 3)
    expect(Math.max(arcError(segs, 0, centre, r), arcError(segs, 1, centre, r))).toBeLessThan(0.001)
    // Tangent at both ends: the arc's end points lie on the original edges at distance r / tan(30°) = r·√3.
    expect(distance(segs[0].p, [0, 0])).toBeCloseTo(r * Math.sqrt(3))
    expect(distance(segs[2].p, [0, 0])).toBeCloseTo(r * Math.sqrt(3))
  })

  it('refuses a radius that doesn’t fit, saying the largest that does', () => {
    const tooBig = filletCorner(rect, true, 0, 70)
    expect('error' in tooBig && tooBig.error).toBe('tooLarge')
    expect('max' in tooBig && tooBig.max).toBeCloseTo(60)
    // Two fillets sharing the 60 mm edge can't both have r = 40.
    expect('error' in applyToCorners(rect, [0, 3], (s, i) => filletCorner(s, true, i, 40))).toBe(true)
  })

  it('rejects anchors that are not corners', () => {
    const open: Segment[] = [{ p: [0, 0] }, { p: [10, 0] }, { p: [10, 10] }]
    expect(filletCorner(open, false, 0, 2)).toEqual({ error: 'notACorner' }) // path end
    expect('segments' in filletCorner(open, false, 1, 2)).toBe(true)
  })
})

describe('chamferCorner', () => {
  it('cuts by two distances', () => {
    const r = chamferCorner(rect, true, 0, 5, 10)
    expect('segments' in r && r.segments.map((s) => r3(s.p)).slice(0, 2)).toEqual([
      [0, 5],
      [10, 0],
    ])
  })

  it('derives the second distance from an angle (law of sines)', () => {
    const c = cornerAt(rect, true, 0)!
    expect(chamferDistanceForAngle(c, 5, 45)).toBeCloseTo(5)
    expect(chamferDistanceForAngle(c, 5, 30)).toBeCloseTo((5 * Math.sin(Math.PI / 6)) / Math.sin(Math.PI / 3))
    expect(chamferDistanceForAngle(c, 5, 90)).toBeNull() // parallel to the other edge: never meets it
  })
})
