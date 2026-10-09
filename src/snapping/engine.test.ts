import { describe, expect, it } from 'vitest'
import { createProject } from '../document/factory'
import type { Entity, Project } from '../document/model'
import { rectangleSegments } from '../geometry/shapes'
import { snap, SNAP_KINDS, type SnapKind } from './engine'

function project(...entities: Entity[]): Project {
  const p = createProject()
  p.pieces[0].entities.push(...entities.map((e) => ({ ...e, layerId: p.layers[0].id })))
  return p
}
const base = { layerId: '', lineStyle: 'solid', strokeWidth: 0.1 } as const
const square: Entity = { ...base, id: 'sq', type: 'path', segments: rectangleSegments([0, 0], [10, 10]), closed: true }
const circle: Entity = { ...base, id: 'c', type: 'circle', center: [30, 0], rx: 5, ry: 5, rotation: 0 }
const all = new Set(SNAP_KINDS)
const only = (...k: SnapKind[]) => new Set(k)
const opts = (enabled = all as ReadonlySet<SnapKind>, from: [number, number] | null = null) => ({
  enabled,
  tolerance: 2,
  gridStep: 1,
  from,
})

describe('snap', () => {
  const p = project(square, circle)

  it('prefers an endpoint over nearest', () => {
    expect(snap(p, [10.5, 9.4], opts())).toEqual({ kind: 'endpoint', point: [10, 10] })
  })

  it('snaps to the midpoint of an edge, including the closing edge', () => {
    expect(snap(p, [5.2, 0.4], opts())).toEqual({ kind: 'midpoint', point: [5, 0] })
    expect(snap(p, [0.3, 5.5], opts())).toEqual({ kind: 'midpoint', point: [0, 5] })
  })

  it('snaps to a circle centre', () => {
    expect(snap(p, [30.5, 0.5], opts())).toEqual({ kind: 'centre', point: [30, 0] })
  })

  it('snaps to intersections', () => {
    const q = project(square, { ...circle, center: [10, 5], rx: 3, ry: 3 })
    const r = snap(q, [10.4, 2.3], opts(only('intersection')))!
    expect(r.kind).toBe('intersection')
    expect(r.point[0]).toBeCloseTo(10)
    expect(r.point[1]).toBeCloseTo(2)
  })

  it('snaps perpendicular to an edge from the previous point', () => {
    const r = snap(p, [3.5, 9.6], opts(only('perpendicular'), [3, 20]))!
    expect(r).toEqual({ kind: 'perpendicular', point: [3, 10] })
  })

  it('snaps tangent to a circle from the previous point', () => {
    // From (30, -10), tangents to r=5 at the origin-centred circle touch at y = -2.5.
    const r = snap(p, [25.5, -2.5], opts(only('tangent'), [30, -10]))!
    expect(r.kind).toBe('tangent')
    expect(r.point[0]).toBeCloseTo(30 - 5 * Math.sin(Math.PI / 3))
    expect(r.point[1]).toBeCloseTo(-2.5)
  })

  it('falls back to nearest, then grid, then nothing', () => {
    expect(snap(p, [6.2, 0.7], opts(only('nearest', 'grid')))!.kind).toBe('nearest')
    expect(snap(p, [50.4, 50.6], opts(only('nearest', 'grid')))).toEqual({ kind: 'grid', point: [50, 51] })
    expect(snap(p, [50.4, 50.6], opts(only('endpoint')))).toBeNull()
  })

  it('respects the tolerance', () => {
    expect(snap(p, [13, 13], opts(only('endpoint')))).toBeNull()
  })
})
