// MCP leather and shape tools (P2), and the PRD acceptance drawing built entirely through MCP.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { acceptanceProject } from '../document/fixtures'
import type { CircleEntity, HoleSetEntity, PathEntity, Project } from '../document/model'
import { exportSvg } from '../export/svg'
import { startServer } from './test-harness'

let h: Awaited<ReturnType<typeof startServer>>
const call = (name: string, args?: Record<string, unknown>) => h.call(name, args)
const project = (docId: string) => h.sessions.get(docId).store.getState().project

beforeEach(async () => {
  h = await startServer()
})
afterEach(() => h.client.close())

async function card() {
  const { docId } = await call('new_project')
  const { created } = await call('add_rect', { docId, x: 0, y: 0, width: 100, height: 60 })
  return { docId, outline: created[0] as string }
}

describe('stitching', () => {
  it('adds a linked stitch line with holes in one undo step, and both follow the outline', async () => {
    const { docId, outline } = await card()
    const r = await call('add_stitch_line', { docId, sourceId: outline, withHoles: true, pitch: 4 })
    // Line and holes together: the holes (Ø 1.2) stick out 0.6 mm past the line.
    expect(r.bounds).toEqual([2.9, 2.9, 97.1, 57.1])
    expect(r.length).toBe(2 * (93 + 53))
    // Corner-aware: a hole on each corner, pitch stretched per edge to fit (~292 / 4).
    expect(r.holes).toBe((h.entities(docId)[2] as HoleSetEntity).holes.length)
    expect(r.holes).toBeGreaterThan(70)
    expect(h.entities(docId).map((e) => !!e.aiCreated)).toEqual([true, true, true])

    await call('transform', { docId, ids: [outline], operation: { op: 'move', dx: 10, dy: 0 } })
    const [, line, holes] = h.entities(docId) as [PathEntity, PathEntity, HoleSetEntity]
    expect(line.derived?.sourceId).toBe(outline)
    expect(Math.min(...holes.holes.map((p) => p[0]))).toBeCloseTo(13.5, 6)

    await call('undo', { docId, steps: 2 })
    expect(h.entities(docId)).toHaveLength(1)
  })

  it('needs a side on open lines and maps left/right as seen on screen', async () => {
    const { docId } = await call('new_project')
    const { created } = await call('add_lines', {
      docId,
      points: [
        [0, 0],
        [50, 0],
      ],
    })
    await expect(call('add_stitch_line', { docId, sourceId: created[0] })).rejects.toThrow(/left.*right/)
    // Walking +x on a y-down screen, left is up (negative y).
    const left = await call('add_stitch_line', { docId, sourceId: created[0], side: 'left', margin: 3 })
    expect(left.bounds).toEqual([0, -3, 50, -3])
  })

  it('refuses a locked stitch layer', async () => {
    const { docId, outline } = await card()
    await call('update_layer', { docId, layer: 'stitch', locked: true })
    await expect(call('add_stitch_holes', { docId, sourceId: outline })).rejects.toThrow(/stitch layer is locked/)
  })
})

describe('seam allowance and notches', () => {
  it('lists edges and grows each by its own allowance', async () => {
    const { docId, outline } = await card()
    const { edges } = await call('outline_edges', { docId, id: outline })
    expect(edges.map((e: { length: number }) => e.length)).toEqual([100, 60, 100, 60])
    const r = await call('add_seam_allowance', { docId, id: outline, allowances: [10, 0, 5, 0] })
    // Edge 0 is the top (y = 0) going right: rectangleSegments starts at the top-left corner.
    expect(r.bounds).toEqual([0, -10, 100, 65])
  })

  it('notches point into closed outlines', async () => {
    const { docId, outline } = await card()
    const r = await call('add_notch', { docId, id: outline, at: [50, 0], count: 2 })
    expect(r.created).toHaveLength(2)
    expect(r.bounds).toEqual([48.5, 0, 51.5, 4])
  })
})

describe('shapes', () => {
  it('fillets all corners, or reports the largest radius that fits', async () => {
    const { docId, outline } = await card()
    await expect(call('fillet', { docId, id: outline, radius: 40 })).rejects.toThrow(/at most \d+(\.\d+)? mm/)
    await call('fillet', { docId, id: outline, radius: 5 })
    expect((h.entities(docId)[0] as PathEntity).segments).toHaveLength(8)
    expect((await call('measure', { docId, id: outline })).area).toBeCloseTo(6000 - (4 - Math.PI) * 25, 1)
  })

  it('chamfers chosen corners', async () => {
    const { docId, outline } = await card()
    await expect(call('chamfer', { docId, id: outline, d1: 3, corners: [9] })).rejects.toThrow(/Corners: 0, 1, 2, 3/)
    await call('chamfer', { docId, id: outline, d1: 3, corners: [0] })
    expect((h.entities(docId)[0] as PathEntity).segments).toHaveLength(5)
  })

  it('joins segments, explodes paths and cuts windows', async () => {
    const { docId } = await call('new_project')
    const { created } = await call('add_lines', {
      docId,
      points: [
        [0, 0],
        [40, 0],
        [40, 40],
        [0, 40],
      ],
      closed: true,
    })
    const joined = await call('join', { docId, ids: created })
    expect(h.entities(docId)).toHaveLength(1)
    expect((h.entities(docId)[0] as PathEntity).closed).toBe(true)
    await call('explode', { docId, ids: joined.created })
    expect(h.entities(docId)).toHaveLength(4)

    const base = await call('add_rect', { docId, x: 100, y: 0, width: 50, height: 50 })
    const hole = await call('add_circle', { docId, center: [125, 25], r: 10 })
    const r = await call('boolean', { docId, ids: [hole.created[0], base.created[0]], op: 'difference' })
    expect(r.created).toHaveLength(2)
    expect(h.entities(docId).filter((e) => e.type === 'circle')).toHaveLength(0)
  })

  it('arrays copies; copied stitch lines follow their own outline', async () => {
    const { docId, outline } = await card()
    const { stitchLineId } = await call('add_stitch_line', { docId, sourceId: outline })
    await expect(call('array', { docId, ids: [stitchLineId], count: 2, linear: { dx: 0, dy: 70 } })).rejects.toThrow(
      /include its source/,
    )
    const r = await call('array', { docId, ids: [outline, stitchLineId], count: 3, linear: { dx: 0, dy: 70 } })
    expect(r.created).toHaveLength(4)
    expect(r.bounds).toEqual([0, 70, 100, 200])
    const lines = h.entities(docId).filter((e): e is PathEntity => e.type === 'path' && !!e.derived)
    expect(new Set(lines.map((l) => l.derived!.sourceId)).size).toBe(3)

    const { created } = await call('add_circle', { docId, center: [0, 0], r: 1 })
    const ring = await call('array', { docId, ids: created, count: 4, circular: { center: [0, 10], sweep: 360 } })
    const circleAt = (id: string) => (h.entities(docId).find((e) => e.id === id) as CircleEntity).center.map(Math.round)
    const centres = [created[0], ...ring.created].map(circleAt)
    // Clockwise on screen from the top: right, bottom, left.
    expect(centres).toEqual([
      [0, 0],
      [10, 10],
      [0, 20],
      [-10, 10],
    ])
  })
})

describe('PRD acceptance drawing', () => {
  /** SVG with layer ids replaced by kinds and entity ids dropped, so projects with different ids compare. */
  const svgOf = (p: Project) =>
    p.layers
      .reduce((svg, l) => svg.replaceAll(`layer-${l.id}`, `layer-${l.kind}`), exportSvg(p, { includeLabels: true }))
      .replace(/ id="(?!layer-)[^"]*"/g, '')

  it('built through MCP, exports the same SVG as the fixture', async () => {
    const { docId } = await call('new_project', { name: 'Acceptance test' })
    const style = { strokeWidth: 0.1 }
    const { created } = await call('add_entities', {
      docId,
      items: [
        { kind: 'rect', x: 0, y: 0, width: 100, height: 100, ...style },
        { kind: 'circle', center: [50, 50], r: 25, ...style },
        { kind: 'centreLine', from: [50, 0], to: [50, 100], ...style },
      ],
    })
    const holes = await call('add_stitch_holes', {
      docId,
      sourceId: created[0],
      margin: -4,
      pitch: 3.85,
      holeSize: 1.2,
      slitAngle: 0,
    })
    await call('set_style', { docId, ids: [holes.created[0]], strokeWidth: 0.1 })
    // The fixture's order: outline, circle, holes, centre line.
    const p = project(docId)
    const [rect, circle, holeSet, centre] = p.pieces[0].entities
    const ordered = { ...p, pieces: [{ ...p.pieces[0], entities: [rect, circle, centre, holeSet] }] }
    expect(svgOf(ordered)).toBe(svgOf(acceptanceProject()))
  })
})
