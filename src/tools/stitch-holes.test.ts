import { beforeEach, describe, expect, it } from 'vitest'
import { addEntities, transformEntities, updateEntity, updateLayer } from '../document/commands'
import { createProject } from '../document/factory'
import type { Entity, HoleSetEntity, Id, PathEntity } from '../document/model'
import { createDocumentStore, type DocumentStore } from '../document/store'
import { rectangleSegments } from '../geometry/shapes'
import { translation } from '../geometry/transform'
import type { Vec2 } from '../lib/vec2'
import { createTools } from './index'
import { ToolSession, type SessionView } from './session'
import type { I18nKey, PreviewShape } from './types'

let store: DocumentStore
let session: ToolSession
let selection: readonly Id[]
let preview: PreviewShape[]
let promptKey: I18nKey

const ev = (raw: Vec2) => ({ raw, button: 0, shift: false, alt: false })
function click(p: Vec2) {
  session.pointerMove(ev(p))
  session.pointerDown(ev(p))
  session.pointerUp(ev(p))
}
const entities = () => store.getState().project.pieces[0].entities
const holeSet = () => entities().find((e) => e.type === 'holeSet') as HoleSetEntity
const round = (p: Vec2) => p.map((v) => Math.round(v * 1000) / 1000)

beforeEach(() => {
  const project = createProject()
  const [cut, stitch] = project.layers
  store = createDocumentStore(project)
  const outline: Entity = {
    id: 'outline',
    type: 'path',
    layerId: cut.id,
    lineStyle: 'solid',
    strokeWidth: 0.2,
    closed: true,
    segments: rectangleSegments([0, 0], [100, 60]),
  }
  const stitchLine: PathEntity = {
    id: 'stitch',
    type: 'path',
    layerId: stitch.id,
    lineStyle: 'dashed',
    strokeWidth: 0.2,
    closed: true,
    segments: [],
    derived: { kind: 'offset', sourceId: 'outline', margin: -4, join: 'miter' },
  }
  store.getState().dispatch(addEntities(project.pieces[0].id, [outline, stitchLine]))
  const view: SessionView = { zoom: 10, snaps: new Set(), activeLayerId: null }
  session = new ToolSession(store, createTools(), () => view, {
    preview: (s) => (preview = s),
    prompt: (key) => (promptKey = key),
    tool: () => {},
    cursor: () => {},
    selection: (ids) => (selection = ids),
  })
  session.setTool('stitchHoles')
})

describe('stitch holes tool', () => {
  it('previews the holes of the hovered line, then adds a linked set on the Stitch layer', () => {
    session.pointerMove(ev([96.2, 30])) // the stitch line's right edge (x = 96)
    expect(promptKey).toBe('stitchHoles.promptClick')
    // 92 × 52 inset at 3.85 corner-aware: 24 + 14 + 24 + 14 = 76 holes.
    expect(preview.filter((s) => s.kind === 'circle')).toHaveLength(76)
    click([96.2, 30])
    const set = holeSet()
    expect(set.sourceEntityId).toBe('stitch')
    expect(set.holes).toHaveLength(76)
    expect(set.holes.map(round)).toContainEqual([4, 4])
    expect(set.layerId).toBe(store.getState().project.layers.find((l) => l.kind === 'stitch')!.id)
    expect(selection).toEqual([set.id])
  })

  it('takes the chisel preset, shape and corner mode from the input bar', () => {
    session.input({ preset: 0 }, false) // 2.7 mm
    session.input({ shape: 1 }, false) // slit
    session.pointerMove(ev([96.2, 30]))
    // Slits preview as short lines (the session also appends its cursor marker, a 'point').
    expect(preview.some((s) => s.kind === 'circle')).toBe(false)
    expect(preview.filter((s) => s.kind === 'path').length).toBeGreaterThan(50)
    click([96.2, 30])
    expect(holeSet()).toMatchObject({ pitch: 2.7, holeShape: 'slit', cornerMode: 'cornerAware' })
  })

  it('refuses when the Stitch layer is locked', () => {
    const stitchLayer = store.getState().project.layers.find((l) => l.kind === 'stitch')!
    store.getState().dispatch(updateLayer(stitchLayer.id, { locked: true }))
    // The stitch line itself is now unselectable, so hover the outline instead.
    click([100.2, 30])
    expect(holeSet()).toBeUndefined()
    expect(promptKey).toBe('common.layerUnavailable')
  })
})

describe('linked hole sets', () => {
  beforeEach(() => click([96.2, 30]))

  it('follow the outline → stitch line → holes chain in one undo step', () => {
    store
      .getState()
      .dispatch(transformEntities(['outline'], translation(10, 0), { copy: false, labelKey: 'history.move' }).command)
    expect(holeSet().holes.map(round)).toContainEqual([14, 4])
    store.getState().undo()
    expect(holeSet().holes.map(round)).toContainEqual([4, 4])
  })

  it('re-lay when their pitch changes', () => {
    store.getState().dispatch(updateEntity<HoleSetEntity>(holeSet().id, { pitch: 4 }))
    // 92 / 4 = 23, 52 / 4 = 13: 2 × (23 + 13) = 72.
    expect(holeSet().holes).toHaveLength(72)
  })

  it('detach when moved on their own, and stay put afterwards', () => {
    const id = holeSet().id
    store
      .getState()
      .dispatch(transformEntities([id], translation(0, 50), { copy: false, labelKey: 'history.move' }).command)
    expect(holeSet().sourceEntityId).toBeNull()
    expect(holeSet().holes.map(round)).toContainEqual([4, 54])
    store
      .getState()
      .dispatch(transformEntities(['outline'], translation(10, 0), { copy: false, labelKey: 'history.move' }).command)
    expect(holeSet().holes.map(round)).toContainEqual([4, 54])
  })
})
