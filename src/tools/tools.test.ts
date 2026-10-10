import { beforeEach, describe, expect, it } from 'vitest'
import { createProject } from '../document/factory'
import type { CircleEntity, PathEntity } from '../document/model'
import { createDocumentStore, type DocumentStore } from '../document/store'
import { entityBounds } from '../geometry/bounds'
import type { Vec2 } from '../lib/vec2'
import { createTools } from './index'
import { ToolSession, type SessionView } from './session'
import type { I18nKey, InputField, PreviewShape } from './types'

let store: DocumentStore
let session: ToolSession
let view: SessionView
let prompt: { key: I18nKey; fields: InputField[] }
let preview: PreviewShape[]

const entities = () => store.getState().project.pieces[0].entities
const at = (raw: Vec2, mods: { shift?: boolean; alt?: boolean; button?: number } = {}) => ({
  raw,
  button: mods.button ?? 0,
  shift: mods.shift ?? false,
  alt: mods.alt ?? false,
})
const click = (raw: Vec2, mods = {}) => {
  session.pointerMove(at(raw, mods))
  session.pointerDown(at(raw, mods))
  session.pointerUp(at(raw, mods))
}

beforeEach(() => {
  store = createDocumentStore(createProject())
  view = { zoom: 4, snaps: new Set(), activeLayerId: null }
  session = new ToolSession(store, createTools(), () => view, {
    preview: (s) => (preview = s),
    prompt: (key, fields) => (prompt = { key, fields }),
    tool: () => {},
    cursor: () => {},
    selection: () => {},
  })
})

describe('line tool', () => {
  beforeEach(() => session.setTool('line'))

  it('draws an open polyline as one undo step, finished with Enter', () => {
    click([0, 0])
    click([10, 0])
    click([10, 5])
    expect(entities()).toHaveLength(0)
    session.finish()
    const e = entities()[0] as PathEntity
    expect(e.segments.map((s) => s.p)).toEqual([
      [0, 0],
      [10, 0],
      [10, 5],
    ])
    expect(e.closed).toBe(false)
    expect(store.getState().past).toHaveLength(1)
  })

  it('closes when clicking near the first point', () => {
    click([0, 0])
    click([10, 0])
    click([10, 10])
    click([0.5, 0.5]) // within 8 px at 4 px/mm
    const e = entities()[0] as PathEntity
    expect(e.closed).toBe(true)
    expect(e.segments).toHaveLength(3)
  })

  it('finishes on a double-click without adding a duplicate point', () => {
    click([0, 0])
    click([10, 0])
    click([20, 5])
    click([20, 5])
    const e = entities()[0] as PathEntity
    expect(e.segments).toHaveLength(3)
    expect(e.closed).toBe(false)
  })

  it('places a point from typed length and angle (counter-clockwise, y-down model)', () => {
    session.input({ x: 5, y: 5 }, true)
    session.input({ length: 10, angle: 90 }, true)
    session.finish()
    const [a, b] = (entities()[0] as PathEntity).segments.map((s) => s.p)
    expect(a).toEqual([5, 5])
    expect(b[0]).toBeCloseTo(5)
    expect(b[1]).toBeCloseTo(-5)
  })

  it('takes the angle from the mouse when only length is typed', () => {
    click([0, 0])
    session.pointerMove(at([3, 0]))
    session.input({ length: 25 }, true)
    session.finish()
    expect((entities()[0] as PathEntity).segments[1].p).toEqual([25, 0])
  })

  it('Shift locks the direction to 15° steps', () => {
    click([0, 0])
    click([10, 1], { shift: true })
    session.finish()
    const p = (entities()[0] as PathEntity).segments[1].p
    expect(p[1]).toBeCloseTo(0)
    expect(p[0]).toBeCloseTo(Math.hypot(10, 1))
  })

  it('Esc keeps a polyline in progress, a second Esc returns to Select', () => {
    click([0, 0])
    click([10, 0])
    session.cancel()
    expect(entities()).toHaveLength(1)
    expect(session.activeToolId).toBe('line')
    session.cancel()
    expect(session.activeToolId).toBe('select')
  })

  it('shows live length and angle while rubber-banding', () => {
    click([0, 0])
    session.pointerMove(at([0, -20]))
    expect(prompt.fields.find((f) => f.key === 'length')?.live).toBeCloseTo(20)
    expect(prompt.fields.find((f) => f.key === 'angle')?.live).toBeCloseTo(90)
    expect(preview.some((s) => s.kind === 'path')).toBe(true)
  })

  it('snaps to the grid when enabled', () => {
    view.snaps = new Set(['grid']) // at 4 px/mm the minor grid is 10 mm
    click([3, 4])
    click([18, 2])
    session.finish()
    expect((entities()[0] as PathEntity).segments.map((s) => s.p)).toEqual([
      [0, 0],
      [20, 0],
    ])
  })

  it('draws on the stitch layer with a dashed style', () => {
    view.activeLayerId = store.getState().project.layers.find((l) => l.kind === 'stitch')!.id
    click([0, 0])
    click([10, 0])
    session.finish()
    expect(entities()[0].lineStyle).toBe('dashed')
  })

  it('does not draw on a locked layer', () => {
    const layer = store.getState().project.layers[0]
    store.setState((s) => ({
      project: { ...s.project, layers: [{ ...layer, locked: true }, ...s.project.layers.slice(1)] },
    }))
    view.activeLayerId = layer.id
    click([0, 0])
    expect(prompt.key).toBe('common.layerUnavailable')
    click([10, 0])
    session.finish()
    expect(entities()).toHaveLength(0)
  })
})

describe('rectangle tool', () => {
  beforeEach(() => session.setTool('rectangle'))

  it('draws corner to corner', () => {
    click([10, 10])
    click([40, 30])
    const e = entities()[0] as PathEntity
    expect(e.closed).toBe(true)
    expect(e.segments.map((s) => s.p)).toEqual([
      [10, 10],
      [40, 10],
      [40, 30],
      [10, 30],
    ])
  })

  it('applies typed width/height in the quadrant of the mouse', () => {
    click([0, 0])
    session.pointerMove(at([-1, -1]))
    session.input({ width: 100, height: 50 }, true)
    const ps = (entities()[0] as PathEntity).segments.map((s) => s.p)
    expect(ps[0]).toEqual([-100, -50])
    expect(ps[2]).toEqual([0, 0])
  })

  it('draws from the centre with Alt, typed size is the full size', () => {
    click([0, 0], { alt: true })
    session.pointerMove(at([1, 1], { alt: true }))
    session.input({ width: 20, height: 10 }, true)
    const ps = (entities()[0] as PathEntity).segments.map((s) => s.p)
    expect(ps[0]).toEqual([-10, -5])
    expect(ps[2]).toEqual([10, 5])
  })

  it('keeps a typed corner radius for the next rectangle', () => {
    click([0, 0])
    session.pointerMove(at([20, 20]))
    session.input({ radius: 3 }, true)
    click([0, 0])
    click([20, 20])
    for (const e of entities()) expect((e as PathEntity).segments).toHaveLength(8)
  })

  it('ignores zero-area rectangles', () => {
    click([0, 0])
    click([0, 10])
    expect(entities()).toHaveLength(0)
  })
})

describe('circle tool', () => {
  beforeEach(() => session.setTool('circle'))

  it('draws from centre and a point on the circle', () => {
    click([5, 5])
    click([5, 15])
    const e = entities()[0] as CircleEntity
    expect(e.center).toEqual([5, 5])
    expect(e.rx).toBe(10)
    expect(e.ry).toBe(10)
  })

  it('takes a typed centre and radius', () => {
    session.input({ x: 50, y: 50 }, true)
    session.input({ radius: 25 }, true)
    const e = entities()[0] as CircleEntity
    expect(e.center).toEqual([50, 50])
    expect(e.rx).toBe(25)
  })
})

describe('rectangle: square mode', () => {
  it('keeps the sides equal: the larger mouse distance, or the typed side', () => {
    const store = createDocumentStore(createProject())
    const session = new ToolSession(store, createTools(), () => ({ zoom: 10, snaps: new Set(), activeLayerId: null }), {
      preview: () => {},
      prompt: () => {},
      tool: () => {},
      cursor: () => {},
      selection: () => {},
    })
    const at = (raw: [number, number]) => ({ raw, button: 0, shift: false, alt: false })
    const press = (p: [number, number]) => {
      session.pointerMove(at(p))
      session.pointerDown(at(p))
      session.pointerUp(at(p))
    }
    session.setTool('rectangle')
    session.input({ shape: 1 }, false)
    press([0, 0])
    press([30, -10])
    press([100, 100])
    session.input({ width: 25 }, true)
    const boxes = store
      .getState()
      .project.pieces[0].entities.map((e) => entityBounds(e))
      .map((b) => [b.minX, b.minY, b.maxX, b.maxY])
    expect(boxes).toEqual([
      [0, -30, 30, 0],
      [100, 100, 125, 125],
    ])
  })
})
