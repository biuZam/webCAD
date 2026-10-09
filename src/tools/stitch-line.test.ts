import { beforeEach, describe, expect, it } from 'vitest'
import { addEntities, transformEntities, updateLayer } from '../document/commands'
import { createProject } from '../document/factory'
import type { Entity, Id, PathEntity } from '../document/model'
import { createDocumentStore, type DocumentStore } from '../document/store'
import { emptyBounds, entityBounds } from '../geometry/bounds'
import { rectangleSegments } from '../geometry/shapes'
import { translation } from '../geometry/transform'
import type { Vec2 } from '../lib/vec2'
import { createTools } from './index'
import { ToolSession, type SessionView } from './session'
import type { I18nKey } from './types'

let store: DocumentStore
let session: ToolSession
let selection: readonly Id[]
let promptKey: I18nKey

const ev = (raw: Vec2) => ({ raw, button: 0, shift: false, alt: false })
function click(p: Vec2) {
  session.pointerMove(ev(p))
  session.pointerDown(ev(p))
  session.pointerUp(ev(p))
}
const entities = () => store.getState().project.pieces[0].entities
const boundsOf = (e: Entity) => {
  const b = entityBounds(e, emptyBounds())
  return [b.minX, b.minY, b.maxX, b.maxY].map((v) => Math.round(v * 1000) / 1000)
}

beforeEach(() => {
  const project = createProject()
  store = createDocumentStore(project)
  store.getState().dispatch(
    addEntities(project.pieces[0].id, [
      {
        id: 'outline',
        type: 'path',
        layerId: project.layers[0].id,
        lineStyle: 'solid',
        strokeWidth: 0.2,
        closed: true,
        segments: rectangleSegments([0, 0], [100, 60]),
      },
    ]),
  )
  const view: SessionView = { zoom: 10, snaps: new Set(['grid']), activeLayerId: null }
  session = new ToolSession(store, createTools(), () => view, {
    preview: () => {},
    prompt: (key) => (promptKey = key),
    tool: () => {},
    cursor: () => {},
    selection: (ids) => (selection = ids),
  })
  session.setTool('stitchLine')
})

describe('stitch line tool', () => {
  it('adds a dashed, linked line on the Stitch layer at the project margin, inside', () => {
    click([100.2, 30]) // pick the outline
    click([50, 30]) // inside
    const line = entities()[1] as PathEntity
    const stitchLayer = store.getState().project.layers.find((l) => l.kind === 'stitch')!
    expect(line.layerId).toBe(stitchLayer.id)
    expect(line.lineStyle).toBe('dashed')
    expect(line.derived).toEqual({ kind: 'offset', sourceId: 'outline', margin: -3.5, join: 'miter' })
    expect(boundsOf(line)).toEqual([3.5, 3.5, 96.5, 56.5])
    expect(selection).toEqual([line.id])
    expect(promptKey).toBe('stitchLine.promptPick')
  })

  it('follows the outline afterwards', () => {
    click([100.2, 30])
    click([50, 30])
    store
      .getState()
      .dispatch(transformEntities(['outline'], translation(20, 0), { copy: false, labelKey: 'history.move' }).command)
    expect(boundsOf(entities()[1])).toEqual([23.5, 3.5, 116.5, 56.5])
  })

  it('refuses (with a prompt) when the Stitch layer is locked', () => {
    const stitchLayer = store.getState().project.layers.find((l) => l.kind === 'stitch')!
    store.getState().dispatch(updateLayer(stitchLayer.id, { locked: true }))
    click([100.2, 30])
    click([50, 30])
    expect(entities()).toHaveLength(1)
    expect(promptKey).toBe('common.layerUnavailable')
  })
})

describe('linked chains', () => {
  it('regenerate in dependency order within one command', () => {
    const layerId = store.getState().project.layers[1].id
    const base: Omit<PathEntity, 'id'> = {
      type: 'path',
      layerId,
      lineStyle: 'dashed',
      strokeWidth: 0.2,
      closed: true,
      segments: [],
    }
    // C follows B follows the outline. Added in the "wrong" order to exercise the sorting.
    store.getState().dispatch(
      addEntities(store.getState().project.pieces[0].id, [
        { ...base, id: 'C', derived: { kind: 'offset', sourceId: 'B', margin: -2, join: 'miter' } },
        { ...base, id: 'B', derived: { kind: 'offset', sourceId: 'outline', margin: -3, join: 'miter' } },
      ]),
    )
    const get = (id: string) => entities().find((e) => e.id === id)!
    expect(boundsOf(get('C'))).toEqual([5, 5, 95, 55])
    store
      .getState()
      .dispatch(transformEntities(['outline'], translation(0, 10), { copy: false, labelKey: 'history.move' }).command)
    expect(boundsOf(get('B'))).toEqual([3, 13, 97, 67])
    expect(boundsOf(get('C'))).toEqual([5, 15, 95, 65])
  })
})
