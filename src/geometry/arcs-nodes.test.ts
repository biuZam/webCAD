import { describe, expect, it } from 'vitest'
import type { Segment } from '../document/model'
import { distance, type Vec2 } from '../lib/vec2'
import { arcThrough, circleThrough } from './arcs'
import { toPaperPath } from './kernel'
import { insertAnchor, isSmooth, moveAnchor, moveHandle, nodePosition, removeAnchor, toggleSmooth } from './nodes'

/** Max |distance to centre − r| sampled along the whole (open) path. */
function radialError(segments: Segment[], centre: Vec2, r: number) {
  const path = toPaperPath({ segments, closed: false })
  let worst = 0
  for (let i = 0; i <= 200; i++) {
    const p = path.getPointAt((path.length * i) / 200)
    worst = Math.max(worst, Math.abs(distance([p.x, p.y], centre) - r))
  }
  return worst
}

describe('circleThrough', () => {
  it('finds the circle through three points, and rejects collinear ones', () => {
    const c = circleThrough([10, 0], [0, 10], [-10, 0])!
    expect(c.centre[0]).toBeCloseTo(0)
    expect(c.centre[1]).toBeCloseTo(0)
    expect(c.radius).toBeCloseTo(10)
    expect(circleThrough([0, 0], [5, 5], [10, 10])).toBeNull()
  })
})

describe('arcThrough', () => {
  it('draws the arc from start to end that passes through the middle point', () => {
    // A half circle below the x axis (y-down: positive y is lower on screen).
    const segs = arcThrough([-20, 0], [0, 20], [20, 0])!
    expect(segs[0].p).toEqual([-20, 0])
    expect(segs.at(-1)!.p).toEqual([20, 0])
    expect(segs).toHaveLength(3) // 180° → two cubics
    expect(radialError(segs, [0, 0], 20)).toBeLessThan(0.006)
    const mid = toPaperPath({ segments: segs, closed: false }).getPointAt(
      toPaperPath({ segments: segs, closed: false }).length / 2,
    )
    expect(mid.y).toBeCloseTo(20, 1) // went through (0, 20), not (0, −20)
  })

  it('takes the long way round when the through point demands it (a 270° arc)', () => {
    // Start right, end at the top; through the left: three quarters of the circle.
    const segs = arcThrough([10, 0], [-10, 0], [0, -10])!
    expect(segs).toHaveLength(4) // 270° → three cubics
    expect(radialError(segs, [0, 0], 10)).toBeLessThan(0.003)
    const pts = toPaperPath({ segments: segs, closed: false })
    expect(pts.length).toBeCloseTo((3 / 4) * 2 * Math.PI * 10, 1)
  })

  it('returns null for collinear points', () => {
    expect(arcThrough([0, 0], [1, 0], [2, 0])).toBeNull()
  })
})

describe('node editing', () => {
  const smooth: Segment = { p: [10, 0], hi: [-4, 0], ho: [6, 0] }
  const path: Segment[] = [{ p: [0, 0] }, smooth, { p: [20, 0] }]

  it('recognises smooth anchors (opposite, collinear handles)', () => {
    expect(isSmooth(smooth)).toBe(true)
    expect(isSmooth({ p: [0, 0], hi: [-4, 0], ho: [0, 6] })).toBe(false)
    expect(isSmooth({ p: [0, 0], ho: [6, 0] })).toBe(false)
  })

  it('moves an anchor with its handles', () => {
    const out = moveAnchor(path, 1, [10, 5])
    expect(nodePosition(out[1], 'ho')).toEqual([16, 5])
  })

  it('keeps a smooth anchor smooth: the opposite handle swings, keeping its length', () => {
    const out = moveHandle(path, 1, 'ho', [10, 6]) // straight down
    expect(out[1].ho).toEqual([0, 6])
    expect(out[1].hi![0]).toBeCloseTo(0)
    expect(out[1].hi![1]).toBeCloseTo(-4)
    expect(isSmooth(out[1])).toBe(true)
  })

  it('moves a corner handle on its own, and removes a handle dragged onto its anchor', () => {
    const corner: Segment[] = [
      { p: [0, 0], ho: [3, 0] },
      { p: [10, 0], hi: [-3, 1], ho: [3, 3] },
    ]
    expect(moveHandle(corner, 1, 'ho', [10, 8])[1].hi).toEqual([-3, 1])
    expect(moveHandle(corner, 1, 'ho', [10, 0])[1].ho).toBeUndefined()
  })

  it('toggles corner ↔ smooth', () => {
    const corner: Segment[] = [{ p: [0, 0] }, { p: [10, 10] }, { p: [20, 0] }]
    const s = toggleSmooth(corner, false, 1)
    expect(isSmooth(s[1])).toBe(true)
    // Along prev→next (horizontal here), a third of the distance to each neighbour (√200 / 3).
    expect(s[1].ho![0]).toBeCloseTo(Math.hypot(10, 10) / 3)
    expect(s[1].ho![1]).toBeCloseTo(0)
    expect(toggleSmooth(s, false, 1)[1]).toEqual({ p: [10, 10] })
  })
})

describe('adding and removing points', () => {
  it('splits a straight segment without adding handles', () => {
    const square: Segment[] = [{ p: [0, 0] }, { p: [10, 0] }, { p: [10, 10] }, { p: [0, 10] }]
    expect(insertAnchor(square, 0, 0.25)[1]).toEqual({ p: [2.5, 0] })
    // The closing segment (last → first) of a closed path.
    expect(insertAnchor(square, 3, 0.5)).toEqual([...square, { p: [0, 5] }])
  })

  it('splits a curve without changing its shape; the new point is smooth', () => {
    const s: Segment[] = [
      { p: [0, 0], ho: [5, -10] },
      { p: [20, 0], hi: [0, -8] },
    ]
    const before = toPaperPath({ segments: s, closed: false })
    const split = insertAnchor(s, 0, 0.4)
    expect(split).toHaveLength(3)
    expect(isSmooth(split[1])).toBe(true)
    const after = toPaperPath({ segments: split, closed: false })
    expect(after.length).toBeCloseTo(before.length, 9)
    for (let i = 0; i <= 50; i++) {
      const p = after.getPointAt((after.length * i) / 50)
      expect(before.getNearestPoint(p).getDistance(p)).toBeLessThan(1e-6)
    }
  })

  it('removes a point unless the path would get too short', () => {
    const line: Segment[] = [{ p: [0, 0] }, { p: [5, 5] }, { p: [10, 0] }]
    expect(removeAnchor(line, false, 1)).toEqual([{ p: [0, 0] }, { p: [10, 0] }])
    expect(removeAnchor(line.slice(0, 2), false, 0)).toBeNull()
    expect(removeAnchor(line, true, 0)).toBeNull()
  })
})
