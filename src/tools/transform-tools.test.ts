import { beforeEach, describe, expect, it } from 'vitest'
import { addEntities } from '../document/commands'
import { createProject } from '../document/factory'
import type { CentreLineEntity, Entity, Id, PathEntity } from '../document/model'
import { createDocumentStore, type DocumentStore } from '../document/store'
import { rectangleSegments } from '../geometry/shapes'
import type { Vec2 } from '../lib/vec2'
import { createTools } from './index'
import { ToolSession, type SessionView } from './session'
import type { I18nKey, InputField } from './types'

let store: DocumentStore
let session: ToolSession
let selection: readonly Id[]
let prompt: { key: I18nKey; fields: InputField[] }

const ev = (raw: Vec2, shift = false) => ({ raw, button: 0, shift, alt: false })
function click(p: Vec2, shift = false) {
  session.pointerMove(ev(p, shift))
  session.pointerDown(ev(p, shift))
  session.pointerUp(ev(p, shift))
}
const entities = () => store.getState().project.pieces[0].entities
const byId = (id: Id) => entities().find((e) => e.id === id)!
const points = (id: Id) => (byId(id) as PathEntity).segments.map((s) => s.p.map((v) => Math.round(v * 1e6) / 1e6))

beforeEach(() => {
  const project = createProject()
  const layerId = project.layers[0].id
  const base = { layerId, lineStyle: 'solid', strokeWidth: 0.2 } as const
  const list: Entity[] = [
    { ...base, id: 'sq', type: 'path', segments: rectangleSegments([0, 0], [10, 10]), closed: true },
    {
      ...base,
      id: 'axis',
      type: 'centreLine',
      lineStyle: 'dashDot',
      from: [50, -20],
      to: [50, 40],
    } as CentreLineEntity,
  ]
  store = createDocumentStore(project)
  store.getState().dispatch(addEntities(project.pieces[0].id, list))
  const view: SessionView = { zoom: 10, snaps: new Set(), activeLayerId: null }
  selection = []
  session = new ToolSession(store, createTools(), () => view, {
    preview: () => {},
    prompt: (key, fields) => (prompt = { key, fields }),
    tool: () => {},
    cursor: () => {},
    selection: (ids) => (selection = ids),
  })
  session.setTool('select')
  click([10.2, 5]) // select the square
})

describe('move', () => {
  beforeEach(() => session.setTool('move'))

  it('moves by base point and destination click, as one undo step', () => {
    click([0, 0])
    click([20, 5])
    expect(points('sq')[0]).toEqual([20, 5])
    expect(entities()).toHaveLength(2)
    store.getState().undo()
    expect(points('sq')[0]).toEqual([0, 0])
  })

  it('moves by typed ΔX/ΔY', () => {
    click([0, 0])
    session.input({ dx: 100, dy: -5 }, true)
    expect(points('sq')[2]).toEqual([110, 5])
  })

  it('copy keeps the original and selects the copy; the option is sticky', () => {
    session.input({ copy: 1 }, false)
    click([0, 0])
    click([30, 0])
    expect(entities()).toHaveLength(3)
    expect(selection).not.toContain('sq')
    expect(points(selection[0])[0]).toEqual([30, 0])
    expect(prompt.fields.find((f) => f.key === 'copy')?.live).toBe(1)
  })

  it('asks to pick objects first when nothing is selected, then continues on Enter', () => {
    session.setTool('select')
    session.cancel() // clear selection
    session.setTool('move')
    expect(prompt.key).toBe('transform.promptPick')
    click([10.2, 5])
    session.finish()
    expect(prompt.key).toBe('move.promptBase')
  })

  it('Esc steps back to the base point, then leaves the tool', () => {
    click([0, 0])
    session.cancel()
    expect(prompt.key).toBe('move.promptBase')
    session.cancel()
    expect(session.activeToolId).toBe('select')
  })
})

describe('rotate', () => {
  it('rotates 90° screen-CCW about a centre with a typed angle', () => {
    session.setTool('rotate')
    click([0, 0])
    session.input({ angle: 90 }, true)
    // (10, 0) → (0, −10) on a y-down model.
    expect(points('sq')[1]).toEqual([0, -10])
  })
})

describe('scale', () => {
  beforeEach(() => session.setTool('scale'))

  it('scales by a typed factor about the base point', () => {
    click([0, 0])
    session.input({ factor: 2.5 }, true)
    expect(points('sq')[2]).toEqual([25, 25])
  })

  it('scales by reference and target points', () => {
    click([0, 0])
    click([10, 0]) // reference length 10
    click([40, 0]) // new length 40 → ×4
    expect(points('sq')[2]).toEqual([40, 40])
  })

  it('ignores a zero or negative factor', () => {
    click([0, 0])
    session.input({ factor: 0 }, true)
    expect(points('sq')[2]).toEqual([10, 10])
  })
})

describe('mirror', () => {
  beforeEach(() => session.setTool('mirror'))

  it('mirrors across a hovered centre line in one click, keeping the original by default', () => {
    click([50.2, 10])
    expect(entities()).toHaveLength(3)
    expect(points(selection[0])).toEqual([
      [100, 0],
      [90, 0],
      [90, 10],
      [100, 10],
    ])
  })

  it('mirrors across two clicked points', () => {
    session.input({ copy: 0 }, false)
    click([0, 20])
    click([10, 20]) // horizontal axis y = 20
    expect(points('sq')[2]).toEqual([10, 30])
  })
})

describe('flip', () => {
  it('flips the selection in place about its bounds centre', () => {
    store.getState().dispatch(
      addEntities(store.getState().project.pieces[0].id, [
        {
          id: 'tri',
          type: 'path',
          layerId: store.getState().project.layers[0].id,
          lineStyle: 'solid',
          strokeWidth: 0.2,
          closed: true,
          segments: [{ p: [20, 0] }, { p: [30, 0] }, { p: [20, 4] }],
        },
      ]),
    )
    session.setTool('select')
    session.cancel()
    click([25, 0.2])
    expect(selection).toEqual(['tri'])
    session.flip('horizontal')
    expect(points('tri')).toEqual([
      [30, 0],
      [20, 0],
      [30, 4],
    ])
    session.flip('vertical')
    expect(points('tri')[0]).toEqual([30, 4])
  })
})
