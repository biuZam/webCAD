import { describe, expect, it } from 'vitest'
import type { Segment } from '../../document/model'
import { distance, type Vec2 } from '../../lib/vec2'
import { pathLength } from '../kernel'
import { shapeToPath } from '../offset'
import { rectangleSegments } from '../shapes'
import { distributeHoles } from './stitch-holes'

const rect = { segments: rectangleSegments([0, 0], [100, 60]), closed: true }
const round3 = (p: Vec2) => p.map((v) => Math.round(v * 1000) / 1000)
const gaps = (holes: Vec2[], closed: boolean) => {
  const out = holes.slice(1).map((h, i) => distance(holes[i], h))
  if (closed) out.push(distance(holes[holes.length - 1], holes[0]))
  return out
}

describe('distributeHoles — corner-aware (L3)', () => {
  const layout = distributeHoles(rect, 3.85, 'cornerAware')

  it('puts a hole on every corner', () => {
    const holes = layout.holes.map(round3)
    for (const corner of [
      [0, 0],
      [100, 0],
      [100, 60],
      [0, 60],
    ])
      expect(holes).toContainEqual(corner)
  })

  it('uses round(span / pitch) even gaps per side: 26 + 16 + 26 + 16 = 84 holes', () => {
    expect(layout.holes).toHaveLength(84)
    const g = gaps(layout.holes, true)
    // Long sides: 100 / 26 = 3.846; short sides: 60 / 16 = 3.75. No other gap sizes exist.
    const sizes = [...new Set(g.map((v) => v.toFixed(3)))].sort()
    expect(sizes).toEqual(['3.750', '3.846'])
  })

  it('records the path direction at each hole (clockwise degrees, y-down)', () => {
    const i = layout.holes.findIndex((h) => h[1] === 0 && h[0] > 1 && h[0] < 99)
    expect(layout.angles[i]).toBeCloseTo(0) // along the top edge, rightwards
    const j = layout.holes.findIndex((h) => Math.abs(h[0] - 100) < 1e-9 && h[1] > 1 && h[1] < 59)
    expect(layout.angles[j]).toBeCloseTo(90) // down the right edge
  })

  it('treats smooth joins as one span: a rounded rectangle has no corners and even spacing all round', () => {
    const rounded = { segments: rectangleSegments([0, 0], [100, 60], 10), closed: true }
    const r = distributeHoles(rounded, 3.85, 'cornerAware')
    expect(r.corners).toEqual([])
    // Holes are spaced by arc length. Measured as straight chords, gaps on an r = 10 arc come out
    // 2r·sin(step / 2r) ≈ 0.024 mm shorter than on the straights, which is expected, not uneven spacing.
    const g = gaps(r.holes, true)
    const arcStep = pathLength(rounded) / r.holes.length
    // Even spacing: no gap longer than the arc-length step, none more than 1 % shorter (the chord effect on an
    // r = 10 arc is ~0.6 %).
    expect(Math.max(...g)).toBeLessThanOrEqual(arcStep + 1e-6)
    expect(Math.min(...g)).toBeGreaterThan(arcStep * 0.99)
  })

  it('spaces holes evenly round a circle', () => {
    const circle = shapeToPath({ type: 'circle', center: [0, 0], rx: 20, ry: 20, rotation: 0 })
    const r = distributeHoles(circle, 3, 'cornerAware')
    expect(r.holes).toHaveLength(Math.round((2 * Math.PI * 20) / 3)) // 42
    // 0.027 % radial error is the four-Bézier circle approximation itself, not the hole placement.
    for (const h of r.holes) expect(Math.abs(distance(h, [0, 0]) - 20)).toBeLessThan(0.006)
  })

  it('handles open lines: holes at both ends and at the corner', () => {
    const l: { segments: Segment[]; closed: boolean } = {
      segments: [{ p: [0, 0] }, { p: [50, 0] }, { p: [50, 30] }],
      closed: false,
    }
    const r = distributeHoles(l, 3.85, 'cornerAware')
    // 50 / 3.85 → 13 gaps, 30 / 3.85 → 8 gaps, plus the end hole: 13 + 8 + 1.
    expect(r.holes).toHaveLength(22)
    const holes = r.holes.map(round3)
    expect(holes[0]).toEqual([0, 0])
    expect(holes).toContainEqual([50, 0])
    expect(holes.at(-1)).toEqual([50, 30])
  })

  it('still puts holes on the corners of spans shorter than the pitch', () => {
    const tiny = { segments: rectangleSegments([0, 0], [2, 2]), closed: true }
    expect(distributeHoles(tiny, 3.85, 'cornerAware').holes.map(round3)).toEqual([
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
    ])
  })

  it('finds the corners where a curve meets a line at an angle (a D shape)', () => {
    // Straight back from (0, 40) up to (0, 0), then a bulging Bézier back down: two corners.
    const d = {
      closed: true,
      segments: [
        { p: [0, 0] as Vec2, ho: [30, 0] as Vec2 },
        { p: [0, 40] as Vec2, hi: [30, 0] as Vec2 },
      ],
    }
    const r = distributeHoles(d, 3.85, 'cornerAware')
    expect(r.corners).toHaveLength(2)
    expect(r.holes.map(round3)).toContainEqual([0, 0])
    expect(r.holes.map(round3)).toContainEqual([0, 40])
  })
})

describe('distributeHoles — fixed pitch (L2)', () => {
  it('spaces holes exactly at the pitch from the start', () => {
    const r = distributeHoles(rect, 3.85, 'fixed')
    // Perimeter 320; stop half a pitch before closing: floor((320 − 1.925) / 3.85) + 1 = 83.
    expect(r.holes).toHaveLength(83)
    const g = gaps(r.holes, false).filter((_, i) => i % 26 !== 25) // skip gaps that cut across a corner
    for (const v of g.slice(0, 20)) expect(v).toBeCloseTo(3.85, 6)
  })

  it('returns nothing for degenerate input', () => {
    expect(distributeHoles({ segments: [{ p: [0, 0] }], closed: false }, 3, 'fixed').holes).toEqual([])
    expect(distributeHoles(rect, 0, 'fixed').holes).toEqual([])
  })
})
