import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createProject } from '../document/factory'
import { removeEntities } from '../document/commands'
import type { CircleEntity, PathEntity } from '../document/model'
import { createDocumentStore, type DocumentStore } from '../document/store'
import { constraintResidual, isSatisfied } from '../geometry/constraints'
import type { Vec2 } from '../lib/vec2'
import { createTools } from './index'
import { ToolSession, type SessionView } from './session'
import type { I18nKey } from './types'

let store: DocumentStore
let session: ToolSession
let promptKey: I18nKey

const piece = () => store.getState().project.pieces[0]
const at = (raw: Vec2) => ({ raw, button: 0, shift: false, alt: false })
const click = (raw: Vec2) => {
  session.pointerMove(at(raw))
  session.pointerDown(at(raw))
  session.pointerUp(at(raw))
}
const base = () => ({ layerId: store.getState().project.layers[0].id, lineStyle: 'solid', strokeWidth: 0.2 }) as const
const line = (id: string, a: Vec2, b: Vec2): PathEntity => ({
  ...base(),
  id,
  type: 'path',
  closed: false,
  segments: [{ p: a }, { p: b }],
})

beforeEach(() => {
  store = createDocumentStore(createProject())
  const view: SessionView = { zoom: 4, snaps: new Set(), activeLayerId: null }
  session = new ToolSession(store, createTools(), () => view, {
    preview: () => {},
    prompt: (key) => (promptKey = key),
    tool: () => {},
    cursor: () => {},
    selection: () => {},
  })
  store.getState().load({
    ...store.getState().project,
    pieces: [{ ...piece(), entities: [line('a', [0, 0], [100, 0]), line('b', [0, 40], [90, 70])] }],
  })
  session.setTool('constrain')
})

describe('constrain tool', () => {
  it('makes the second edge parallel to the first, as one undo step', async () => {
    click([50, 0])
    click([45, 55])
    await vi.waitFor(() => expect(piece().constraints).toHaveLength(1))
    const c = piece().constraints![0]
    expect(isSatisfied(constraintResidual(piece(), c))).toBe(true)
    expect(piece().entities[0]).toEqual(line('a', [0, 0], [100, 0]))
    expect(store.getState().past).toHaveLength(1)
    store.getState().undo()
    expect(piece().constraints).toBeUndefined()
    expect(piece().entities[1]).toEqual(line('b', [0, 40], [90, 70]))
  })

  it('sets a distance dimension from a typed value', async () => {
    session.input({ mode: 4 }, false)
    click([0, 0])
    click([100, 0])
    expect(promptKey).toBe('constrain.promptDistance')
    session.input({ value: 60 }, true)
    await vi.waitFor(() => expect(piece().constraints).toHaveLength(1))
    expect(piece().constraints![0]).toMatchObject({ type: 'distance', value: 60 })
    const a = piece().entities[0] as PathEntity
    expect(Math.hypot(a.segments[1].p[0] - a.segments[0].p[0], a.segments[1].p[1] - a.segments[0].p[1])).toBeCloseTo(
      60,
      6,
    )
  })

  it('sets a circle radius and drops constraints when their entity is deleted', async () => {
    const circle: CircleEntity = { ...base(), id: 'c', type: 'circle', center: [200, 200], rx: 10, ry: 10, rotation: 0 }
    store
      .getState()
      .load({ ...store.getState().project, pieces: [{ ...piece(), entities: [...piece().entities, circle] }] })
    session.input({ mode: 5 }, false)
    click([210, 200])
    session.input({ value: 25 }, true)
    await vi.waitFor(() => expect(piece().constraints).toHaveLength(1))
    expect((piece().entities[2] as CircleEntity).rx).toBeCloseTo(25, 6)
    store.getState().dispatch(removeEntities(['c']))
    expect(piece().constraints).toBeUndefined()
  })
})
