import { describe, expect, it } from 'vitest'
import { createProject } from '../document/factory'
import type { Segment } from '../document/model'
import { exportDxf } from '../export/dxf'
import { entityBounds } from '../geometry/bounds'
import { pathLength, toPaperPath } from '../geometry/kernel'
import { rectangleSegments } from '../geometry/shapes'
import { DxfImportError, importDxf, splineToBezier } from './dxf-import'
import type { ImportedShape } from './svg-import'

/** A DXF with the given header units and entity groups (code/value pairs). */
function dxf(entities: (string | number)[][], insunits?: number) {
  const pairs: (string | number)[] = []
  if (insunits !== undefined) pairs.push(0, 'SECTION', 2, 'HEADER', 9, '$INSUNITS', 70, insunits, 0, 'ENDSEC')
  pairs.push(0, 'SECTION', 2, 'ENTITIES')
  for (const e of entities) pairs.push(...e)
  pairs.push(0, 'ENDSEC', 0, 'EOF')
  return pairs.join('\n') + '\n'
}
const box = (s: ImportedShape) => {
  const b = entityBounds({ type: 'path', ...s } as never)
  return [b.minX, b.minY, b.maxX, b.maxY].map((v) => Math.round(v * 1e4) / 1e4 || 0)
}

describe('DXF import (T5.3)', () => {
  it('reads lines in mm with y flipped, and scales by $INSUNITS', () => {
    const line = [0, 'LINE', 8, '0', 10, 0, 20, 0, 11, 100, 21, 50]
    expect(importDxf(dxf([line], 4)).shapes[0].segments.map((s) => s.p)).toEqual([
      [0, 0],
      [100, -50],
    ])
    expect(box(importDxf(dxf([line], 1)).shapes[0])).toEqual([0, -1270, 2540, 0]) // inches
    expect(box(importDxf(dxf([line])).shapes[0])).toEqual([0, -50, 100, 0]) // unitless: mm
  })

  it('reads closed LWPOLYLINEs with bulge arcs', () => {
    // A 20 × 10 slot: straight sides, semicircular ends (bulge 1 = 180°).
    const slot = [
      0,
      'LWPOLYLINE',
      90,
      4,
      70,
      1,
      10,
      0,
      20,
      0,
      10,
      20,
      20,
      0,
      42,
      1,
      10,
      20,
      20,
      10,
      10,
      0,
      20,
      10,
      42,
      1,
    ]
    const [s] = importDxf(dxf([slot])).shapes
    expect(s.closed).toBe(true)
    expect(box(s)).toEqual([-5, -10, 25, 0])
    expect(pathLength(s)).toBeCloseTo(40 + Math.PI * 10, 1)
  })

  it('reads circles, arcs and ellipses', () => {
    const shapes = importDxf(
      dxf([
        [0, 'CIRCLE', 10, 10, 20, 10, 40, 5],
        [0, 'ARC', 10, 0, 20, 0, 40, 10, 50, 0, 51, 90],
        [0, 'ELLIPSE', 10, 0, 20, 0, 11, 20, 21, 0, 40, 0.5, 41, 0, 42, 6.283185307179586],
      ]),
    ).shapes
    expect(box(shapes[0])).toEqual([5, -15, 15, -5])
    expect(pathLength(shapes[1])).toBeCloseTo((Math.PI * 20) / 4, 2)
    // The quarter arc from (10, 0) to (0, 10) in y-up lands from (10, 0) to (0, −10) in y-down.
    expect(shapes[1].segments.at(-1)!.p.map((v) => Math.round(v * 1e6) / 1e6 || 0)).toEqual([0, -10])
    expect(box(shapes[2])).toEqual([-20, -10, 20, 10])
  })

  it('turns a cubic spline into exact Bézier curves (knot insertion), matching de Boor evaluation', () => {
    const ctrl: [number, number][] = [
      [0, 0],
      [10, 20],
      [20, -10],
      [30, 15],
      [40, 0],
    ]
    const knots = [0, 0, 0, 0, 0.5, 1, 1, 1, 1]
    const segs = splineToBezier(3, knots, ctrl)!
    expect(segs).toHaveLength(3) // two Bézier spans
    // Compare with direct de Boor evaluation at many parameters.
    const deBoor = (u: number): [number, number] => {
      let k = 3
      while (k < knots.length - 5 && knots[k + 1] <= u) k++
      const d = Array.from({ length: 4 }, (_, j) => [...ctrl[j + k - 3]] as [number, number])
      for (let r = 1; r <= 3; r++)
        for (let j = 3; j >= r; j--) {
          const i = j + k - 3
          const a = (u - knots[i]) / (knots[i + 4 - r] - knots[i])
          d[j] = [(1 - a) * d[j - 1][0] + a * d[j][0], (1 - a) * d[j - 1][1] + a * d[j][1]]
        }
      return d[3]
    }
    const path = toPaperPath({ segments: segs, closed: false })
    for (let i = 0; i <= 40; i++) {
      const [x, y] = deBoor(Math.min(i / 40, 1 - 1e-12))
      const q = path.getNearestPoint([x, y] as unknown as paper.Point)
      expect(Math.hypot(q.x - x, q.y - y)).toBeLessThan(1e-9)
    }
    // And through the DXF reader (y flipped).
    const spline = [
      0,
      'SPLINE',
      70,
      8,
      71,
      3,
      72,
      9,
      73,
      5,
      ...knots.flatMap((k) => [40, k]),
      ...ctrl.flatMap(([x, y]) => [10, x, 20, y]),
    ]
    const [s] = importDxf(dxf([spline])).shapes
    expect(s.segments.at(-1)!.p).toEqual([40, 0])
    expect(s.segments[1].p[1]).toBeCloseTo(-deBoor(0.5)[1], 9)
  })

  it('round-trips our own DXF export at the same size; counts what it skips', () => {
    const p = createProject()
    p.pieces[0].entities.push({
      id: 'r',
      type: 'path',
      layerId: p.layers[0].id,
      lineStyle: 'solid',
      strokeWidth: 0.2,
      segments: rectangleSegments([10, 20], [110, 80]) as Segment[],
      closed: true,
    })
    const result = importDxf(exportDxf(p))
    expect(result.shapes).toHaveLength(4) // Maker.js writes four LINEs
    const all = result.shapes.flatMap((s) => s.segments.map((x) => x.p))
    expect(Math.min(...all.map((q) => q[0]))).toBe(10)
    expect(Math.max(...all.map((q) => q[1]))).toBe(80) // y flipped twice: back where it was
    expect(importDxf(dxf([[0, 'TEXT', 1, 'Hi', 10, 0, 20, 0, 40, 5]])).skipped).toBe(1)
  })

  it('rejects files that are not DXF', () => {
    expect(() => importDxf('<svg/>')).toThrow(DxfImportError)
  })
})
