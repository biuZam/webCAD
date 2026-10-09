import { beforeEach, describe, expect, it } from 'vitest'
import { createProject } from '../document/factory'
import type { CircleEntity, Entity, PathEntity } from '../document/model'
import { createDocumentStore, type DocumentStore } from '../document/store'
import { entityBounds } from '../geometry/bounds'
import { closedArea } from '../geometry/edit'
import { slotSegments } from '../geometry/shapes'
import type { Vec2 } from '../lib/vec2'
import { createTools } from './index'
import { ToolSession, type SessionView } from './session'
import type { PreviewShape } from './types'

let store: DocumentStore
let session: ToolSession
let preview: PreviewShape[]
const view: SessionView = { zoom: 10, snaps: new Set(), activeLayerId: null }
const ev = (raw: Vec2) => ({ raw, button: 0, shift: false, alt: false })
function click(p: Vec2) {
  session.pointerMove(ev(p))
  session.pointerDown(ev(p))
  session.pointerUp(ev(p))
}
const all = (): Entity[] => store.getState().project.pieces[0].entities

beforeEach(() => {
  store = createDocumentStore(createProject())
  session = new ToolSession(store, createTools(), () => view, {
    preview: (s) => (preview = s),
    prompt: () => {},
    tool: () => {},
    cursor: () => {},
    selection: () => {},
  })
  session.setTool('punch')
})

describe('slot shape', () => {
  it('is a stadium of the given length and width, at any angle', () => {
    const slot = { type: 'path', segments: slotSegments([0, 0], 20, 4, 0), closed: true } as PathEntity
    const b = entityBounds(slot)
    expect([b.minX, b.maxX, b.minY, b.maxY].map((v) => Math.round(v * 1e6) / 1e6)).toEqual([-10, 10, -2, 2])
    // 16 × 4 rectangle plus a 4 mm circle (Bézier circle: within 0.05 %).
    expect(closedArea(slot)).toBeCloseTo(64 + Math.PI * 4, 1)
    const upright = entityBounds({ ...slot, segments: slotSegments([0, 0], 20, 4, 90) })
    expect(upright.maxY - upright.minY).toBeCloseTo(20, 9)
  })

  it('degenerates to a circle (4 anchors) when no longer than it is wide', () => {
    expect(slotSegments([0, 0], 4, 4, 30)).toHaveLength(4)
  })
})

describe('punch tool', () => {
  it('places a round hole of the preset diameter on the active layer', () => {
    session.input({ preset: 5 }, false) // 4 mm
    session.pointerMove(ev([10, 10]))
    expect(preview[0]).toMatchObject({ kind: 'circle', center: [10, 10], radius: 2 })
    click([10, 10])
    expect(all()[0]).toMatchObject({ type: 'circle', center: [10, 10], rx: 2, ry: 2 })
    expect(store.getState().past.at(-1)?.labelKey).toBe('history.addPunch')
  })

  it('takes a typed diameter and a typed position', () => {
    session.input({ diameter: 2.2 }, true) // sizes only: nothing placed
    expect(all()).toHaveLength(0)
    session.input({ x: 5, y: 6 }, true)
    expect(all()[0] as CircleEntity).toMatchObject({ center: [5, 6], rx: 1.1 })
  })

  it('places slots with length, width and angle', () => {
    session.input({ kind: 1, diameter: 3, length: 25, angle: 90 }, false)
    click([0, 0])
    const slot = all()[0] as PathEntity
    expect(slot).toMatchObject({ type: 'path', closed: true })
    const b = entityBounds(slot)
    expect(b.maxY - b.minY).toBeCloseTo(25, 9)
    expect(b.maxX - b.minX).toBeCloseTo(3, 9)
  })
})
