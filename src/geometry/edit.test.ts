import { describe, expect, it } from 'vitest'
import type { CentreLineEntity, CircleEntity, Entity, PathEntity } from '../document/model'
import type { Vec2 } from '../lib/vec2'
import { booleanOp, extend, join, shapeArea, splitAt, trim, type Shape } from './edit'
import { pathLength } from './kernel'
import { rectangleSegments } from './shapes'

const base = { layerId: 'l', lineStyle: 'solid', strokeWidth: 0.2 } as const
const path = (id: string, pts: Vec2[], closed = false): PathEntity => ({
  ...base,
  id,
  type: 'path',
  segments: pts.map((p) => ({ p })),
  closed,
})
const rect = (id: string, a: Vec2, b: Vec2): PathEntity => ({
  ...base,
  id,
  type: 'path',
  segments: rectangleSegments(a, b),
  closed: true,
})
const circle = (id: string, center: Vec2, r: number): CircleEntity => ({
  ...base,
  id,
  type: 'circle',
  center,
  rx: r,
  ry: r,
  rotation: 0,
})
const pts = (s: Shape) => s.segments.map((seg) => seg.p.map((v) => Math.round(v * 1e6) / 1e6))

describe('split', () => {
  it('splits an open path in two at the nearest point', () => {
    const parts = splitAt(
      path('a', [
        [0, 0],
        [10, 0],
        [10, 10],
      ]),
      [4, 0.3],
    )!
    expect(parts.map(pts)).toEqual([
      [
        [0, 0],
        [4, 0],
      ],
      [
        [4, 0],
        [10, 0],
        [10, 10],
      ],
    ])
  })

  it('opens a closed path at the point', () => {
    const [open] = splitAt(rect('r', [0, 0], [10, 10]), [5, -0.2])!
    expect(open.closed).toBe(false)
    expect(pts(open)[0]).toEqual([5, 0])
    expect(pts(open).at(-1)).toEqual([5, 0])
    expect(pathLength(open)).toBeCloseTo(40, 9)
  })

  it('refuses at an open end, and works on circles (as curves)', () => {
    expect(
      splitAt(
        path('a', [
          [0, 0],
          [10, 0],
        ]),
        [0, 0],
      ),
    ).toBeNull()
    const [arc] = splitAt(circle('c', [0, 0], 10), [10, 0])!
    // Paper's 4-cubic circle is ~0.03 % longer than the true one.
    expect(pathLength(arc)).toBeCloseTo(2 * Math.PI * 10, 1)
  })
})

describe('trim', () => {
  const cutter = path('k', [
    [5, -5],
    [5, 15],
  ])

  it('removes the clicked piece of an open path between cutting edges', () => {
    const line = path('a', [
      [0, 0],
      [10, 0],
    ])
    expect(trim(line, [cutter], [8, 0])!.map(pts)).toEqual([
      [
        [0, 0],
        [5, 0],
      ],
    ])
    expect(trim(line, [cutter], [2, 0])!.map(pts)).toEqual([
      [
        [5, 0],
        [10, 0],
      ],
    ])
    // Between two cutters: both outer pieces stay.
    const second = path('k2', [
      [8, -5],
      [8, 5],
    ])
    expect(trim(line, [cutter, second], [6, 0])!.map(pts)).toEqual([
      [
        [0, 0],
        [5, 0],
      ],
      [
        [8, 0],
        [10, 0],
      ],
    ])
    expect(
      trim(
        line,
        [
          path('far', [
            [0, 50],
            [1, 50],
          ]),
        ],
        [2, 0],
      ),
    ).toBeNull()
  })

  it('cuts a notch out of a closed outline, leaving one open path', () => {
    const square = rect('r', [0, 0], [10, 10])
    const [left] = trim(square, [cutter], [8, 5])! // remove the part right of x = 5
    expect(left.closed).toBe(false)
    expect(pathLength(left)).toBeCloseTo(20, 9) // 5 + 10 + 5
    for (const [x] of pts(left)) expect(x).toBeLessThanOrEqual(5)
  })

  it('trims a circle to an arc', () => {
    const [arc] = trim(
      circle('c', [0, 0], 10),
      [
        path('k', [
          [0, -20],
          [0, 20],
        ]),
      ],
      [10, 0],
    )!
    expect(pathLength(arc)).toBeCloseTo(Math.PI * 10, 1)
  })
})

describe('extend', () => {
  const wall = path('w', [
    [20, -10],
    [20, 10],
  ])

  it('lengthens a straight end to the nearest boundary', () => {
    const line = path('a', [
      [0, 0],
      [10, 0],
    ])
    expect(pts(extend(line, [wall], [9, 0])!)).toEqual([
      [0, 0],
      [20, 0],
    ])
    // The other end has nothing in its way.
    expect(extend(line, [wall], [1, 0])).toBeNull()
  })

  it('adds a straight segment to a curved end, along its tangent', () => {
    const curve: PathEntity = {
      ...path('a', []),
      segments: [
        { p: [0, 5], ho: [5, 0] },
        { p: [10, 0], hi: [-5, 0] },
      ],
    }
    const out = extend(curve, [wall], [10, 0])!
    expect(out.segments).toHaveLength(3)
    expect(pts(out).at(-1)).toEqual([20, 0])
  })

  it('extends centre lines', () => {
    const axis: CentreLineEntity = { ...base, id: 'x', type: 'centreLine', from: [0, 0], to: [10, 0] }
    expect(pts(extend(axis, [wall], [10, 0])!)).toEqual([
      [0, 0],
      [20, 0],
    ])
  })
})

describe('join', () => {
  it('joins two open paths at their nearest ends, merging coincident ends', () => {
    const a: Shape = { segments: [{ p: [0, 0] }, { p: [10, 0] }], closed: false }
    const b: Shape = { segments: [{ p: [10, 10] }, { p: [10, 0] }], closed: false }
    expect(pts(join(a, b)!)).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
    ])
  })

  it('bridges a gap with a straight segment and closes when both ends meet', () => {
    const a: Shape = { segments: [{ p: [0, 0] }, { p: [10, 0] }, { p: [10, 10] }], closed: false }
    const b: Shape = { segments: [{ p: [10, 10] }, { p: [0, 10] }, { p: [0, 0] }], closed: false }
    const joined = join(a, b)!
    expect(joined.closed).toBe(true)
    expect(pts(joined)).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ])
    const gap: Shape = { segments: [{ p: [12, 0] }, { p: [20, 0] }], closed: false }
    expect(pts(join({ segments: a.segments.slice(0, 2), closed: false }, gap)!)).toEqual([
      [0, 0],
      [10, 0],
      [12, 0],
      [20, 0],
    ])
  })

  it('closes a single path whose ends meet', () => {
    const loop: Shape = { segments: [{ p: [0, 0] }, { p: [10, 0] }, { p: [0, 10] }, { p: [0, 0] }], closed: false }
    expect(join(loop)).toMatchObject({ closed: true })
    expect(join({ segments: loop.segments.slice(0, 3), closed: false })).toBeNull()
  })
})

describe('booleans', () => {
  const a = rect('a', [0, 0], [10, 10])
  const b = rect('b', [5, 0], [15, 10])

  it('unites overlapping shapes into one outline', () => {
    const [u, ...more] = booleanOp('union', [a, b])
    expect(more).toHaveLength(0)
    expect(shapeArea(u)).toBeCloseTo(150, 6)
  })

  it('subtracts the others from the first; an inner cut-out becomes its own outline', () => {
    expect(shapeArea(booleanOp('difference', [a, b])[0])).toBeCloseTo(50, 6)
    const window = booleanOp('difference', [rect('big', [0, 0], [40, 40]), circle('hole', [20, 20], 5)])
    expect(window).toHaveLength(2)
    expect(window.map(shapeArea).sort((x, y) => x - y)[1]).toBeCloseTo(1600, 6)
  })

  it('ignores open paths', () => {
    expect(
      booleanOp('union', [
        path('p', [
          [0, 0],
          [1, 1],
        ]),
      ] as Entity[]),
    ).toEqual([])
  })
})
