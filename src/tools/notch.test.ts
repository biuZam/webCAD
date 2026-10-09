import { beforeEach, describe, expect, it } from 'vitest'
import { addEntities } from '../document/commands'
import { createProject } from '../document/factory'
import type { Entity, PathEntity } from '../document/model'
import { createDocumentStore, type DocumentStore } from '../document/store'
import { DEFAULT_NOTCH, notchShapes } from '../geometry/leather/notches'
import { rectangleSegments } from '../geometry/shapes'
import { distance, type Vec2 } from '../lib/vec2'
import { createTools } from './index'
import { ToolSession, type SessionView } from './session'

let store: DocumentStore
let session: ToolSession
const view: SessionView = { zoom: 10, snaps: new Set(['midpoint']), activeLayerId: null }
const ev = (raw: Vec2) => ({ raw, button: 0, shift: false, alt: false })
function click(p: Vec2) {
  session.pointerMove(ev(p))
  session.pointerDown(ev(p))
  session.pointerUp(ev(p))
}
const base = { layerId: '', lineStyle: 'solid', strokeWidth: 0.2 } as const
const square: PathEntity = {
  ...base,
  id: 'sq',
  type: 'path',
  segments: rectangleSegments([0, 0], [40, 20]),
  closed: true,
}
const round = (pts: Vec2[]) => pts.map((p) => p.map((v) => Math.round(v * 1e6) / 1e6 || 0))

describe('notch geometry (L7)', () => {
  it('snips into a closed outline, square to the edge', () => {
    const [mark] = notchShapes(square, [15, 0.2], [15, -5], DEFAULT_NOTCH)
    // Into the piece (y grows downwards), even with the cursor outside.
    expect(round(mark.map((s) => s.p))).toEqual([
      [15, 0],
      [15, 4],
    ])
  })

  it('makes double notches gap apart along the edge, and V notches', () => {
    const marks = notchShapes(square, [40, 10], [0, 0], { ...DEFAULT_NOTCH, count: 2, gap: 4 })
    expect(marks.map((m) => round([m[0].p])[0])).toEqual([
      [40, 8],
      [40, 12],
    ])
    const [v] = notchShapes(square, [20, 20], [0, 0], { ...DEFAULT_NOTCH, style: 'v', width: 3, length: 2 })
    expect(round(v.map((s) => s.p))).toEqual([
      [21.5, 20],
      [20, 18],
      [18.5, 20],
    ])
  })

  it('follows the cursor’s side on open lines, and notches circles inward', () => {
    const line: Entity = { ...base, id: 'l', type: 'centreLine', from: [0, 0], to: [10, 0] }
    expect(notchShapes(line, [5, 0], [5, 3], DEFAULT_NOTCH)[0][1].p[1]).toBeCloseTo(4, 9)
    expect(notchShapes(line, [5, 0], [5, -3], DEFAULT_NOTCH)[0][1].p[1]).toBeCloseTo(-4, 9)
    const c: Entity = { ...base, id: 'c', type: 'circle', center: [0, 0], rx: 10, ry: 10, rotation: 0 }
    const [mark] = notchShapes(c, [10, 0], [20, 0], DEFAULT_NOTCH)
    expect(distance(mark[1].p, [0, 0])).toBeCloseTo(6, 6)
  })
})

describe('notch tool', () => {
  beforeEach(() => {
    const project = createProject()
    store = createDocumentStore(project)
    store.getState().dispatch(addEntities(project.pieces[0].id, [{ ...square, layerId: project.layers[0].id }]))
    session = new ToolSession(store, createTools(), () => view, {
      preview: () => {},
      prompt: () => {},
      tool: () => {},
      cursor: () => {},
      selection: () => {},
    })
    session.setTool('notch')
  })

  it('adds notches at the snapped point on the edge’s layer, right after it, as one undo step', () => {
    session.input({ count: 1 }, false) // double
    click([20.4, 0.3]) // snaps to the top edge's midpoint (20, 0)
    const entities = store.getState().project.pieces[0].entities
    expect(entities.map((e) => e.id)[0]).toBe('sq')
    const marks = entities.slice(1) as PathEntity[]
    expect(marks).toHaveLength(2)
    expect(marks.every((m) => m.layerId === entities[0].layerId)).toBe(true)
    expect(round(marks.map((m) => m.segments[0].p))).toEqual([
      [18.5, 0],
      [21.5, 0],
    ])
    expect(store.getState().past.at(-1)?.labelKey).toBe('history.addNotch')
  })
})
