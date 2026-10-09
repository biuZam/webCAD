import { beforeEach, describe, expect, it } from 'vitest'
import { addEntities } from '../document/commands'
import { createProject } from '../document/factory'
import type { CentreLineEntity, CircleEntity, Entity, PathEntity } from '../document/model'
import { createDocumentStore, type DocumentStore } from '../document/store'
import { rectangleSegments } from '../geometry/shapes'
import { distance, type Vec2 } from '../lib/vec2'
import { createTools } from './index'
import { angleBetween } from './measure'
import { ToolSession, type SessionView } from './session'
import type { InputField } from './types'

let store: DocumentStore
let session: ToolSession
let fields: InputField[]
const ev = (raw: Vec2) => ({ raw, button: 0, shift: false, alt: false })
function click(p: Vec2) {
  session.pointerMove(ev(p))
  session.pointerDown(ev(p))
  session.pointerUp(ev(p))
}
const entities = () => store.getState().project.pieces[0].entities
const last = <T extends Entity>() => entities().at(-1) as T
const readout = (key: string) => fields.find((f) => f.key === key)?.live

beforeEach(() => {
  const project = createProject()
  store = createDocumentStore(project)
  store.getState().dispatch(
    addEntities(project.pieces[0].id, [
      {
        id: 'r',
        type: 'path',
        layerId: project.layers[0].id,
        lineStyle: 'solid',
        strokeWidth: 0.2,
        closed: true,
        segments: rectangleSegments([0, 0], [100, 60]),
      },
    ]),
  )
  const view: SessionView = { zoom: 10, snaps: new Set(), activeLayerId: null }
  session = new ToolSession(store, createTools(), () => view, {
    preview: () => {},
    prompt: (_k, f) => (fields = f),
    tool: () => {},
    cursor: () => {},
    selection: () => {},
  })
})

describe('circle modes', () => {
  beforeEach(() => session.setTool('circle'))

  it('3 points', () => {
    session.input({ mode: 1 }, false)
    click([10, 0])
    click([0, 10])
    click([-10, 0])
    const c = last<CircleEntity>()
    expect(c.center[0]).toBeCloseTo(0)
    expect(c.center[1]).toBeCloseTo(0)
    expect(c.rx).toBeCloseTo(10)
  })

  it('ellipse by axes: first axis sets rx and direction, the third click sets ry', () => {
    session.input({ mode: 2 }, false)
    click([0, 0])
    click([0, 20]) // first axis straight down (90° clockwise in y-down)
    click([5, 10]) // 5 mm from that axis
    const e = last<CircleEntity>()
    expect([e.rx, e.ry, e.rotation]).toEqual([20, 5, 90])
  })
})

describe('centre line tool', () => {
  beforeEach(() => session.setTool('centreLine'))

  it('adds a dash-dot axis through a shape’s centre, on the Reference layer', () => {
    click([100.2, 30])
    const l = last<CentreLineEntity>()
    expect(l.type).toBe('centreLine')
    expect(l.lineStyle).toBe('dashDot')
    expect(l.from).toEqual([50, -5])
    expect(l.to).toEqual([50, 65])
    expect(l.layerId).toBe(store.getState().project.layers.find((x) => x.kind === 'reference')!.id)
  })

  it('horizontal, or between two points', () => {
    session.input({ orientation: 1 }, false)
    click([100.2, 30])
    expect(last<CentreLineEntity>().from).toEqual([-5, 30])
    session.input({ mode: 1 }, false)
    click([0, 100])
    click([40, 100])
    expect(last<CentreLineEntity>().to).toEqual([40, 100])
  })
})

describe('perpendicular tool', () => {
  beforeEach(() => session.setTool('perpendicular'))

  it('draws from the cursor’s foot on the picked edge, at right angles', () => {
    click([50, 0.2]) // pick the top edge (0,0)→(100,0)
    click([30, -15])
    const l = last<PathEntity>()
    expect(l.segments.map((s) => s.p)).toEqual([
      [30, 0],
      [30, -15],
    ])
  })

  it('places it by typed distance along the edge and length', () => {
    click([50, 0.2])
    session.pointerMove(ev([10, 10])) // inside: decides the side
    session.input({ along: 25, length: 8 }, true)
    expect(last<PathEntity>().segments.map((s) => s.p)).toEqual([
      [25, 0],
      [25, 8],
    ])
  })
})

describe('measure tool', () => {
  beforeEach(() => session.setTool('measure'))

  it('measures distance, ΔX, ΔY and direction without adding anything', () => {
    const before = entities().length
    click([0, 0])
    click([30, -40])
    expect(readout('d')).toBeCloseTo(50)
    expect([readout('dx'), readout('dy')]).toEqual([30, -40])
    expect(readout('dir')).toBeCloseTo((Math.atan2(40, 30) * 180) / Math.PI)
    expect(fields.find((f) => f.key === 'd')?.readOnly).toBe(true)
    expect(entities()).toHaveLength(before)
  })

  it('measures an angle and a shape’s length', () => {
    session.input({ mode: 1 }, false)
    click([10, 0])
    click([0, 0])
    click([0, 10])
    expect(readout('angle')).toBeCloseTo(90)
    session.input({ mode: 2 }, false)
    session.pointerMove(ev([100.2, 30]))
    expect(readout('length')).toBeCloseTo(320)
  })

  it('angleBetween is in [0, 180]', () => {
    expect(angleBetween([1, 0], [0, 0], [-1, 0.0001])).toBeCloseTo(180, 1)
    expect(distance([0, 0], [3, 4])).toBe(5)
  })
})
