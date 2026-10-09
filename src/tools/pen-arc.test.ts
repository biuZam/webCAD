import { beforeEach, describe, expect, it } from 'vitest'
import { createProject } from '../document/factory'
import type { PathEntity } from '../document/model'
import { createDocumentStore, type DocumentStore } from '../document/store'
import { isSmooth } from '../geometry/nodes'
import { distance, type Vec2 } from '../lib/vec2'
import { createTools } from './index'
import { ToolSession, type SessionView } from './session'

let store: DocumentStore
let session: ToolSession
const ev = (raw: Vec2) => ({ raw, button: 0, shift: false, alt: false })
function click(p: Vec2) {
  session.pointerMove(ev(p))
  session.pointerDown(ev(p))
  session.pointerUp(ev(p))
}
function drag(from: Vec2, to: Vec2) {
  session.pointerMove(ev(from))
  session.pointerDown(ev(from))
  session.pointerMove(ev(to))
  session.pointerUp(ev(to))
}
const made = () => store.getState().project.pieces[0].entities.at(-1) as PathEntity

beforeEach(() => {
  store = createDocumentStore(createProject())
  const view: SessionView = { zoom: 10, snaps: new Set(), activeLayerId: null }
  session = new ToolSession(store, createTools(), () => view, {
    preview: () => {},
    prompt: () => {},
    tool: () => {},
    cursor: () => {},
    selection: () => {},
  })
})

describe('pen tool', () => {
  beforeEach(() => session.setTool('pen'))

  it('click = corner, drag = smooth anchor with symmetric handles', () => {
    click([0, 0])
    drag([20, 0], [25, -5])
    click([40, 0])
    session.finish()
    const s = made().segments
    expect(s).toHaveLength(3)
    expect(s[0].ho).toBeUndefined()
    expect(isSmooth(s[1])).toBe(true)
    expect(s[1].ho).toEqual([5, -5])
    expect(s[1].hi).toEqual([-5, 5])
  })

  it('closes on the first anchor, as one undo step', () => {
    click([0, 0])
    click([30, 0])
    drag([15, 20], [20, 20])
    click([0.3, 0.2])
    expect(made().closed).toBe(true)
    expect(made().segments).toHaveLength(3)
    expect(store.getState().past).toHaveLength(1)
  })

  it('a tiny press is a click, not a drag (no handles)', () => {
    click([0, 0])
    drag([20, 0], [20.1, 0]) // 1 px at 10 px/mm
    session.finish()
    expect(made().segments[1].ho).toBeUndefined()
  })

  it('Backspace removes the last anchor', () => {
    click([0, 0])
    click([10, 0])
    click([20, 0])
    session.deleteKey()
    session.finish()
    expect(made().segments).toHaveLength(2)
  })
})

describe('arc tool', () => {
  beforeEach(() => session.setTool('arc'))

  it('makes an arc from start to end through the third click', () => {
    click([-20, 0])
    click([20, 0])
    click([0, 20])
    const s = made().segments
    expect(s[0].p).toEqual([-20, 0])
    expect(s.at(-1)!.p).toEqual([20, 0])
    // Every anchor is on the circle of radius 20 round the origin.
    for (const seg of s) expect(distance(seg.p, [0, 0])).toBeCloseTo(20, 6)
  })

  it('refuses a third point on the line through the first two', () => {
    click([0, 0])
    click([10, 0])
    click([5, 0])
    expect(store.getState().project.pieces[0].entities).toHaveLength(0)
  })
})
