import { beforeEach, describe, expect, it } from 'vitest'
import { addEntities } from '../document/commands'
import { createProject } from '../document/factory'
import type { Entity, HoleSetEntity, PathEntity } from '../document/model'
import { createDocumentStore, type DocumentStore } from '../document/store'
import { rectangleSegments } from '../geometry/shapes'
import type { Vec2 } from '../lib/vec2'
import { createTools } from './index'
import { ToolSession, type SessionView } from './session'
import type { I18nKey, InputField, PreviewShape, PromptParams } from './types'

let store: DocumentStore
let session: ToolSession
let preview: PreviewShape[]
let prompt: { key: I18nKey; fields: InputField[]; params?: PromptParams }
const view: SessionView = { zoom: 10, snaps: new Set(), activeLayerId: null }
const ev = (raw: Vec2) => ({ raw, button: 0, shift: false, alt: false })
function click(p: Vec2) {
  session.pointerMove(ev(p))
  session.pointerDown(ev(p))
  session.pointerUp(ev(p))
}
const live = (key: string) => prompt.fields.find((f) => f.key === key)?.live

beforeEach(() => {
  const project = createProject()
  const [cut, stitch] = project.layers
  const outline = (id: string, a: Vec2, b: Vec2): PathEntity => ({
    id,
    type: 'path',
    layerId: cut.id,
    lineStyle: 'solid',
    strokeWidth: 0.2,
    segments: rectangleSegments(a, b),
    closed: true,
  })
  const holes = (id: string, sourceEntityId: string, pitch: number): HoleSetEntity => ({
    id,
    type: 'holeSet',
    layerId: stitch.id,
    lineStyle: 'solid',
    strokeWidth: 0.2,
    sourceEntityId,
    margin: 0,
    pitch,
    holeShape: 'round',
    holeSize: 1,
    slitAngle: 45,
    cornerMode: 'cornerAware',
    holes: [],
  })
  // Two 100 × 60 panels with holes on the outline itself: one at 4 mm pitch, one at 3.6 mm.
  const list: Entity[] = [
    outline('p1', [0, 0], [100, 60]),
    holes('h1', 'p1', 4),
    outline('p2', [0, 100], [100, 160]),
    holes('h2', 'p2', 3.6),
  ]
  store = createDocumentStore(project)
  store.getState().dispatch(addEntities(project.pieces[0].id, list))
  session = new ToolSession(store, createTools(), () => view, {
    preview: (s) => (preview = s),
    prompt: (key, fields, params) => (prompt = { key, fields, params }),
    tool: () => {},
    cursor: () => {},
    selection: () => {},
  })
  session.setTool('measure')
  session.input({ mode: 3 }, false)
})

describe('measure: hole count per edge (L4)', () => {
  it('hovering an edge highlights its holes and shows the count, corners included', () => {
    expect(prompt.key).toBe('measure.promptHolesFirst')
    session.pointerMove(ev([50, 0.2]))
    expect(live('first')).toBe(26) // 100 / 4 = 25 gaps → 26 holes
    expect(preview.filter((s) => s.kind === 'circle')).toHaveLength(26)
  })

  it('compares two edges and reports a match or a mismatch', () => {
    click([50, 0.2])
    expect(prompt.key).toBe('measure.promptHolesSecond')
    click([50, 60.2]) // the opposite side of the same panel
    expect(prompt.key).toBe('measure.holesMatch')
    expect(prompt.params).toEqual({ count: 26 })

    click([50, 0.2])
    click([50, 100.2]) // panel 2 at 3.6 mm: round(100 / 3.6) = 28 gaps → 29 holes
    expect(prompt.key).toBe('measure.holesDiffer')
    expect(prompt.params).toEqual({ a: 26, b: 29, diff: 3 })
    expect([live('first'), live('second')]).toEqual([26, 29])
  })

  it('Esc clears the picked edges', () => {
    click([50, 0.2])
    session.cancel()
    expect(prompt.key).toBe('measure.promptHolesFirst')
  })
})
