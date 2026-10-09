import { beforeEach, describe, expect, it } from 'vitest'
import { addEntities } from '../document/commands'
import { createProject } from '../document/factory'
import type { PathEntity } from '../document/model'
import { createDocumentStore, type DocumentStore } from '../document/store'
import { pathLength } from '../geometry/kernel'
import { rectangleSegments } from '../geometry/shapes'
import type { Vec2 } from '../lib/vec2'
import { createTools } from './index'
import { ToolSession, type SessionView } from './session'
import type { I18nKey, PromptParams } from './types'

let store: DocumentStore
let session: ToolSession
let prompt: { key: I18nKey; params?: PromptParams }

const ev = (raw: Vec2, shift = false) => ({ raw, button: 0, shift, alt: false })
function click(p: Vec2, shift = false) {
  session.pointerMove(ev(p, shift))
  session.pointerDown(ev(p, shift))
}
const get = (id: string) => store.getState().project.pieces[0].entities.find((e) => e.id === id) as PathEntity

beforeEach(() => {
  const project = createProject()
  const [cut, stitch] = project.layers
  store = createDocumentStore(project)
  store.getState().dispatch(
    addEntities(project.pieces[0].id, [
      {
        id: 'r',
        type: 'path',
        layerId: cut.id,
        lineStyle: 'solid',
        strokeWidth: 0.2,
        closed: true,
        segments: rectangleSegments([0, 0], [100, 60]),
      },
      {
        id: 's',
        type: 'path',
        layerId: stitch.id,
        lineStyle: 'dashed',
        strokeWidth: 0.2,
        closed: true,
        segments: [],
        derived: { kind: 'offset', sourceId: 'r', margin: -3.5, join: 'miter' },
      },
    ]),
  )
  const view: SessionView = { zoom: 10, snaps: new Set(), activeLayerId: null }
  session = new ToolSession(store, createTools(), () => view, {
    preview: () => {},
    prompt: (key, _fields, params) => (prompt = { key, params }),
    tool: () => {},
    cursor: () => {},
    selection: () => {},
  })
})

describe('fillet tool', () => {
  beforeEach(() => session.setTool('fillet'))

  it('rounds the clicked corner as one undo step, and the linked stitch line follows', () => {
    session.input({ radius: 10 }, true)
    click([0.5, 0.5])
    expect(get('r').segments).toHaveLength(5)
    expect(pathLength(get('r'))).toBeCloseTo(320 - 20 + 5 * Math.PI, 2)
    // The stitch line (miter join) now also has a curved corner.
    expect(get('s').segments.some((s) => s.hi || s.ho)).toBe(true)
    expect(store.getState().past.at(-1)?.labelKey).toBe('history.fillet')
  })

  it('Shift rounds every corner', () => {
    session.input({ radius: 5 }, true)
    click([100.4, 59.6], true)
    expect(get('r').segments).toHaveLength(8)
  })

  it('explains, with the largest radius that fits, when it’s too large', () => {
    session.input({ radius: 80 }, true)
    click([0.5, 0.5])
    expect(get('r').segments).toHaveLength(4)
    expect(prompt.key).toBe('fillet.tooLarge')
    expect(prompt.params).toEqual({ max: '60.00' })
  })

  it('ignores the corners of linked stitch lines', () => {
    click([3.6, 3.6]) // a stitch-line corner (3.5, 3.5), far from the outline's (0, 0) at 10 px/mm
    expect(get('s').derived).toBeDefined()
    expect(get('r').segments).toHaveLength(4)
  })
})

describe('chamfer tool', () => {
  beforeEach(() => session.setTool('chamfer'))

  it('cuts by two distances', () => {
    session.input({ d1: 5, d2: 10 }, false)
    click([0.5, 0.5])
    const pts = get('r').segments.map((s) => s.p.map((v) => Math.round(v * 1000) / 1000))
    expect(pts.slice(0, 2)).toEqual([
      [0, 5],
      [10, 0],
    ])
  })

  it('cuts by a distance and an angle', () => {
    session.input({ d1: 6, angle: 45 }, false)
    click([0.5, 0.5])
    const [a, b] = get('r').segments
    expect(b.p[0]).toBeCloseTo(6) // 45° on a right angle: both cuts equal
    expect(a.p[1]).toBeCloseTo(6)
  })
})
