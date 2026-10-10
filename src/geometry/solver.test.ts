import { describe, expect, it } from 'vitest'
import type { CircleEntity, Constraint, PathEntity, Piece } from '../document/model'
import { constraintResidual, isSatisfied } from './constraints'
import { solve } from './solver'

const base = { layerId: 'l', lineStyle: 'solid', strokeWidth: 0.2 } as const
const line = (id: string, a: [number, number], b: [number, number]): PathEntity => ({
  ...base,
  id,
  type: 'path',
  closed: false,
  segments: [{ p: a }, { p: b }],
})
const circle = (id: string, center: [number, number], r: number): CircleEntity => ({
  ...base,
  id,
  type: 'circle',
  center,
  rx: r,
  ry: r,
  rotation: 0,
})
const piece = (...entities: Piece['entities']): Piece => ({
  id: 'p',
  name: 'P',
  quantity: 1,
  mirrored: false,
  entities,
})
const apply = (p: Piece, entities: Piece['entities']): Piece => ({
  ...p,
  entities: p.entities.map((e) => entities.find((x) => x.id === e.id) ?? e),
})

describe('solver', () => {
  it('makes a line parallel to a pinned one, keeping its length', async () => {
    const p = piece(line('a', [0, 0], [100, 0]), line('b', [0, 20], [90, 50]))
    const c: Constraint = { id: 'c', type: 'parallel', a: { entityId: 'a', edge: 0 }, b: { entityId: 'b', edge: 0 } }
    const r = await solve({
      piece: p,
      constraints: [c],
      pinned: [
        { entityId: 'a', index: 0 },
        { entityId: 'a', index: 1 },
      ],
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const solved = apply(p, r.entities)
    expect(isSatisfied(constraintResidual(solved, c))).toBe(true)
    expect(r.entities.map((e) => e.id)).toEqual(['b'])
  })

  it('sets a distance dimension and a perpendicular', async () => {
    const p = piece(line('a', [0, 0], [100, 0]), line('b', [0, 0], [10, 80]))
    const cs: Constraint[] = [
      { id: 'c1', type: 'perpendicular', a: { entityId: 'a', edge: 0 }, b: { entityId: 'b', edge: 0 } },
      { id: 'c2', type: 'distance', a: { entityId: 'b', index: 0 }, b: { entityId: 'b', index: 1 }, value: 60 },
    ]
    const r = await solve({
      piece: p,
      constraints: cs,
      pinned: [
        { entityId: 'a', index: 0 },
        { entityId: 'a', index: 1 },
        { entityId: 'b', index: 0 },
      ],
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const solved = apply(p, r.entities)
    for (const c of cs) expect(isSatisfied(constraintResidual(solved, c))).toBe(true)
  })

  it('makes a circle tangent to a line without changing its radius', async () => {
    const p = piece(line('a', [0, 0], [100, 0]), circle('c', [50, 30], 10))
    const c: Constraint = { id: 'c', type: 'tangent', line: { entityId: 'a', edge: 0 }, circle: 'c' }
    const r = await solve({
      piece: p,
      constraints: [c],
      pinned: [
        { entityId: 'a', index: 0 },
        { entityId: 'a', index: 1 },
      ],
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const solved = apply(p, r.entities)
    expect(isSatisfied(constraintResidual(solved, c))).toBe(true)
    expect((solved.entities[1] as CircleEntity).rx).toBeCloseTo(10, 6)
  })

  it('changes a radius dimension', async () => {
    const p = piece(circle('c', [50, 30], 10))
    const c: Constraint = { id: 'r', type: 'radius', circle: 'c', value: 25 }
    const r = await solve({ piece: p, constraints: [c], pinned: [{ entityId: 'c', index: 0 }] })
    expect(r.ok && (r.entities[0] as CircleEntity).rx).toBeCloseTo(25, 6)
  })

  it('reports conflicting constraints and broken references', async () => {
    const p = piece(line('a', [0, 0], [100, 0]))
    const both: Constraint[] = [
      { id: 'c1', type: 'distance', a: { entityId: 'a', index: 0 }, b: { entityId: 'a', index: 1 }, value: 50 },
      { id: 'c2', type: 'distance', a: { entityId: 'a', index: 0 }, b: { entityId: 'a', index: 1 }, value: 70 },
    ]
    const pins = [
      { entityId: 'a', index: 0 },
      { entityId: 'a', index: 1 },
    ]
    expect(await solve({ piece: p, constraints: both, pinned: pins })).toMatchObject({ ok: false })
    const gone: Constraint = { id: 'c3', type: 'radius', circle: 'nope', value: 5 }
    expect(await solve({ piece: p, constraints: [gone], pinned: [] })).toEqual({ ok: false, reason: 'broken' })
  })
})
